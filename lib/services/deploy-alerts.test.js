const { AlertFactory } = require("../core/alert-factory");
const fixtures = require('../../test/fixtures');
const compiledWatchFromJS = require('../../test/fixtures/my-js-alert/compiled-watcher.commsplat.non-prod.json');
const { makeDeployAlertsService } = require("./deploy-alerts");
const { describe, it, mock } = require('node:test');

const setup = (alerts) => {
  const scriptDeployer = {
    deploy: mock.fn()
  };
  const watchDeployer = {
    deploy: mock.fn(),
    deployWatchAsObject: mock.fn()
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
        filename: 'watcher.myserver.dev.js',
        type: 'js'
      },
      {
        filename: 'watcher.myserver.prod.js',
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
        filename: 'watcher.myserver.dev.json',
      },
      {
        type: 'json',
        filename: 'watcher.myserver.prod.json',
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
        filename: 'watcher.myserver.dev.json',
      },
      {
        type: 'json',
        filename: 'watcher.myserver.prod.json',
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
    it('deploys alerts with single watch file per target', async (t) => {
      const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
        deployableAlertWithNoScript
      ]);

      await deployAlertsService.execute({
        envTarget: 'dev',
        serverTarget: 'myserver'
      });

      t.assert.strictEqual(scriptDeployer.deploy.mock.calls.length, 0);
      t.assert.strictEqual(watchDeployer.deploy.mock.calls.length, 1);
      t.assert.deepStrictEqual(watchDeployer.deploy.mock.calls[0].arguments, [
        {
          ...deployableAlertWithNoScript,
          watchFiles: [{
            type: 'json',
            filename: 'watcher.myserver.dev.json'
          }
          ]
        }]);
    });

    describe('when no watch file is found', () => {
      it('does not deploy the alert', async (t) => {
        const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
          deployableAlertWithNoScript
        ]);

        await deployAlertsService.execute({
          envTarget: 'dev',
          serverTarget: 'otherserver'
        });

        t.assert.strictEqual(scriptDeployer.deploy.mock.calls.length, 0);
        t.assert.strictEqual(watchDeployer.deploy.mock.calls.length, 0);
      });
    });

    it('deploys JS watch files', async (t) => {
      const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
        deployableAlertWithJSWatchFiles
      ]);

      await deployAlertsService.execute({
        envTarget: 'dev',
        serverTarget: 'myserver'
      });

      t.assert.strictEqual(scriptDeployer.deploy.mock.calls.length, 2);
      t.assert.strictEqual(watchDeployer.deployWatchAsObject.mock.calls.length, 1);

      // Structured clone needed because object is created in a different realm
      t.assert.deepStrictEqual(structuredClone(watchDeployer.deployWatchAsObject.mock.calls[0].arguments[0]), compiledWatchFromJS);
      t.assert.deepStrictEqual(watchDeployer.deployWatchAsObject.mock.calls[0].arguments[1], 'my-js-alert');
    });

    describe('when the alert has a script', () => {
      it('deplys script', async (t) => {
        const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
          deployableAlertWithScript
        ]);

        await deployAlertsService.execute({
          envTarget: 'dev',
          serverTarget: 'myserver'
        });

        t.assert.strictEqual(scriptDeployer.deploy.mock.calls.length, 1);
        t.assert.deepStrictEqual(watchDeployer.deploy.mock.calls[0].arguments, [
          {
            ...deployableAlertWithScript,
            watchFiles: [{
              type: 'json',
              filename: 'watcher.myserver.dev.json'
            }]
          }
        ]);
      });
    });
  });
});
