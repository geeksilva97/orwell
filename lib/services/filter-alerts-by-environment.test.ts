import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import { getAlertWatchersByEnvironment } from './filter-alerts-by-environment.ts';
import { Alert } from '../core/alert.ts';

describe('filter-alters-by-environment', () => {
  describe('when neither server nor environment is specified', () => {
    it('should return all watchers', (t: TestContext) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        scripts: [],
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
    it('returns watchers that match server only', (t: TestContext) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        scripts: [],
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
    it('returns watchers that match env only', (t: TestContext) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        scripts: [],
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
    it('returns watchers that match both', (t: TestContext) => {
      const alert = Alert.create({
        id: 'some-id',
        name: 'alert-name',
        path: 'some/path',
        scripts: [],
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
