const { makeDeployScriptService } = require("./deploy-script");
const { AlertFactory } = require("../core/alert-factory");

const setup = () => {
  const service = makeDeployScriptService({
    deployScriptClient: {
      deploy: jest.fn()
    },
    transpileService: {
      transpile: jest.fn()
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
    name: 'alert-name', // 'name' is not used in the service, it should be 'id
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
  it('calls client for deploying script', async () => {
    const { deployScriptService, transpileService, deployScriptClient } = setup();

    jest.spyOn(transpileService, 'transpile').mockReturnValue('transpiled script content');

    await deployScriptService.deploy(alert);

    expect(transpileService.transpile).toHaveBeenCalledWith('my script content', `${alert.path}/${alert.id}`, {});
    expect(deployScriptClient.deploy).toHaveBeenCalledWith({
      content: 'transpiled script content',
      id: 'alert-id'
    });
  });
});
