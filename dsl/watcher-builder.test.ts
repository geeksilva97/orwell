import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import { WatcherBuilder } from './watcher-builder.ts';
import { gt, gte, isOneOf } from './comparison-operators.ts';
import { query, rawQuery } from './query-compiler.ts';
import { MARKDOWN_TAG } from './watchjs-functions/markdown.ts';

describe('WatcherBuilder', () => {
  describe('hasState', () => {
    it('returns false for a fresh builder', (t: TestContext) => {
      const builder = new WatcherBuilder();
      t.assert.strictEqual(builder.hasState(), false);
    });

    it('returns true after setting schedule', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setSchedule({ interval: '2h' });
      t.assert.strictEqual(builder.hasState(), true);
    });
  });

  describe('compile schedule', () => {
    it('compiles interval schedule', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setSchedule({ interval: '2h' });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.trigger, {
        schedule: { interval: '2h' },
      });
    });

    it('compiles daily schedule', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setSchedule({ daily: { at: '17:00' } });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.trigger, {
        schedule: { daily: { at: '17:00' } },
      });
    });

    it('compiles cron schedule', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setSchedule({ cron: '0 0/5 9-17 * * MON-FRI' });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.trigger, {
        schedule: { cron: '0 0/5 9-17 * * MON-FRI' },
      });
    });
  });

  describe('compile input', () => {
    it('compiles static-only input as simple (no chain)', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setInput({
        watchUrl: 'https://example.com',
        env: 'NON-PROD',
      });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.input, {
        simple: {
          watchUrl: 'https://example.com',
          env: 'NON-PROD',
        },
      });
    });

    it('compiles mixed static + query input as chain', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setInput({
        watchUrl: 'https://example.com',
        env: 'NON-PROD',
        logs: query({
          indexes: ['eks-*'],
          timeRange: '-2h to now',
          query: 'Error message',
        }),
      });
      const result = builder.compile() as {
        input: { chain: { inputs: Array<Record<string, unknown>> } }
      };

      t.assert.ok(result.input.chain);
      t.assert.strictEqual(result.input.chain.inputs.length, 2);

      t.assert.deepStrictEqual(result.input.chain.inputs[0], {
        static: {
          simple: {
            watchUrl: 'https://example.com',
            env: 'NON-PROD',
          },
        },
      });

      const logsInput = result.input.chain.inputs[1] as { logs: { search: { request: { indices: string[] } } } };
      t.assert.ok(logsInput.logs);
      t.assert.ok(logsInput.logs.search);
      t.assert.deepStrictEqual(logsInput.logs.search.request.indices, ['eks-*']);
    });

    it('compiles rawQuery input', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setInput({
        raw: rawQuery({ indices: ['test-*'], body: { query: { match_all: {} } } }),
      });
      const result = builder.compile() as {
        input: { chain: { inputs: Array<Record<string, unknown>> } }
      };

      t.assert.ok(result.input.chain);
      const rawInput = result.input.chain.inputs[0] as { raw: { search: { request: Record<string, unknown> } } };
      t.assert.deepStrictEqual(rawInput.raw.search.request, {
        indices: ['test-*'],
        body: { query: { match_all: {} } },
      });
    });
  });

  describe('compile condition', () => {
    it('compiles compare condition with auto-prepended ctx.payload', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setCondition({ 'logs.hits.total': gt(0) });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.condition, {
        compare: {
          'ctx.payload.logs.hits.total': { gt: 0 },
        },
      });
    });

    it('does not double-prepend ctx.payload', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setCondition({ 'ctx.payload.hits.total': gte(1) });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.condition, {
        compare: {
          'ctx.payload.hits.total': { gte: 1 },
        },
      });
    });

    it('compiles script reference condition', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setCondition({ id: 'my-alert-condition' });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.condition, {
        script: { id: 'my-alert-condition' },
      });
    });

    it('compiles inline script condition', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setCondition('return ctx.payload.hits.total > 0');
      const result = builder.compile();
      t.assert.deepStrictEqual(result.condition, {
        script: { source: 'return ctx.payload.hits.total > 0' },
      });
    });
  });

  describe('compile transforms', () => {
    it('compiles a single transform without chain', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.addTransform({ id: 'my-transform' });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.transform, {
        script: { id: 'my-transform' },
      });
    });

    it('compiles multiple transforms as chain', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.addTransform({ id: 'transform-1' });
      builder.addTransform({ id: 'transform-2' });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.transform, {
        chain: [
          { script: { id: 'transform-1' } },
          { script: { id: 'transform-2' } },
        ],
      });
    });
  });

  describe('compile webhookAction', () => {
    it('compiles a webhook action', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.addWebhookAction({
        name: 'send_slack_message',
        transform: { id: 'my-transform' },
        throttle_period: '15m',
        configs: {
          scheme: 'https',
          host: 'hooks.slack.com',
          port: 443,
          method: 'post',
        },
      });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.actions, {
        send_slack_message: {
          throttle_period: '15m',
          transform: { script: { id: 'my-transform' } },
          webhook: {
            scheme: 'https',
            host: 'hooks.slack.com',
            port: 443,
            method: 'post',
          },
        },
      });
    });

    it('defaults action name to send_slack_message', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.addWebhookAction({
        configs: { host: 'example.com' },
      });
      const result = builder.compile() as { actions: Record<string, unknown> };
      t.assert.ok(result.actions.send_slack_message);
    });

    it('sets webhook body and headers from markdown message', (t: TestContext) => {
      const builder = new WatcherBuilder();
      const message = {
        [MARKDOWN_TAG]: true as const,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '{{ctx.payload.count}} Failures', emoji: true } },
          { type: 'section', text: { type: 'mrkdwn', text: 'Something went wrong' } },
        ],
      };
      builder.addWebhookAction({
        name: 'notify',
        message,
        configs: {
          scheme: 'https',
          host: 'hooks.slack.com',
          port: 443,
          method: 'post',
        },
      });
      const result = builder.compile() as { actions: { notify: { webhook: Record<string, unknown> } } };
      const webhook = result.actions.notify.webhook;

      t.assert.strictEqual(typeof webhook.body, 'string');
      const parsed = JSON.parse(webhook.body as string) as { blocks: Array<{ text: { text: string } }> };
      t.assert.strictEqual(parsed.blocks.length, 2);
      t.assert.strictEqual(parsed.blocks[0]!.text.text, '{{ctx.payload.count}} Failures');
      t.assert.deepStrictEqual(webhook.headers, { 'Content-Type': 'application/json' });
    });

    it('markdown message coexists with transform', (t: TestContext) => {
      const builder = new WatcherBuilder();
      const message = {
        [MARKDOWN_TAG]: true as const,
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Hello' } }],
      };
      builder.addWebhookAction({
        name: 'notify',
        message,
        transform: { id: 'my-transform' },
        configs: { host: 'hooks.slack.com' },
      });
      const result = builder.compile() as { actions: { notify: { transform: unknown; webhook: Record<string, unknown> } } };
      const action = result.actions.notify;

      t.assert.ok(action.transform);
      t.assert.ok(action.webhook.body);
      t.assert.deepStrictEqual(action.transform, { script: { id: 'my-transform' } });
    });

    it('does not set body when no message is provided', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.addWebhookAction({
        configs: { host: 'example.com' },
      });
      const result = builder.compile() as { actions: { send_slack_message: { webhook: Record<string, unknown> } } };
      t.assert.strictEqual(result.actions.send_slack_message.webhook.body, undefined);
    });
  });

  describe('compile metadata', () => {
    it('compiles metadata', (t: TestContext) => {
      const builder = new WatcherBuilder();
      builder.setMetadata({ team: 'platform', severity: 'high' });
      const result = builder.compile();
      t.assert.deepStrictEqual(result.metadata, {
        team: 'platform',
        severity: 'high',
      });
    });
  });

  describe('full compilation', () => {
    it('compiles a complete watcher', (t: TestContext) => {
      const builder = new WatcherBuilder();

      builder.setSchedule({ interval: '2h' });
      builder.setInput({
        watchUrl: 'https://example.com',
        env: 'NON-PROD',
        logs: query({
          indexes: ['eks-*'],
          timeRange: '-2h to now',
          query: 'Error message',
          filters: {
            'kubernetes.pod_name': isOneOf('ips-hermes'),
          },
        }),
      });
      builder.setCondition({ 'logs.hits.total': gt(0) });
      builder.addTransform({ id: 'my-transform' });
      builder.addWebhookAction({
        name: 'send_slack_message',
        transform: { id: 'my-transform' },
        configs: {
          scheme: 'https',
          host: 'hooks.slack.com',
          port: 443,
          method: 'post',
        },
      });

      const result = builder.compile() as {
        trigger: unknown;
        input: { chain: unknown };
        condition: { compare: unknown };
        transform: { script: unknown };
        actions: { send_slack_message: unknown };
      };

      t.assert.ok(result.trigger);
      t.assert.ok(result.input.chain);
      t.assert.ok(result.condition.compare);
      t.assert.ok(result.transform.script);
      t.assert.ok(result.actions.send_slack_message);
    });
  });
});
