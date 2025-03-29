const { AlertFactory } = require("../core/alert-factory");
const { makeDeployWatch } = require("./deploy-watch");

const setup = () => {
  const deployWatchClient = {
    deploy: jest.fn()
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

const alertWithJSWatchFiles = AlertFactory.build({
  alertData: {
    id: 'an-alert-with-js-watch-files',
    name: 'alert-name',
    path: '/my-alert',
    watchFiles: [
      {
        filename: 'watcher.commsplat.non-prod.js',
        type: 'js'
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
  it('deploys the alert', async () => {
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

    const readFileSync = jest.fn().mockReturnValue(JSON.stringify(watchSample));

    await deployWatchService.deploy(alert, readFileSync);

    expect(readFileSync).toHaveBeenCalledTimes(1);
    expect(readFileSync).toHaveBeenCalledWith('/my-alert/alert-name/watcher.commsplat.non-prod.json');
    expect(deployWatchClient.deploy).toHaveBeenCalledTimes(1);
    expect(deployWatchClient.deploy).toHaveBeenCalledWith({
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
    });
  });
});
