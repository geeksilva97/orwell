const { describe, it, mock } = require('node:test');
const { makeAlertsRepository } = require("./alert-repository");

const setup = ({
  readDirFn,
  readFileFn,
  prefix
}) => {
  return makeAlertsRepository({
    readFile: readFileFn,
    readDir: readDirFn,
    prefix
  });
};

describe('alert-repository', () => {
  describe('findAlertByPath', () => {
    describe('when the alert is found', () => {
      describe('and there are Watch files', () => {
        it('builds alert domain object', (t) => {
          const readDirFn = mock.fn(() => [
            'watcher.commsplat.prod.json',
            'watcher.commsplat.non-prod.js'
          ]);

          const alertRepository = setup({
            readDirFn,
            readFileFn: mock.fn(() => {
              throw 'file does not exist'
            })
          });

          const alert = alertRepository.findAlertByPath('src/in-person-selling/my-alert');

          t.assert.strictEqual(alert.id, 'in-person-selling-my-alert');
          t.assert.strictEqual(alert.path, 'src/in-person-selling');
          t.assert.deepStrictEqual(alert.watchFiles, [
            {
              filename: 'watcher.commsplat.prod.json',
              type: 'json'
            },{
              filename: 'watcher.commsplat.non-prod.js',
              type: 'js'
            }
          ]);
        });
      });

      describe('when prefix is provided', () => {
        it('attachs the prefix name to the alert id', (t) => {
          const readDirFn = mock.fn(() => [
            'watcher.commsplat.prod.json',
            'watcher.commsplat.non-prod.json'
          ]);

          const alertRepository = setup({
            readDirFn,
            readFileFn: mock.fn(() => {
              throw 'file does not exist'
            }),
            prefix: 'show-da-xuxa'
          });

          const alert = alertRepository.findAlertByPath('src/in-person-selling/my-alert');

          t.assert.strictEqual(alert.id, 'show-da-xuxa-in-person-selling-my-alert');
          t.assert.strictEqual(alert.path, 'src/in-person-selling');
          t.assert.deepStrictEqual(alert.watchFiles, [
            {
              filename: 'watcher.commsplat.prod.json',
              type: 'json'
            },{
              filename: 'watcher.commsplat.non-prod.json',
              type: 'json'
            }
          ]);
        });
      })

      describe('and there are no JSON files', () => {
        it('does not build alert domain object', (t) => {
          const readDirFn = mock.fn(() => []);

          const alertRepository = setup({
            readDirFn,
            readFileFn: mock.fn(() => {
              throw 'file does not exist'
            })
          });

          t.assert.strictEqual(alertRepository.findAlertByPath('src/in-person-selling/my-alert'), null);
        });
      });

      describe('and it contains a script', () => {
        it('builds alert domain object with script', (t) => {
          const readDirFn = mock.fn(() => [
            'watcher.commsplat.prod.json',
            'watcher.commsplat.non-prod.json'
          ]);

          const alertRepository = setup({
            readDirFn,
            readFileFn: mock.fn(() => 'script content')
          });

          const alert = alertRepository.findAlertByPath('src/in-person-selling/my-alert');

          t.assert.strictEqual(alert.id, 'in-person-selling-my-alert');
          t.assert.strictEqual(alert.path, 'src/in-person-selling');
          t.assert.strictEqual(alert.hasScript(), true);
          t.assert.deepStrictEqual(alert.watchFiles, [
            {
              filename: 'watcher.commsplat.prod.json',
              type: 'json'
            },{
              filename: 'watcher.commsplat.non-prod.json',
              type: 'json'
            }
          ]);
        });
      });
    });
  });
});
