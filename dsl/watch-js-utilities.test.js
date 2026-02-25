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

  it('parses a DSL watcher with markdown message and compiles body as JSON string', (t) => {
    const jsCodePath = path.resolve(__dirname, '../test/fixtures/markdown-alert/watcher.dsl.js');
    const { watchObject } = parseWatchJSFile(jsCodePath, {
      alertId: 'markdown-alert',
      baseDir: path.resolve(__dirname, '../test/fixtures/markdown-alert'),
    });

    const normalized = normalize(watchObject);
    const webhook = normalized.actions.send_slack_message.webhook;

    t.assert.strictEqual(typeof webhook.body, 'string');
    t.assert.deepStrictEqual(webhook.headers, { 'Content-Type': 'application/json' });

    const parsed = JSON.parse(webhook.body);
    t.assert.ok(Array.isArray(parsed.blocks));

    // header with mustache placeholder
    t.assert.strictEqual(parsed.blocks[0].type, 'header');
    t.assert.strictEqual(parsed.blocks[0].text.text, '{{ctx.payload.count}} Failures Detected');

    // section with bold mustache
    t.assert.strictEqual(parsed.blocks[1].type, 'section');
    t.assert.ok(parsed.blocks[1].text.text.includes('*{{ctx.payload.service}}*'));

    // divider
    const dividers = parsed.blocks.filter((b) => b.type === 'divider');
    t.assert.strictEqual(dividers.length, 1);

    // actions and context from options
    const actions = parsed.blocks.filter((b) => b.type === 'actions');
    t.assert.strictEqual(actions.length, 1);
    t.assert.strictEqual(actions[0].elements[0].url, '{{ctx.payload.logsUrl}}');

    const context = parsed.blocks.filter((b) => b.type === 'context');
    t.assert.strictEqual(context.length, 1);
  });
});
