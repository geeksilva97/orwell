const path = require('node:path');
const { existsSync, readFileSync } = require('node:fs');

function validateHeartbeatConfig(config) {
  if (!config.alerts || !Array.isArray(config.alerts)) {
    console.error('Invalid heartbeat config: alerts should be an array');

    return false;
  }

  if (!config.interval || typeof config.interval !== 'string') {
    console.error('Invalid heartbeat config: interval should be a string');

    return false;
  }

  if (!config.action || !config.action['webhook']) {
    console.error('Invalid heartbeat config: action should contain a webhook');

    return false;
  }

  const webhook = config.action['webhook'];

  if (!webhook.scheme || !['http', 'https'].includes(webhook.scheme) || !webhook.host
    || !webhook.method || !webhook.path) {
    console.error('Invalid heartbeat config: webhook should contain scheme, host, method and path');

    return false;
  }

  return true;
}

const makeWatcherSearch = (watchId, indices) => {
  return {
    search: {
      request: {
        search_type: "query_then_fetch",
        indices,
        rest_total_hits_as_int: true,
        body: {
          size: 5,
          query: {
            match: {
              watch_id: watchId
            }
          },
          sort: [
            {
              "trigger_event.triggered_time": {
                "order": "desc"
              }
            }
          ]
        }
      }
    }
  };
};

function makeWatchFromWatchIds({ interval, indices, watchIds, action }) {
  return {
    trigger: {
      schedule: {
        interval
      }
    },
    input: {
      chain: {
        inputs: [
          {
            env: {
              simple: {
                watchIds
              }
            }
          },
        ].concat(watchIds.map((watchId) => {
          return {
            [watchId]: {
              ...makeWatcherSearch(watchId, indices)
            }
          };
        }))
      }
    },
    condition: {
      always: {}
    },
    transform: {
      chain: [
        {
          script: {
            source: readFileSync(path.join(__dirname, 'heartbeat.groovy')).toString(),
            lang: "painless"
          }
        }
      ]
    },
    actions: {
      send_slack_message: {
        condition: {
          script: {
            source: `return ctx.payload.shouldSendMessage;`,
            lang: "painless"
          }
        },
        transform: {
          script: {
            source: readFileSync(path.join(__dirname, 'heartbeat-slack.groovy')).toString(),
            lang: "painless"
          }
        },
        webhook: action.webhook
      }
    }
  }
}

function heartbeatUpAction(parseConfigFn, options) {
  if (!options.baseDir) {
    console.error('Please provide a base dir using --base-dir');

    return;
  }

  if (!existsSync(path.join(options.baseDir))) {
    console.error('Base dir does not exist');

    return;
  }

  const orwellConfigBasePath = path.resolve(options.configPath) || path.join(process.cwd(), 'orwell.js');
  // console.log(`Using config file: ${orwellConfigBasePath}`);

  let baseDir, heartbeatConfig;

  try {
    const r = parseConfigFn(orwellConfigBasePath);
    baseDir = options.baseDir;
    heartbeatConfig = r.heartbeat;
  } catch (err) {
    console.error(`Error parsing config file: ${err.message}`);
    console.log('\nYou can use --config-path to specify the config file');
    return;
  }

  if (!validateHeartbeatConfig(heartbeatConfig)) {
    return;
  }

  const { action, alerts, interval, indices, projectId } = heartbeatConfig;
  let alert;
  let watchIds = [];

  try {
    for (let i = 0; i < alerts.length; ++i) {
      alert = alerts[i];
      const p = path.join(baseDir, alert);

      if (!existsSync(p)) throw new Error('Alert does not exist');

      const prefix = projectId ? `${projectId}-` : '';

      watchIds.push(`${prefix}${alert.replace(/\//g, '-')}`);
    }
  } catch (err) {
    console.error(`All the alerts should exist in the base dir. ${alert} does not exist`);

    return;
  }

  const watch = makeWatchFromWatchIds({
    interval,
    indices,
    watchIds,
    action
  });

  console.log(JSON.stringify(watch, null, 2));
}

function command(program) {
  program.command('heartbeat:up')
    .description('Build and deploys the heartbeat alert')
    .option('--base-dir <base dir>', 'Alerts base dir')
    .option('--config-path <config path>', 'Path to the config file')
    .action((options) => heartbeatUpAction(require, options))
}

module.exports = { command, heartbeatUpAction, makeWatchFromWatchIds };
