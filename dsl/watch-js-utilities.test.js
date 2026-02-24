const path = require('node:path');
const { describe, it } = require('node:test');
const { parseWatchJSFile } = require('./watch-js-utilities');

// Objects created inside a VM context have a different Object.prototype,
// so deepStrictEqual fails even when structures match. JSON round-trip
// normalises prototypes back to the main context.
const normalize = (obj) => JSON.parse(JSON.stringify(obj));

describe('watch-js-utilities', () => {
  it('parses watch as a javascript file with script function (legacy)', (t) => {
    const jsCodePath = path.resolve(__dirname, './watcher.sample.js');
    const { watchObject: watch, scripts } = parseWatchJSFile(jsCodePath, {
      alertId: 'my-alert'
    });

    const foundScripts = Object.keys(scripts);

    t.assert.deepStrictEqual(normalize(watch.actions.send_slack_message.webhook), {
      host: 'afakehost',
      scheme: 'https'
    });

    t.assert.deepStrictEqual(foundScripts, [
      'my-alert-transform',
      'my-alert-condition'
    ]);

    t.assert.deepStrictEqual(normalize(watch.condition), {
      script: {
        id: 'my-alert-condition'
      }
    });
    t.assert.deepStrictEqual(normalize(watch.actions.send_slack_message.transform), {
      script: {
        id: 'my-alert-transform'
      }
    });
    t.assert.deepStrictEqual(normalize(watch.transform.chain[0]), {
      script: {
        id: 'my-alert-transform'
      }
    });
  });

  it('parses a DSL watcher file and compiles to correct JSON', (t) => {
    const jsCodePath = path.resolve(__dirname, '../test/fixtures/my-js-alert/watcher.dsl.js');
    const expectedOutput = require('../test/fixtures/my-js-alert/compiled-watcher.dsl.json');
    const { watchObject, scripts } = parseWatchJSFile(jsCodePath, {
      alertId: 'my-js-alert',
      baseDir: path.resolve(__dirname, '../test/fixtures/my-js-alert'),
    });

    t.assert.deepStrictEqual(normalize(watchObject), expectedOutput);

    const foundScripts = Object.keys(scripts);
    t.assert.ok(foundScripts.includes('my-js-alert-transform'));
  });
});
