const { describe, it, mock } = require('node:test');
const { makeDeployScriptService } = require("./deploy-script");
const { AlertFactory } = require("../core/alert-factory");

const setup = () => {
  const service = makeDeployScriptService({
    deployScriptClient: {
      deploy: mock.fn()
    },
    transpileService: {
      transpile: mock.fn()
    }
  });

  return {
    deployScriptClient: service.deployScriptClient,
    transpileService: service.transpileService,
    deployScriptService: service
  }
};

const alert = AlertFactory.build({
  alertData: {
    id: 'alert-id',
    name: 'alert-name',
    path: 'alert-path',
    watchFiles: [
      'watcher.json'
    ]
  },
  scriptParams: {
    content: 'my script content',
    id: 'alert-id',
    path: 'alert-path'
  }
});

describe('DeployScriptService', () => {
  it('calls client for deploying script', async (t) => {
    const { deployScriptService, transpileService, deployScriptClient } = setup();

    transpileService.transpile.mock.mockImplementation(() => 'transpiled script content');

    await deployScriptService.deploy(alert);

    t.assert.strictEqual(transpileService.transpile.mock.calls.length, 1);
    t.assert.deepStrictEqual(transpileService.transpile.mock.calls[0].arguments, ['my script content', 'alert-path/alert-id', {}]);
    t.assert.strictEqual(deployScriptClient.deploy.mock.calls.length, 1);
    t.assert.deepStrictEqual(deployScriptClient.deploy.mock.calls[0].arguments, [{
      content: 'transpiled script content',
      id: 'alert-id'
    }]);
  });
});
