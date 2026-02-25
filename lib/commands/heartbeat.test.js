const { describe, it } = require('node:test');
const { makeWatchFromWatchIds } = require('./heartbeat');
const { readFileSync } = require('node:fs');
const path = require('node:path');


describe('makeWatchFromWatchIds', () => {
  it('creates a watch object from watch IDs', (t) => {
    const watchIds = ['watch1', 'watch2'];
    const { trigger, input, condition, transform, actions } = makeWatchFromWatchIds({
      action: {
        slack: {
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
      body: '{{#toJson}}ctx.payload.message{{/toJson}}',
      port: 443,
      method: "post",
      path: '/hello/world',
      params: {},
      headers: {},
    });
  });
});
