const { describe, it } = require('node:test');
const { heartbeatUpAction, makeWatchFromWatchIds } = require('./heartbeat');
const { readFileSync } = require('node:fs');
const path = require('node:path');


describe('makeWatchFromWatchIds', () => {
  it('creates a watch object from watch IDs', (t) => {
    const watchIds = ['watch1', 'watch2'];
    const { trigger, input, condition, transform, actions } = makeWatchFromWatchIds({
      action: {
        webhook: {
          scheme: "https",
          host: "hooks.slack.com",
          port: 443,
          method: "post",
          path: '/hello/world',
          params: {},
          headers: {},
        }
      },
      indices: ['watcher-history'],
      interval: '1h',
      watchIds,
    });


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
                    "size": 5,
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
                    "size": 5,
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
    t.assert.strictEqual(transform.chain[0].script.source, readFileSync(path.join(__dirname, 'heartbeat.groovy'), 'utf-8').toString());
    t.assert.strictEqual(transform.chain[0].script.lang, 'painless');
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
      port: 443,
      method: "post",
      path: '/hello/world',
      params: {},
      headers: {},
    });
  });
});

describe('heartbeat:up', () => {
  it('prints error when base dir is not provided', (t) => {
    const mockErrorLog = t.mock.method(console, 'error');
    heartbeatUpAction(t.mock.fn(), {});

    t.assert.ok(mockErrorLog.mock.calls.length === 1, 'Error message should be printed');
    t.assert.deepStrictEqual(mockErrorLog.mock.calls[0].arguments, [
      'Please provide a base dir using --base-dir'
    ]);
  });

  it('prints error when base dir does not exist', (t) => {
    const mockErrorLog = t.mock.method(console, 'error');
    heartbeatUpAction(t.mock.fn(), {
      baseDir: '/path/to/nonexistent/dir'
    });

    t.assert.ok(mockErrorLog.mock.calls.length === 1, 'Error message should be printed');
    t.assert.deepStrictEqual(mockErrorLog.mock.calls[0].arguments, [
      'Base dir does not exist'
    ]);
  });

  it('reads config from current process path', (t) => {
    const mockConfigParser = t.mock.fn(() => {
      return { baseDir: 'src', heartbeat: { alerts: [] } };
    });
    t.mock.method(process, 'cwd', () => '/hello/world');
    heartbeatUpAction(mockConfigParser, {
      baseDir: '.',
    });

    t.assert.ok(mockConfigParser.mock.calls.length === 1, 'Error message should be printed');
    t.assert.deepStrictEqual(mockConfigParser.mock.calls[0].arguments, [
      '/hello/world/orwell.js'
    ]);
  });

  it('reads config from options.configPath when provided', (t) => {
    const mockConfigParser = t.mock.fn(() => {
      return { baseDir: 'src', heartbeat: { alerts: [] } };
    });
    t.mock.method(process, 'cwd', () => '/hello/world');
    heartbeatUpAction(mockConfigParser, {
      baseDir: '.',
      configPath: '/config/path/orwell.js'
    });

    t.assert.ok(mockConfigParser.mock.calls.length === 1, 'Error message should be printed');
    t.assert.deepStrictEqual(mockConfigParser.mock.calls[0].arguments, [
      '/config/path/orwell.js'
    ]);
  });
});
