const { makeDeployWatchClient } = require("./deploy-watch-client");

const defaultSetup = {
  httpClient: {
    put: jest.fn()
  },
  authOptions: {
    auth: {
      user: 'edy',
      pass: '123'
    }
  }
};

const setup = ({
  authOptions,
  httpClient,
}) => {
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
    httpClient: mergedProps.httpClient,
    authOptions: mergedProps.authOptions
  });

  return {
    service,
    httpClient: mergedProps.httpClient,
    authOptions: mergedProps.authOptions
  }
};

describe('deploy-watch-client', () => {
  describe('deploy', () => {
    describe('when a compilation error occurs', () => {
      it('throws a PainlessCompilationError', async () => {
        const fakeHttpClient = {
          put: jest.fn().mockRejectedValue({
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
                  ]
                  ,
                  caused_by: {
                    type: 'type',
                    reason: 'reason'
                  }
                }
              }
            }
          })
        };

        const { service } = setup({
          httpClient: fakeHttpClient
        });

        await expect(service.deploy({
          id: 'alert-id',
          content: 'content'
        })).rejects.toThrow('[Painless Compilation Error] reason');
      });
    });
  });
});
