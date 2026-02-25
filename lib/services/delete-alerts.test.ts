import { makeDeleteAlertsService } from './delete-alerts.ts';
import { AlertFactory } from '../core/alert-factory.ts';
import { describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';

const makeAlert = (id: string) => AlertFactory.build({
  alertData: {
    id,
    name: id,
    path: '/src/group',
    watchFiles: [{ type: 'json', filename: 'watcher.json' }]
  }
});

describe('delete-alerts', () => {
  describe('execute', () => {
    it('returns empty array when there are no alerts', async (t: TestContext) => {
      const watchDeployer = { remove: mock.fn<() => Promise<boolean>>(() => Promise.resolve(true)) };

      const service = makeDeleteAlertsService({
        alerts: [],
        scriptDeployer: {},
        watchDeployer
      });

      const result = await service.execute();

      t.assert.deepStrictEqual(result, []);
      t.assert.strictEqual(watchDeployer.remove.mock.callCount(), 0);
    });

    it('calls remove for each alert', async (t: TestContext) => {
      const alert1 = makeAlert('group-alert-1');
      const alert2 = makeAlert('group-alert-2');
      const watchDeployer = { remove: mock.fn<() => Promise<boolean>>(() => Promise.resolve(true)) };

      const service = makeDeleteAlertsService({
        alerts: [alert1, alert2],
        scriptDeployer: {},
        watchDeployer
      });

      await service.execute();

      t.assert.strictEqual(watchDeployer.remove.mock.callCount(), 2);
      t.assert.deepStrictEqual(watchDeployer.remove.mock.calls[0]!.arguments[0], alert1);
      t.assert.deepStrictEqual(watchDeployer.remove.mock.calls[1]!.arguments[0], alert2);
    });

    it('counts only successfully removed alerts', async (t: TestContext) => {
      const alert1 = makeAlert('group-alert-1');
      const alert2 = makeAlert('group-alert-2');
      const alert3 = makeAlert('group-alert-3');
      let callCount = 0;
      const watchDeployer = {
        remove: mock.fn<() => Promise<boolean>>(() => {
          // first returns true, second false, third true
          const results = [true, false, true];
          return Promise.resolve(results[callCount++] ?? false);
        })
      };

      const service = makeDeleteAlertsService({
        alerts: [alert1, alert2, alert3],
        scriptDeployer: {},
        watchDeployer
      });

      const result = await service.execute();

      t.assert.deepStrictEqual(result, [true, true]);
    });
  });
});
