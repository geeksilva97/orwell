import { describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import { AlertFactory } from '../core/alert-factory.ts';
import { makeDeployWatch } from './deploy-watch.ts';

const setup = (watchEnvJson?: Record<string, unknown>) => {
  const deployWatchClient = {
    deploy: mock.fn<() => Promise<void>>(() => Promise.resolve()),
    delete: mock.fn<() => Promise<boolean>>(() => Promise.resolve(true))
  };

  const deployWatchService = makeDeployWatch({
    deployWatchClient,
    watchEnvJson
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

describe('deploy-watch', () => {
  it('deploys the alert', async (t: TestContext) => {
    const { deployWatchClient, deployWatchService } = setup({
      slackHook: 'https://slack.com/hook'
    });

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

    const readFileSync = mock.fn<(path: string) => Buffer>(() => Buffer.from(JSON.stringify(watchSample)));

    await deployWatchService.deploy(alert, readFileSync as unknown as (path: string) => Buffer);

    t.assert.strictEqual(readFileSync.mock.calls.length, 1);
    t.assert.deepStrictEqual(readFileSync.mock.calls[0]!.arguments, ['/my-alert/alert-name/watcher.commsplat.non-prod.json']);
    t.assert.strictEqual(deployWatchClient.deploy.mock.calls.length, 1);
    t.assert.deepStrictEqual(deployWatchClient.deploy.mock.calls[0]!.arguments, [{
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
