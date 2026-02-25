import { describe, it, before, after } from 'node:test';
import type { TestContext } from 'node:test';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseWatchJSFile } from '../../dsl/watch-js-utilities.ts';
import { makeHttpClient } from '../../lib/services/http-client.ts';
import { makeDeployWatchClient } from '../../lib/services/deploy-watch-client.ts';
import { makeDeployWatch } from '../../lib/services/deploy-watch.ts';
import { makeDeployScriptClient } from '../../lib/services/deploy-script-client.ts';
import { makeDeployScriptService } from '../../lib/services/deploy-script.ts';
import { transpileScript } from '../../lib/services/transpile-painless-scripts.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ES_URL = 'http://localhost:19200';
const ALERT_ID = 'integration-test-alert';
const SCRIPT_ID = `${ALERT_ID}-transform`;
const TEST_INDEX = 'orwell-integration-test-logs';
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const SKIP_CLEANUP = process.env.SKIP_CLEANUP === 'true';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForES(maxRetries = 30) {
  const client = makeHttpClient(ES_URL);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data } = await client.get('/_cluster/health') as { data: { status: string } };
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
    if (SKIP_CLEANUP) return;
    try { await esClient.delete(`/_watcher/watch/${ALERT_ID}`); } catch { /* ignore */ }
    try { await esClient.delete(`/_scripts/${SCRIPT_ID}`); } catch { /* ignore */ }
    try { await esClient.delete(`/${TEST_INDEX}`); } catch { /* ignore */ }
  });

  it('deploys a DSL watcher and verifies it is stored', async (t: TestContext) => {
    // 1. Parse DSL fixture
    const dslPath = path.join(FIXTURES_DIR, 'watcher.dsl.js');
    const { watchObject, scripts } = parseWatchJSFile(dslPath, {
      alertId: ALERT_ID,
      baseDir: FIXTURES_DIR,
    });

    // 2. Wire up real services (same chain as push.ts)
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
      const scriptRef = scripts[scriptId];
      if (!scriptRef) continue;
      const scriptContent = readFileSync(scriptRef.fullPath, 'utf-8');

      await deployScriptService.deploy({
        id: ALERT_ID,
        path: FIXTURES_DIR,
        scripts: [{ id: scriptId, content: scriptContent }],
      }, scriptId);
    }

    // 4. Deploy watch (PUT /_watcher/watch/integration-test-alert)
    await deployWatchService.deployWatchAsObject(watchObject, ALERT_ID);

    // 5. GET /_watcher/watch/integration-test-alert
    const { data, status } = await esClient.get(`/_watcher/watch/${ALERT_ID}`) as {
      data: { watch: Record<string, unknown> };
      status: number;
    };
    const watch = data.watch;

    // 6. Assert: every section matches the compiled DSL output
    t.assert.strictEqual(status, 200);

    t.assert.deepStrictEqual(watch.trigger, {
      schedule: { interval: '1h' },
    });

    t.assert.deepStrictEqual(watch.condition, {
      compare: { 'ctx.payload.logs.hits.total': { gt: 0 } },
    });

    t.assert.deepStrictEqual(watch.transform, {
      script: { id: 'integration-test-alert-transform' },
    });

    // input chain: watchEnvs (injected by deploy service), static fields, logs search
    const inputs = (watch.input as { chain: { inputs: unknown[] } }).chain.inputs;
    t.assert.strictEqual(inputs.length, 3);

    t.assert.deepStrictEqual(inputs[0], {
      watchEnvs: { simple: {} },
    });

    t.assert.deepStrictEqual(inputs[1], {
      static: { simple: { env: 'integration-test' } },
    });

    const logsSearch = (inputs[2] as { logs: { search: { request: Record<string, unknown> & { indices: string[]; body: Record<string, unknown> } } } }).logs.search.request;
    t.assert.deepStrictEqual(logsSearch.indices, ['orwell-integration-test-logs']);
    t.assert.strictEqual(logsSearch.rest_total_hits_as_int, true);
    t.assert.deepStrictEqual(logsSearch.body.query, {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: '{{ctx.trigger.scheduled_time}}||-24h',
                lte: '{{ctx.trigger.scheduled_time}}',
                format: 'strict_date_optional_time||epoch_millis',
              },
            },
          },
          {
            match_phrase: {
              message: { query: 'Failed to create reconext order', slop: 10 },
            },
          },
          {
            bool: {
              should: [{ match_phrase: { 'kubernetes.pod_name': 'ips-hermes' } }],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });

    // actions: webhook with ES-added defaults (params, headers)
    t.assert.deepStrictEqual(watch.actions, {
      notify: {
        webhook: {
          scheme: 'https',
          host: 'localhost',
          port: 9999,
          method: 'post',
          path: '/noop',
          params: {},
          headers: {},
        },
      },
    });
  });

  it('triggers from matching logs and condition evaluates to met', async (t: TestContext) => {
    // 1. Execute the watcher with simulated actions
    const { data } = await esClient.post(
      `/_watcher/watch/${ALERT_ID}/_execute`,
      { action_modes: { _all: 'simulate' } },
    ) as { data: { watch_record: { result: { condition: { met: boolean }; input: { payload: { logs: { hits: { total: number } } } }; actions: Array<{ id: string; status: string }> } } } };

    const result = data.watch_record.result;

    // 2. Condition should be met because we indexed matching docs
    t.assert.strictEqual(result.condition.met, true);

    // 3. The search input should have found exactly our 3 documents
    t.assert.strictEqual(result.input.payload.logs.hits.total, 3);

    // 4. The webhook action was simulated, not actually fired
    t.assert.strictEqual(result.actions[0]!.id, 'notify');
    t.assert.strictEqual(result.actions[0]!.status, 'simulated');
  });
});
