const { execSync } = require('node:child_process');
const { styleText } = require('node:util');
const path = require('node:path');
const fs = require('node:fs');
const { getChangedAlerts } = require('../services/diff-alerts');
const { transpileScript } = require('../services/transpile-painless-scripts');
const { makeAlertsRepository } = require('../repositories/alert-repository');
const { makeDeployAlertsService } = require('../services/deploy-alerts');
const { container } = require('../container');
const { makeDeployWatch } = require('../services/deploy-watch');
const { makeDeployWatchClient } = require('../services/deploy-watch-client');
const { makeDeployScriptClient } = require('../services/deploy-script-client');
const { makeDeployScriptService } = require('../services/deploy-script');
const { makeHttpClient } = require('../services/http-client');
const makeErrorHandler = require('../errors/handler');

let errorHandler;

function getErrorHandlerLazy() {
  if (!errorHandler) {
    errorHandler = makeErrorHandler(container.logger);
  }

  return errorHandler;
}

const makeAuthOptions = ({ apiKey, username, password }) => {
  if (apiKey) {
    return {
      headers: {
        Authorization: `ApiKey ${apiKey}`
      }
    };
  }

  return {
    auth: {
      username,
      password
    }
  };
};

function validateInput({
  projectId,
  endpoint,
  apiKey,
  username,
  password
}) {
  if (!projectId) {
    container.logger.error('You must set the PROJECT ID to avoid conflicting alerts with other projects in the same Elastic instance. Use the -p option (e.g. orwell -p myproject-id)');
    return false;
  }

  if (!endpoint) {
    container.logger.error('You must set the Elastic Endpoint to where the watcher and scripts will be sent to. (e.g. orwell --endpoint http://myelasticinstance:1234)');
    return false;
  }

  if (!Boolean(apiKey) && !(Boolean(username) && Boolean(password))) {
    container.logger.error('Authentication option is required. You can either use an Api Key (option --api-key) or username and password (options --username and --password).');
    return false;
  }

  return true;
}

module.exports = function(options) {
  const splittedBaseDir = options.baseDir.split('/');
  const isDryRun = options.dryRun ?? false;

  options.endpoint ??= process.env.ELASTIC_ENDPOINT;
  options.apiKey ??= process.env.ELASTIC_API_KEY;
  options.username ??= process.env.ELASTIC_USERNAME;
  options.password ??= process.env.ELASTIC_PASSWORD;

  let env = {
    PROJECT_ID: options.projectId,
    ELASTIC_ENDPOINT: options.endpoint,
    ELASTIC_API_KEY: options.apiKey,
    ELASTIC_USERNAME: options.username,
    ELASTIC_PASSWORD: options.password,
    diffBranch: options.diffBranch,
    baseDir: splittedBaseDir[splittedBaseDir.length - 1],
    absoluteBaseDir: path.resolve(splittedBaseDir.slice(0, -1).join('/') || '.'),
  };

  if (!validateInput(options)) return;

  // Change to the base directory
  process.chdir(env.absoluteBaseDir);
  container.logger.info(`Changing current directory to ${env.absoluteBaseDir}`);

  // check if the directory is a git repository
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD');
    env.diffBranch = out.toString().trim();
  } catch (error) {
    process.stderr.write(`Could not find the current branch at the directory '${env.absoluteBaseDir}'. Seems like it's not a git repository`);
    return;
  }

  // If current branch is not the main branch, fetch the main branch
  const isMainBranch = env.diffBranch === options.mainBranch;
  if (!isMainBranch) {
    // Checkout main branch
    try {
      execSync(`git fetch origin ${options.mainBranch} --depth=2`);
    } catch (error) {
      process.stderr.write(`Unable to fetch the main branch '${options.mainBranch}'`);
      return;
    }
  }

  if (isDryRun) {
    container.logger.info(styleText(['yellow', 'bold'], 'Starting execution in DRY RUN mode!\n'));
  }

  const alertRepository = makeAlertsRepository({
    prefix: env.PROJECT_ID
  });

  const DIRS = fs.readdirSync(env.baseDir)
    .reduce((acc, item) => {
      const itemPath = `${env.baseDir}/${item}`;

      if (item !== 'shared' && fs.statSync(itemPath).isDirectory()) {
        acc.push(itemPath);
      }

      return acc;
    }, []);

  const alerts = getChangedAlerts({
    baseDir: env.absoluteBaseDir,
    dirs: DIRS,
    alertRepository,
    mainBranch: options.mainBranch,
  });

  const printDryRunText = (text, color = 'cyan') => {
    text.forEach((t) => container.logger.info(styleText([color], t)));
  };

  const dryRunWatchHttpClient = {
    put: (id, content, { headers }) => {
      printDryRunText([
        '\n\n============= DEPLOYING WATCHER ===============\n',
        `HTTP PUT ${options.endpoint}/_watcher/watch${id}`,
        `AUTH HEADER: ${JSON.stringify(headers)}`,
        `BODY: ${JSON.stringify(content, null, 2)}`,
        '\n============= FINISHED DEPLOYING WATCHER ===============\n\n'
      ])
    }
  };

  const dryRunScriptHttpClient = {
    post: (id, content, { headers }) => {
      printDryRunText([
        '\n\n============= DEPLOYING SCRIPT ===============\n',
        `HTTP POST ${options.endpoint}/_watcher/watch${id}`,
        `AUTH HEADER: ${JSON.stringify(headers)}`,
        `BODY: ${JSON.stringify(content, null, 2)}`,
        '\n============= FINISHED DEPLOYING SCRIPT ===============\n\n'
      ], 'green');
    }
  };

  // TODO: make http clients creation this lazy
  const watchHttpClient = makeHttpClient(`${env.ELASTIC_ENDPOINT}/_watcher/watch`);
  const scriptHttpClient = makeHttpClient(`${env.ELASTIC_ENDPOINT}/_scripts`);
  const authOptions = makeAuthOptions(options);
  const watchClient = makeDeployWatchClient({
    httpClient: isDryRun ? dryRunWatchHttpClient : watchHttpClient,
    authOptions
  });
  const scriptClient = makeDeployScriptClient({
    httpClient: isDryRun ? dryRunScriptHttpClient : scriptHttpClient,
    authOptions
  });
  const deployWatchService = makeDeployWatch({ deployWatchClient: watchClient, env });
  const deployScriptService = makeDeployScriptService({
    deployScriptClient: scriptClient,
    transpileService: {
      transpile: transpileScript
    }
  });

  const deployAlertsService = makeDeployAlertsService({
    alerts,
    scriptDeployer: deployScriptService,
    watchDeployer: deployWatchService
  });

  const [serverTarget, envTarget] = (options.target ?? '').split('.');

  deployAlertsService.execute({
    envTarget,
    serverTarget
  }).then(info => {
    if (isDryRun) {
      container.logger.info(styleText(['yellow', 'bold'], '\nFinished execution in DRY RUN mode! No resource was actually pushed to Elastic. To actually push it, run the latest command but wirhout the --dry-run option'));
      return;
    }

    if (info.length === 0) {
      container.logger.info('No alerts deployed!');
      return
    }

    container.logger.info(`${info.length} alerts deployed successfully!`);
  })
    .catch(getErrorHandlerLazy());
}
