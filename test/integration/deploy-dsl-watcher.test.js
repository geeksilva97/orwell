const { describe, it, before, after } = require('node:test');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { parseWatchJSFile } = require('../../dsl/watch-js-utilities');
const { makeHttpClient } = require('../../lib/services/http-client');
const { makeDeployWatchClient } = require('../../lib/services/deploy-watch-client');
const { makeDeployWatch } = require('../../lib/services/deploy-watch');
const { makeDeployScriptClient } = require('../../lib/services/deploy-script-client');
const { makeDeployScriptService } = require('../../lib/services/deploy-script');
const { transpileScript } = require('../../lib/services/transpile-painless-scripts');

const ES_URL = 'http://localhost:19200';
const ALERT_ID = 'integration-test-alert';
const SCRIPT_ID = `${ALERT_ID}-transform`;
const TEST_INDEX = 'orwell-integration-test-logs';
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

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

describe('DSL watcher integration', () => {
  const esClient = makeHttpClient(ES_URL);

  before(async () => {
    await waitForES();

    // Watcher requires a trial license (basic license returns 403)
    await esClient.post('/_license/start_trial?acknowledge=true').catch(() => {});

    // Create test index
    await esClient.put(`/${TEST_INDEX}`, {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
    });

    // Index 3 matching documents
    const now = new Date().toISOString();

    for (let i = 0; i < 3; i++) {
      await esClient.post(`/${TEST_INDEX}/_doc`, {
        '@timestamp': now,
        message: `Failed to create reconext order - document ${i}`,
        kubernetes: { pod_name: 'ips-hermes' },
      });
    }

    // Refresh so docs are searchable
    await esClient.post(`/${TEST_INDEX}/_refresh`);
  });

  after(async () => {
    try { await esClient.delete(`/_watcher/watch/${ALERT_ID}`); } catch { /* ignore */ }
    try { await esClient.delete(`/_scripts/${SCRIPT_ID}`); } catch { /* ignore */ }
    try { await esClient.delete(`/${TEST_INDEX}`); } catch { /* ignore */ }
  });

  it('deploys a DSL watcher and verifies it is stored', async (t) => {
    // 1. Parse DSL fixture
    const dslPath = path.join(FIXTURES_DIR, 'watcher.dsl.js');
    const { watchObject, scripts } = parseWatchJSFile(dslPath, {
      alertId: ALERT_ID,
      baseDir: FIXTURES_DIR,
    });

    // 2. Wire up real services (same chain as push.js)
    const watchHttpClient = makeHttpClient(`${ES_URL}/_watcher/watch`);
    const scriptHttpClient = makeHttpClient(`${ES_URL}/_scripts`);
    const authOptions = {};

    const watchClient = makeDeployWatchClient({ httpClient: watchHttpClient, authOptions });
    const scriptClient = makeDeployScriptClient({ httpClient: scriptHttpClient, authOptions });

    const deployWatchService = makeDeployWatch({ deployWatchClient: watchClient });
    const deployScriptService = makeDeployScriptService({
      deployScriptClient: scriptClient,
      transpileService: { transpile: transpileScript },
    });

    // 3. Deploy scripts (read .groovy, transpile, POST /_scripts/{id})
    for (const scriptId in scripts) {
      const scriptContent = readFileSync(scripts[scriptId].fullPath, 'utf-8');

      await deployScriptService.deploy({
        id: ALERT_ID,
        path: FIXTURES_DIR,
        scripts: [{ id: scriptId, content: scriptContent }],
      }, scriptId);
    }

    // 4. Deploy watch (PUT /_watcher/watch/integration-test-alert)
    await deployWatchService.deployWatchAsObject(watchObject, ALERT_ID);

    // 5. GET /_watcher/watch/integration-test-alert
    const { data, status } = await esClient.get(`/_watcher/watch/${ALERT_ID}`);

    // 6. Assert: stored correctly
    t.assert.strictEqual(status, 200);
    t.assert.ok(data.watch.trigger);
    t.assert.ok(data.watch.input);
    t.assert.ok(data.watch.condition);
  });

  it('triggers from matching logs and condition evaluates to met', async (t) => {
    // 1. Execute the watcher with simulated actions
    const { data } = await esClient.post(
      `/_watcher/watch/${ALERT_ID}/_execute`,
      { action_modes: { _all: 'simulate' } },
    );

    const result = data.watch_record.result;

    // 2. Condition should be met because we indexed matching docs
    t.assert.strictEqual(result.condition.met, true);

    // 3. The search input should have found our 3 documents
    t.assert.ok(result.input.payload.logs.hits.total >= 3);
  });
});
