const { AlertFactory } = require("../core/alert-factory");
const { getAlertsToSync, getChangedAlerts } = require("./diff-alerts");
const { describe, it, mock } = require('node:test');

describe('diff-alerts', () => {
  describe('getChangedAlerts', () => {
    it('collects updated alerts', (t) => {
      const findAlertByPathMock = mock.fn((path) => {
        const split = path.split('/').slice(0, 3);
        return `a mocked alert for ${split.join('/')}`;
      });

      const changedAlerts = getChangedAlerts({
        baseDir: 'src',
        dirs: ['src/in-person-selling', 'src/payments-hub'],
        diffFunction: () => [
          'src/in-person-selling/alert-1/file1',
          'src/in-person-selling/alert-2/file2',
          'src/payments-hub/alert-3/file2',
          'src/payments-hub/alert-3/file3'
        ],
        alertRepository: {
          findAlertByPath: findAlertByPathMock
        }
      });

      t.assert.strictEqual(findAlertByPathMock.mock.callCount(), 3);
      t.assert.deepStrictEqual(findAlertByPathMock.mock.calls[0].arguments, ['src/in-person-selling/alert-1']);
      t.assert.deepStrictEqual(findAlertByPathMock.mock.calls[1].arguments, ['src/in-person-selling/alert-2']);
      t.assert.deepStrictEqual(findAlertByPathMock.mock.calls[2].arguments, ['src/payments-hub/alert-3']);

      t.assert.deepStrictEqual(changedAlerts, [
        'a mocked alert for src/in-person-selling/alert-1',
        'a mocked alert for src/in-person-selling/alert-2',
        'a mocked alert for src/payments-hub/alert-3'
      ]);
    });
  });

  describe('getAlertsToSync', () => {
    it('collects updated alerts', (t) => {
      const findAlertByPathMock = mock.fn((path) => {
        const split = path.split('/').slice(0, 3);
        return `a mocked alert for ${split.join('/')}`;
      });

      const changedAlerts = getAlertsToSync({
        baseDir: 'src',
        dirs: ['src/in-person-selling', 'src/payments-hub'],
        diffFunction: () => ({
          updated: [
            'src/in-person-selling/alert-1/file1',
            'src/in-person-selling/alert-2/file2',
            'src/payments-hub/alert-3/file2',
            'src/payments-hub/alert-3/file3'
          ],
          deleted: [
            'src/in-person-selling/entitlement-update-failure/expected.json',
            'src/in-person-selling/entitlement-update-failure/payload.sample.json',
            'src/in-person-selling/entitlement-update-failure/script.groovy',
            'src/in-person-selling/entitlement-update-failure/test.test.js',
            'src/in-person-selling/entitlement-update-failure/watcher.commsplat.non-prod.json',
            'src/in-person-selling/entitlement-update-failure/watcher.commsplat.prod.json',
          ]
        }),
        alertRepository: {
          findAlertByPath: findAlertByPathMock
        }
      });

      t.assert.strictEqual(findAlertByPathMock.mock.callCount(), 3);
      t.assert.deepStrictEqual(findAlertByPathMock.mock.calls[0].arguments, ['src/in-person-selling/alert-1']);
      t.assert.deepStrictEqual(findAlertByPathMock.mock.calls[1].arguments, ['src/in-person-selling/alert-2']);
      t.assert.deepStrictEqual(findAlertByPathMock.mock.calls[2].arguments, ['src/payments-hub/alert-3']);

      t.assert.deepStrictEqual(changedAlerts, [
        [
          'a mocked alert for src/in-person-selling/alert-1',
          'a mocked alert for src/in-person-selling/alert-2',
          'a mocked alert for src/payments-hub/alert-3'
        ],
        [
          AlertFactory.build({
            alertData: {
              id: 'in-person-selling-entitlement-update-failure',
              name: 'entitlement-update-failure',
              path: 'src/in-person-selling',
              watchFiles: [
                'watcher.commsplat.non-prod.json',
                'watcher.commsplat.prod.json'
              ]
            }
          })
        ]
      ]);
    });
  });
});
