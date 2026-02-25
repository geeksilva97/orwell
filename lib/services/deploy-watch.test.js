const { describe, it, mock } = require('node:test');
const { AlertFactory } = require("../core/alert-factory");
const { makeDeployWatch } = require("./deploy-watch");

const setup = () => {
  const deployWatchClient = {
    deploy: mock.fn()
  };

  const deployWatchService = makeDeployWatch({
    deployWatchClient
  });

  return {
    deployWatchService,
    deployWatchClient
  };
};

const alert = AlertFactory.build({
  alertData: {
    id: 'alert-id-1',
    name: 'alert-name',
    path: '/my-alert',
    watchFiles: [
      {
        type: 'json',
        filename: 'watcher.commsplat.non-prod.json'
      }
    ]
  }
});

global.env = {
  WATCH_ENV_JSON: {
    slackHook: 'https://slack.com/hook'
  }
};

describe('deploy-watch', () => {
  it('deploys the alert', async (t) => {
    const { deployWatchClient, deployWatchService } = setup();

    const watchSample = {
      input: {
        chain: {
          inputs: [
            {
              logs: {
                search: {
                  request: 'some request here'
                }
              }
            }
          ]
        }
      },
      transform: {
        chain: [
          {
            script: {
              id: "<SCRIPT_ID>"
            }
          }
        ]
      }
    };

    const readFileSync = mock.fn(() => JSON.stringify(watchSample));

    await deployWatchService.deploy(alert, readFileSync);

    t.assert.strictEqual(readFileSync.mock.calls.length, 1);
    t.assert.deepStrictEqual(readFileSync.mock.calls[0].arguments, ['/my-alert/alert-name/watcher.commsplat.non-prod.json']);
    t.assert.strictEqual(deployWatchClient.deploy.mock.calls.length, 1);
    t.assert.deepStrictEqual(deployWatchClient.deploy.mock.calls[0].arguments, [{
      id: 'alert-id-1',
      content: {
        input: {
          chain: {
            inputs: [
              {
                watchEnvs: {
                  simple: {
                    slackHook: 'https://slack.com/hook'
                  }
                }
              },
              {
                logs: {
                  search: {
                    request: 'some request here'
                  }
                }
              }
            ]
          }
        },
        transform: {
          chain: [
            {
              script: {
                id: 'alert-id-1'
              }
            }
          ]
        }
      }
    }]);
  });
});
