const { AlertFactory } = require("../core/alert-factory");
const fixtures = require('../../test/fixtures');
const compiledWatchFromJS = require('../../test/fixtures/my-js-alert/compiled-watcher.commsplat.non-prod.json');
const { makeDeployAlertsService } = require("./deploy-alerts");

const setup = (alerts) => {
  const scriptDeployer = {
    deploy: jest.fn()
  };
  const watchDeployer = {
    deploy: jest.fn(),
    deployWatchAsObject: jest.fn()
  };

  const deployAlertsService = makeDeployAlertsService({
    alerts,
    scriptDeployer,
    watchDeployer
  });

  return {
    deployAlertsService,
    scriptDeployer,
    watchDeployer
  }
};

const deployableAlertWithJSWatchFiles = AlertFactory.build({
  alertData: {
    id: 'my-js-alert',
    path: fixtures.path(),
    name: 'my-js-alert',
    watchFiles: [
      {
        filename: 'watcher.commsplat.non-prod.js',
        type: 'js'
      },
      {
        filename: 'watcher.commsplat.prod.js',
        type: 'js'
      }
    ]
  }
});

const deployableAlertWithNoScript = AlertFactory.build({
  alertData: {
    id: 'alert-id-1',
    path: '/my-alert',
    watchFiles: [
      {
        type: 'json',
        filename: 'watcher.commsplat.non-prod.json',
      },
      {
        type: 'json',
        filename: 'watcher.commsplat.prod.json',
      },
    ]
  }
});

const deployableAlertWithScript = AlertFactory.build({
  alertData: {
    id: 'alert-id-1',
    path: '/my-alert',
    watchFiles: [
      {
        type: 'json',
        filename: 'watcher.commsplat.non-prod.json',
      },
      {
        type: 'json',
        filename: 'watcher.commsplat.prod.json',
      },
    ]
  },
  scriptParams: {
    id: 'alert-id-1',
    path: '/my-alert',
    content: 'my script content'
  }
});

describe('deploy-alerts', () => {
  describe('execute', () => {
    it('deploys alerts with single watch file per target', async () => {
      const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
        deployableAlertWithNoScript
      ]);

      await deployAlertsService.execute({
        envTarget: 'non-prod',
        serverTarget: 'commsplat'
      });

      expect(scriptDeployer.deploy).not.toHaveBeenCalled();
      expect(watchDeployer.deploy).toHaveBeenCalledWith({
        ...deployableAlertWithNoScript,
        watchFiles: [{
          type: 'json',
          filename: 'watcher.commsplat.non-prod.json'
        }]
      });
    });

    describe('when no watch file is found', () => {
      it('does not deploy the alert', async () => {
        const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
          deployableAlertWithNoScript
        ]);

        await deployAlertsService.execute({
          envTarget: 'non-prod',
          serverTarget: 'gopaydev'
        });

        expect(scriptDeployer.deploy).not.toHaveBeenCalled();
        expect(watchDeployer.deploy).not.toHaveBeenCalled();
      });
    });

    it('deploys JS watch files', async () => {
      const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
        deployableAlertWithJSWatchFiles
      ]);

      await deployAlertsService.execute({
        envTarget: 'non-prod',
        serverTarget: 'commsplat'
      });

      expect(scriptDeployer.deploy).toHaveBeenCalledTimes(2);
      expect(watchDeployer.deployWatchAsObject).toHaveBeenCalledWith(compiledWatchFromJS, 'my-js-alert');
    });

    describe('when the alert has a script', () => {
      it('deplys script', async () => {
        const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
          deployableAlertWithScript
        ]);

        await deployAlertsService.execute({
          envTarget: 'non-prod',
          serverTarget: 'commsplat'
        });

        expect(scriptDeployer.deploy).toHaveBeenCalledWith(deployableAlertWithScript);
        expect(watchDeployer.deploy).toHaveBeenCalledWith({
          ...deployableAlertWithScript,
          watchFiles: [
            {
              type: 'json',
              filename: 'watcher.commsplat.non-prod.json'
            }
          ]
        });
      });
    });
  });
});
