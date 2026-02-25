const path = require('node:path');
const { existsSync, readFileSync } = require('node:fs');
const { styleText } = require('node:util');
const { makeHttpClient } = require('../services/http-client');
const { makeDeployWatchClient } = require('../services/deploy-watch-client');
const { makeAuthOptions } = require('../services/auth-options');
const { container } = require('../container');

function validateHeartbeatConfig(config) {
  if (!config.alerts || !Array.isArray(config.alerts)) {
    console.error('Invalid heartbeat config: alerts should be an array');

    return false;
  }

  if (!config.interval || typeof config.interval !== 'string') {
    console.error('Invalid heartbeat config: interval should be a string');

    return false;
  }

  if (!config.action || typeof config.action !== 'object') {
    console.error('Invalid heartbeat config: action should be an object');

    return false;
  }

  const slack = config.action['slack'];

  if (!slack?.path || typeof slack.path !== 'string') {
    console.error('Invalid heartbeat config: slack path should be a string at heartbeat.action.slack.path');

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
          size: 3,
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
        webhook: {
          scheme: "https",
          host: "hooks.slack.com",
          port: 443,
          method: "post",
          path: action.slack.path,
          body: '{{#toJson}}ctx.payload.message{{/toJson}}',
          params: {},
          headers: {}
        }
      }
    }
  }
}

function verbosePrint(options, text) {
  if (options.verbose) process.stdout.write(text);
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

  const orwellConfigBasePath = options.configPath ? path.resolve(options.configPath) : path.join(process.cwd(), 'orwell.js');
  verbosePrint(options, `Using config file: ${orwellConfigBasePath}`);

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

async function heartbeatDeployAction(parseConfigFn, options) {
  if (!options.baseDir) {
    container.logger.error('Please provide a base dir using --base-dir');
    return;
  }

  if (!existsSync(path.join(options.baseDir))) {
    container.logger.error('Base dir does not exist');
    return;
  }

  const orwellConfigBasePath = options.configPath ? path.resolve(options.configPath) : path.join(process.cwd(), 'orwell.js');
  verbosePrint(options, `Using config file: ${orwellConfigBasePath}`);

  let heartbeatConfig;

  try {
    const r = parseConfigFn(orwellConfigBasePath);
    heartbeatConfig = r.heartbeat;
  } catch (err) {
    container.logger.error(`Error parsing config file: ${err.message}`);
    container.logger.info('\nYou can use --config-path to specify the config file');
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
      const p = path.join(options.baseDir, alert);

      if (!existsSync(p)) throw new Error('Alert does not exist');

      const prefix = projectId ? `${projectId}-` : '';
      watchIds.push(`${prefix}${alert.replace(/\//g, '-')}`);
    }
  } catch (err) {
    container.logger.error(`All the alerts should exist in the base dir. ${alert} does not exist`);
    return;
  }

  const watch = makeWatchFromWatchIds({ interval, indices, watchIds, action });
  const watchId = projectId ? `${projectId}-heartbeat` : 'orwell-heartbeat';

  const isDryRun = options.dryRun ?? false;

  if (isDryRun) {
    container.logger.info(styleText(['yellow', 'bold'], 'DRY RUN mode — printing watcher JSON:\n'));
    container.logger.info(JSON.stringify({ id: watchId, watch }, null, 2));
    return;
  }

  options.endpoint ??= process.env.ELASTIC_ENDPOINT;
  options.apiKey ??= process.env.ELASTIC_API_KEY;
  options.username ??= process.env.ELASTIC_USERNAME;
  options.password ??= process.env.ELASTIC_PASSWORD;

  if (!options.endpoint) {
    container.logger.error('Elastic endpoint is required. Use --endpoint or set ELASTIC_ENDPOINT env var.');
    return;
  }

  if (!options.apiKey && !(options.username && options.password)) {
    container.logger.error('Authentication is required. Use --api-key or --username/--password (or corresponding env vars).');
    return;
  }

  const httpClient = makeHttpClient(`${options.endpoint}/_watcher/watch`);
  const authOptions = makeAuthOptions(options);
  const watchClient = makeDeployWatchClient({ httpClient, authOptions });

  try {
    await watchClient.deploy({ id: watchId, content: watch });
    container.logger.info(`Heartbeat watcher '${watchId}' deployed successfully!`);
  } catch (err) {
    container.logger.error(`Failed to deploy heartbeat watcher: ${err.message}`);
  }
}

function command(program) {
  program.command('heartbeat:make')
    .description('Make a heartbeat watch and print it to stdout')
    .option('--base-dir <base dir>', 'Alerts base dir')
    .option('--verbose', 'Verbose output')
    .option('--config-path <config path>', 'Path to the config file')
    .action((options) => heartbeatUpAction(require, options));

  program.command('heartbeat:deploy')
    .description('Deploy a heartbeat watcher to Elasticsearch')
    .option('--base-dir <base dir>', 'Alerts base dir')
    .option('--verbose', 'Verbose output')
    .option('--config-path <config path>', 'Path to the config file')
    .option('--endpoint <endpoint>', 'Elastic endpoint. Default: ELASTIC_ENDPOINT env var')
    .option('--api-key <api key>', 'Elastic API key. Default: ELASTIC_API_KEY env var')
    .option('--username <username>', 'Elastic username. Default: ELASTIC_USERNAME env var')
    .option('--password <password>', 'Elastic password. Default: ELASTIC_PASSWORD env var')
    .option('--dry-run', 'Print the watcher JSON without deploying')
    .action((options) => heartbeatDeployAction(require, options));
}

module.exports = { command, heartbeatUpAction, heartbeatDeployAction, makeWatchFromWatchIds };
