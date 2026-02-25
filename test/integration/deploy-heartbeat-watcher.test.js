const { describe, it, before, after } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { makeHttpClient } = require('../../lib/services/http-client');
const { makeDeployWatchClient } = require('../../lib/services/deploy-watch-client');
const { makeWatchFromWatchIds } = require('../../lib/commands/heartbeat');

const ES_URL = 'http://localhost:19200';
const HEARTBEAT_ID = 'integration-test-heartbeat';
const WATCH_IDS = ['integration-watch-a', 'integration-watch-b'];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForES(maxRetries = 30) {
  const client = makeHttpClient(ES_URL);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data } = await client.get('/_cluster/health');
      if (data.status === 'green' || data.status === 'yellow') return;
    } catch {
      // ES not ready yet
    }
    await sleep(2000);
  }

  throw new Error('Elasticsearch did not become healthy in time');
}

describe('Heartbeat watcher integration', () => {
  const esClient = makeHttpClient(ES_URL);

  before(async () => {
    await waitForES();
    await esClient.post('/_license/start_trial?acknowledge=true').catch(() => {});
  });

  after(async () => {
    try { await esClient.delete(`/_watcher/watch/${HEARTBEAT_ID}`); } catch { /* ignore */ }
  });

  it('deploys a heartbeat watcher and verifies its structure', async (t) => {
    // 1. Build the heartbeat watcher in-memory
    const watch = makeWatchFromWatchIds({
      interval: '1h',
      indices: ['.watcher-history-*'],
      watchIds: WATCH_IDS,
      action: {
        slack: {
          path: '/services/T00/B00/test-token',
        },
      },
    });

    // 2. Deploy via watch client (no auth — security disabled in docker)
    const httpClient = makeHttpClient(`${ES_URL}/_watcher/watch`);
    const watchClient = makeDeployWatchClient({ httpClient, authOptions: {} });
    await watchClient.deploy({ id: HEARTBEAT_ID, content: watch });

    // 3. GET the stored watcher back
    const { data, status } = await esClient.get(`/_watcher/watch/${HEARTBEAT_ID}`);
    const storedWatch = data.watch;

    t.assert.strictEqual(status, 200);

    // trigger
    t.assert.deepStrictEqual(storedWatch.trigger, {
      schedule: { interval: '1h' },
    });

    // input chain: env + one search per watch ID
    const inputs = storedWatch.input.chain.inputs;
    t.assert.strictEqual(inputs.length, 1 + WATCH_IDS.length);

    t.assert.deepStrictEqual(inputs[0], {
      env: { simple: { watchIds: WATCH_IDS } },
    });

    for (let i = 0; i < WATCH_IDS.length; i++) {
      const watchId = WATCH_IDS[i];
      const searchInput = inputs[i + 1][watchId];
      t.assert.ok(searchInput.search, `search input exists for ${watchId}`);
      t.assert.deepStrictEqual(searchInput.search.request.indices, ['.watcher-history-*']);
      t.assert.deepStrictEqual(searchInput.search.request.body.query, {
        match: { watch_id: watchId },
      });
    }

    // condition
    t.assert.deepStrictEqual(storedWatch.condition, { always: {} });

    // transform — painless script inlined
    const transformScript = storedWatch.transform.chain[0].script;
    t.assert.strictEqual(transformScript.lang, 'painless');
    t.assert.strictEqual(
      transformScript.source,
      readFileSync(path.join(__dirname, '../../lib/commands/heartbeat.groovy'), 'utf-8'),
    );

    // actions — slack webhook
    const slackAction = storedWatch.actions.send_slack_message;
    t.assert.ok(slackAction, 'send_slack_message action exists');
    t.assert.deepStrictEqual(slackAction.condition, {
      script: { source: 'return ctx.payload.shouldSendMessage;', lang: 'painless' },
    });
    t.assert.deepStrictEqual(slackAction.webhook, {
      scheme: 'https',
      host: 'hooks.slack.com',
      port: 443,
      method: 'post',
      path: '/services/T00/B00/test-token',
      body: '{{#toJson}}ctx.payload.message{{/toJson}}',
      params: {},
      headers: {},
    });
  });

  it('executes the heartbeat and shouldSendMessage is false when no history exists', async (t) => {
    // Execute the watcher with simulated actions
    const { data } = await esClient.post(
      `/_watcher/watch/${HEARTBEAT_ID}/_execute`,
      { action_modes: { _all: 'simulate' } },
    );

    const result = data.watch_record.result;

    // Condition is always met (condition: { always: {} })
    t.assert.strictEqual(result.condition.met, true);

    // The transform should have set shouldSendMessage to false
    // because there are no watcher-history docs for the fake watch IDs
    const sendSlackAction = result.actions.find((a) => a.id === 'send_slack_message');
    t.assert.ok(sendSlackAction, 'send_slack_message action exists in result');
    t.assert.strictEqual(sendSlackAction.status, 'condition_failed');
  });
});
