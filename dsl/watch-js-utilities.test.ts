import path from 'node:path';
import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseWatchJSFile } from './watch-js-utilities.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Objects created inside a VM context have a different Object.prototype,
// so deepStrictEqual fails even when structures match. JSON round-trip
// normalises prototypes back to the main context.
const normalize = (obj: unknown): unknown => JSON.parse(JSON.stringify(obj));

describe('watch-js-utilities', () => {
  it('parses watch as a javascript file with script function (legacy)', (t: TestContext) => {
    const jsCodePath = path.resolve(__dirname, './watcher.sample.js');
    const { watchObject: watch, scripts } = parseWatchJSFile(jsCodePath, {
      alertId: 'my-alert'
    });

    const foundScripts = Object.keys(scripts);

    const normalizedWatch = normalize(watch) as {
      actions: { send_slack_message: { webhook: Record<string, unknown>; transform?: Record<string, unknown> } };
      condition: Record<string, unknown>;
      transform: { chain: Array<Record<string, unknown>> };
    };

    t.assert.deepStrictEqual(normalizedWatch.actions.send_slack_message.webhook, {
      host: 'afakehost',
      scheme: 'https'
    });

    t.assert.deepStrictEqual(foundScripts, [
      'my-alert-transform',
      'my-alert-condition'
    ]);

    t.assert.deepStrictEqual(normalizedWatch.condition, {
      script: {
        id: 'my-alert-condition'
      }
    });
    t.assert.deepStrictEqual(normalizedWatch.actions.send_slack_message.transform, {
      script: {
        id: 'my-alert-transform'
      }
    });
    t.assert.deepStrictEqual(normalizedWatch.transform.chain[0], {
      script: {
        id: 'my-alert-transform'
      }
    });
  });

  it('parses a DSL watcher file and compiles to correct JSON', (t: TestContext) => {
    const jsCodePath = path.resolve(__dirname, '../test/fixtures/my-js-alert/watcher.dsl.js');
    const expectedOutput = require('../test/fixtures/my-js-alert/compiled-watcher.dsl.json') as Record<string, unknown>;
    const { watchObject, scripts } = parseWatchJSFile(jsCodePath, {
      alertId: 'my-js-alert',
      baseDir: path.resolve(__dirname, '../test/fixtures/my-js-alert'),
    });

    t.assert.deepStrictEqual(normalize(watchObject), expectedOutput);

    const foundScripts = Object.keys(scripts);
    t.assert.ok(foundScripts.includes('my-js-alert-transform'));
  });

  it('parses a DSL watcher with markdown message and compiles body as JSON string', (t: TestContext) => {
    const jsCodePath = path.resolve(__dirname, '../test/fixtures/markdown-alert/watcher.dsl.js');
    const { watchObject } = parseWatchJSFile(jsCodePath, {
      alertId: 'markdown-alert',
      baseDir: path.resolve(__dirname, '../test/fixtures/markdown-alert'),
    });

    const normalized = normalize(watchObject) as {
      actions: { send_slack_message: { webhook: { body: string; headers: Record<string, unknown> } } }
    };
    const webhook = normalized.actions.send_slack_message.webhook;

    t.assert.strictEqual(typeof webhook.body, 'string');
    t.assert.deepStrictEqual(webhook.headers, { 'Content-Type': 'application/json' });

    const parsed = JSON.parse(webhook.body) as { blocks: Array<{ type: string; text?: { text: string } }> };
    t.assert.ok(Array.isArray(parsed.blocks));

    // header with mustache placeholder
    t.assert.strictEqual(parsed.blocks[0]!.type, 'header');
    t.assert.strictEqual(parsed.blocks[0]!.text!.text, '{{ctx.payload.count}} Failures Detected');

    // section with bold mustache
    t.assert.strictEqual(parsed.blocks[1]!.type, 'section');
    t.assert.ok(parsed.blocks[1]!.text!.text.includes('*{{ctx.payload.service}}*'));

    // divider
    const dividers = parsed.blocks.filter((b) => b.type === 'divider');
    t.assert.strictEqual(dividers.length, 1);

    // actions and context from options
    const actions = parsed.blocks.filter((b) => b.type === 'actions');
    t.assert.strictEqual(actions.length, 1);
    const actionBlock = actions[0] as unknown as { elements: Array<{ url: string }> };
    t.assert.strictEqual(actionBlock.elements[0]!.url, '{{ctx.payload.logsUrl}}');

    const context = parsed.blocks.filter((b) => b.type === 'context');
    t.assert.strictEqual(context.length, 1);
  });
});
