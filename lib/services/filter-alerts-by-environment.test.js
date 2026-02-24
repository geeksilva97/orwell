const { describe, it } = require('node:test');
const { getAlertWatchersByEnvironment } = require('./filter-alerts-by-environment');
const { Alert } = require('../core/alert');

describe('filter-alters-by-environment', () => {
  describe('when neither server nor environment is specified', () => {
    it('should return all watchers', (t) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        watchFiles: [
          { filename: 'watcher.otherserver.js', type: 'js' },
          { filename: 'watcher.someserver.test.js', type: 'js' },
          { filename: 'watcher.someserver.dev.js', type: 'js' },
          { filename: 'watcher.json', type: 'json' }
        ]
      });

      const result = getAlertWatchersByEnvironment(alert);

      t.assert.deepStrictEqual(result, [
        { filename: 'watcher.otherserver.js', type: 'js' },
        { filename: 'watcher.someserver.test.js', type: 'js' },
        { filename: 'watcher.someserver.dev.js', type: 'js' },
        { filename: 'watcher.json', type: 'json' }
      ]);
    });
  });

  describe('when server name is specified', () => {
    it('returns watchers that match server only', (t) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        watchFiles: [
          { filename: 'watcher.otherserver.js', type: 'js' },
          { filename: 'watcher.someserver.test.js', type: 'js' },
          { filename: 'watcher.someserver.dev.js', type: 'js' },
          { filename: 'watcher.json', type: 'json' }
        ]
      });

      const result = getAlertWatchersByEnvironment(alert, {
        serverName: 'someserver'
      });

      t.assert.deepStrictEqual(result, [
        { filename: 'watcher.someserver.test.js', type: 'js' },
        { filename: 'watcher.someserver.dev.js', type: 'js' },
        { filename: 'watcher.json', type: 'json' }
      ]);
    });
  });

  describe('when environment is specified', () => {
    it('returns watchers that match env only', (t) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        watchFiles: [
          { filename: 'watcher.otherserver.test.js', type: 'js' },
          { filename: 'watcher.someserver.test.js', type: 'js' },
          { filename: 'watcher.someserver.dev.js', type: 'js' },
          { filename: 'watcher.json', type: 'json' }
        ]
      });

      const result = getAlertWatchersByEnvironment(alert, {
        env: 'test'
      });

      t.assert.deepStrictEqual(result, [
        { filename: 'watcher.otherserver.test.js', type: 'js' },
        { filename: 'watcher.someserver.test.js', type: 'js' },
        { filename: 'watcher.json', type: 'json' }
      ]);
    });
  });

  describe('when environment and server are provided', () => {
    it('returns watchers that match both', (t) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        watchFiles: [
          { filename: 'watcher.otherserver.test.js', type: 'js' },
          { filename: 'watcher.someserver.test.js', type: 'js' },
          { filename: 'watcher.someserver.dev.js', type: 'js' },
          { filename: 'watcher.json', type: 'json' }
        ]
      });

      const result = getAlertWatchersByEnvironment(alert, {
        env: 'test',
        serverName: 'someserver'
      });

      t.assert.deepStrictEqual(result, [
        { filename: 'watcher.someserver.test.js', type: 'js' },
        { filename: 'watcher.json', type: 'json' }
      ]);
    });
  });
});
