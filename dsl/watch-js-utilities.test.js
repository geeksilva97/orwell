const path = require('node:path');
const { parseWatchJSFile } = require('./watch-js-utilities');

describe('watch-js-utilities', () => {
  it('parses watch as a javascript file with script function', () => {
    const jsCodePath = path.resolve(__dirname, './watcher.sample.js');
    const { watchObject: watch, scripts } = parseWatchJSFile(jsCodePath, {
      alertId: 'my-alert'
    });

    const foundScripts = Object.keys(scripts);

    expect(watch.actions.send_slack_message.webhook).toEqual({
      host: 'afakehost',
      scheme: 'https'
    });

    expect(foundScripts).toEqual([
      'my-alert-transform',
      'my-alert-condition'
    ]);

    expect(watch.condition).toEqual({
      script: {
        id: 'my-alert-condition'
      }
    });
    expect(watch.actions.send_slack_message.transform).toEqual({
      script: {
        id: 'my-alert-transform'
      }
    });
    expect(watch.transform.chain[0]).toEqual({
      script: {
        id: 'my-alert-transform'
      }
    });
  });
});
