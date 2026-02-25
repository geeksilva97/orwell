import { describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import { makeDeployWatchClient } from './deploy-watch-client.ts';

const defaultSetup = {
  httpClient: {
    put: mock.fn<() => Promise<void>>(() => Promise.resolve()),
    delete: mock.fn<() => Promise<void>>(() => Promise.resolve())
  },
  authOptions: {
    auth: {
      username: 'edy',
      password: '123'
    }
  }
};

const setup = ({
  authOptions,
  httpClient,
}: {
  authOptions?: Record<string, unknown>;
  httpClient?: Record<string, unknown>;
} = {}) => {
  const mergedProps = {
    httpClient: {
      ...defaultSetup.httpClient,
      ...httpClient
    },
    authOptions: {
      ...defaultSetup.authOptions,
      ...authOptions
    }
  };
  const service = makeDeployWatchClient({
    httpClient: mergedProps.httpClient as Parameters<typeof makeDeployWatchClient>[0]['httpClient'],
    authOptions: mergedProps.authOptions as Parameters<typeof makeDeployWatchClient>[0]['authOptions']
  });

  return {
    service,
    httpClient: mergedProps.httpClient,
    authOptions: mergedProps.authOptions
  };
};

describe('deploy-watch-client', () => {
  describe('deploy', () => {
    describe('when a compilation error occurs', () => {
      it('throws a PainlessCompilationError', async (t: TestContext) => {
        const fakeHttpClient = {
          put: mock.fn<() => Promise<void>>(() => Promise.reject({
            response: {
              status: 400,
              data: {
                error: {
                  type: 'script_exception',
                  reason: 'reason',
                  position: 'position',
                  script_stack: [
                    '... slackHookPath == null) {\nslackHook = watchEnvs.sim ...',
                    '                             ^---- HERE'
                  ],
                  caused_by: {
                    type: 'type',
                    reason: 'reason'
                  }
                }
              }
            }
          }))
        };

        const { service } = setup({
          httpClient: fakeHttpClient
        });

        await t.assert.rejects(
          () => service.deploy({ id: 'alert-id', content: {} }),
          (err: Error) => {
            t.assert.ok(err.message.includes('[Painless Compilation Error] reason'));
            return true;
          }
        );
      });
    });
  });
});
