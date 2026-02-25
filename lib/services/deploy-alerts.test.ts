import { AlertFactory } from '../core/alert-factory.ts';
import fixtures from '../../test/fixtures/index.ts';
import { createRequire } from 'node:module';
import { makeDeployAlertsService } from './deploy-alerts.ts';
import { describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';

const require = createRequire(import.meta.url);
const compiledWatchFromJS = require('../../test/fixtures/my-js-alert/compiled-watcher.commsplat.non-prod.json') as Record<string, unknown>;

const setup = (alerts: Parameters<typeof makeDeployAlertsService>[0]['alerts']) => {
  const scriptDeployer = {
    deploy: mock.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve())
  };
  const watchDeployer = {
    deploy: mock.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve()),
    deployWatchAsObject: mock.fn<(watchObject: Record<string, unknown>, alertId: string) => Promise<void>>(() => Promise.resolve())
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
  };
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
    name: 'alert-name',
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
    name: 'alert-name',
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
    it('deploys alerts with single watch file per target', async (t: TestContext) => {
      const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
        deployableAlertWithNoScript
      ]);

      await deployAlertsService.execute({
        envTarget: 'dev',
        serverTarget: 'myserver'
      });

      t.assert.strictEqual(scriptDeployer.deploy.mock.calls.length, 0);
      t.assert.strictEqual(watchDeployer.deploy.mock.calls.length, 1);
      t.assert.deepStrictEqual(watchDeployer.deploy.mock.calls[0]!.arguments, [
        {
          ...deployableAlertWithNoScript,
          watchFiles: [{
            type: 'json',
            filename: 'watcher.myserver.dev.json'
          }]
        }]);
    });

    describe('when no watch file is found', () => {
      it('does not deploy the alert', async (t: TestContext) => {
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

    it('deploys JS watch files', async (t: TestContext) => {
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
      t.assert.deepStrictEqual(structuredClone(watchDeployer.deployWatchAsObject.mock.calls[0]!.arguments[0]), compiledWatchFromJS);
      t.assert.deepStrictEqual(watchDeployer.deployWatchAsObject.mock.calls[0]!.arguments[1], 'my-js-alert');
    });

    describe('when the alert has a script', () => {
      it('deploys script', async (t: TestContext) => {
        const { deployAlertsService, scriptDeployer, watchDeployer } = setup([
          deployableAlertWithScript
        ]);

        await deployAlertsService.execute({
          envTarget: 'dev',
          serverTarget: 'myserver'
        });

        t.assert.strictEqual(scriptDeployer.deploy.mock.calls.length, 1);
        t.assert.deepStrictEqual(watchDeployer.deploy.mock.calls[0]!.arguments, [
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
