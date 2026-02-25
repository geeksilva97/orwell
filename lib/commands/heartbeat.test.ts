import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import { makeWatchFromWatchIds } from './heartbeat.ts';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('makeWatchFromWatchIds', () => {
  it('creates a watch object from watch IDs', (t: TestContext) => {
    const watchIds = ['watch1', 'watch2'];
    const result = makeWatchFromWatchIds({
      action: {
        slack: {
          path: '/hello/world',
        }
      },
      indices: ['watcher-history'],
      interval: '1h',
      watchIds,
    }) as {
      trigger: Record<string, unknown>;
      input: { chain: { inputs: Array<Record<string, unknown>> } };
      condition: Record<string, unknown>;
      transform: { chain: Array<{ script: { source: string; lang: string } }> };
      actions: {
        send_slack_message: {
          condition: Record<string, unknown>;
          transform: Record<string, unknown>;
          webhook: Record<string, unknown>;
        }
      };
    };

    const { trigger, input, condition, transform, actions } = result;

    t.assert.deepStrictEqual(trigger, {
      schedule: {
        interval: '1h'
      }
    });
    t.assert.deepStrictEqual(input, {
      chain: {
        inputs: [
          {
            env: {
              simple: {
                watchIds
              }
            }
          },
          {
            "watch1": {
              "search": {
                "request": {
                  "search_type": "query_then_fetch",
                  "indices": [
                    "watcher-history"
                  ],
                  "rest_total_hits_as_int": true,
                  "body": {
                    "size": 3,
                    "query": {
                      "match": {
                        "watch_id": "watch1"
                      }
                    },
                    "sort": [
                      {
                        "trigger_event.triggered_time": {
                          "order": "desc"
                        }
                      }
                    ]
                  }
                }
              }
            }
          },
          {
            "watch2": {
              "search": {
                "request": {
                  "search_type": "query_then_fetch",
                  "indices": [
                    "watcher-history"
                  ],
                  "rest_total_hits_as_int": true,
                  "body": {
                    "size": 3,
                    "query": {
                      "match": {
                        "watch_id": "watch2"
                      }
                    },
                    "sort": [
                      {
                        "trigger_event.triggered_time": {
                          "order": "desc"
                        }
                      }
                    ]
                  }
                }
              }
            }
          },
        ]
      }
    });
    t.assert.deepStrictEqual(condition, { always: {} });
    t.assert.strictEqual(transform.chain[0]!.script.source, readFileSync(path.join(__dirname, 'heartbeat.groovy'), 'utf-8').toString());
    t.assert.strictEqual(transform.chain[0]!.script.lang, 'painless');
    t.assert.deepStrictEqual(actions.send_slack_message.condition, {
      script: {
        source: 'return ctx.payload.shouldSendMessage;',
        lang: 'painless'
      }
    });
    t.assert.deepStrictEqual(actions.send_slack_message.transform, {
      script: {
        source: readFileSync(path.join(__dirname, 'heartbeat-slack.groovy'), 'utf-8').toString(),
        lang: 'painless'
      }
    });
    t.assert.deepStrictEqual(actions.send_slack_message.webhook, {
      scheme: "https",
      host: "hooks.slack.com",
      body: '{{#toJson}}ctx.payload.message{{/toJson}}',
      port: 443,
      method: "post",
      path: '/hello/world',
      params: {},
      headers: {},
    });
  });
});
