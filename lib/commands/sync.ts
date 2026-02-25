import { execSync } from 'node:child_process';
import { styleText } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { getAlertsToSync } from '../services/diff-alerts.ts';
import { transpileScript } from '../services/transpile-painless-scripts.ts';
import { makeAlertsRepository } from '../repositories/alert-repository.ts';
import { makeDeployAlertsService } from '../services/deploy-alerts.ts';
import { container } from '../container.ts';
import { makeDeployWatch } from '../services/deploy-watch.ts';
import { makeDeployWatchClient } from '../services/deploy-watch-client.ts';
import { makeDeployScriptClient } from '../services/deploy-script-client.ts';
import { makeDeployScriptService } from '../services/deploy-script.ts';
import { makeDeleteAlertsService } from '../services/delete-alerts.ts';
import { makeHttpClient } from '../services/http-client.ts';
import { makeAuthOptions } from '../services/auth-options.ts';
import makeErrorHandler from '../errors/handler.ts';
import type { SyncOptions } from '../types.ts';
import type { Command } from 'commander';

let errorHandler: ((error: unknown) => void) | undefined;

function getErrorHandlerLazy(): (error: unknown) => void {
  if (!errorHandler) {
    errorHandler = makeErrorHandler(container.logger);
  }

  return errorHandler as (error: unknown) => void;
}

function validateInput({
  endpoint,
  apiKey,
  username,
  password
}: {
  endpoint?: string;
  apiKey?: string;
  username?: string;
  password?: string;
}): boolean {
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

async function handlePush({ deployAlertsPromise, shouldPush }: {
  deployAlertsPromise: Promise<boolean[]>;
  shouldPush: boolean;
}): Promise<void> {
  try {
    const deployAlertsResult = await deployAlertsPromise;

    if (shouldPush) {
      if (deployAlertsResult.length === 0) {
        container.logger.info('No alerts deployed!');
        return;
      }

      container.logger.info(`${deployAlertsResult.length} alerts deployed successfully!`);
    }
  } catch (error) {
    container.logger.error('Could not deploy alerts');
    getErrorHandlerLazy()(error);
  }
}

async function handleDeletion({ deleteAlertsPromise, shouldDelete }: {
  deleteAlertsPromise: Promise<boolean[]>;
  shouldDelete: boolean;
}): Promise<void> {
  try {
    const deleteAlertsResult = await deleteAlertsPromise;

    if (shouldDelete) {
      if (deleteAlertsResult.length === 0) {
        container.logger.info('No alerts deleted!');
        return;
      }

      container.logger.info(`${deleteAlertsResult.length} alerts deleted successfully!`);
    }
  } catch (error) {
    container.logger.error('Could not delete alerts');
    getErrorHandlerLazy()(error);
  }
}

async function action(options: SyncOptions): Promise<void> {
  const splittedBaseDir = options.baseDir.split('/');
  const isDryRun = options.dryRun ?? false;
  // xor operation to determine when to perform both remove and push
  const isSync = !(Boolean(options.removeOnly) !== Boolean(options.pushOnly));
  const shouldDelete = Boolean(options.removeOnly) || isSync;
  const shouldPush = Boolean(options.pushOnly) || isSync;

  options.endpoint ??= process.env.ELASTIC_ENDPOINT;
  options.apiKey ??= process.env.ELASTIC_API_KEY;
  options.username ??= process.env.ELASTIC_USERNAME;
  options.password ??= process.env.ELASTIC_PASSWORD;

  const env = {
    PROJECT_ID: options.projectId,
    ELASTIC_ENDPOINT: options.endpoint,
    ELASTIC_API_KEY: options.apiKey,
    ELASTIC_USERNAME: options.username,
    ELASTIC_PASSWORD: options.password,
    diffBranch: options.diffBranch,
    baseDir: splittedBaseDir[splittedBaseDir.length - 1] ?? '',
    absoluteBaseDir: path.resolve(splittedBaseDir.slice(0, -1).join('/') || '.'),
  };

  if (!validateInput(options)) return;

  process.chdir(env.absoluteBaseDir);
  container.logger.info(`Changing current directory to ${env.absoluteBaseDir}`);

  let diffBranch: string;
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD');
    diffBranch = out.toString().trim();
  } catch {
    process.stderr.write(`Could not find the current branch at the directory '${env.absoluteBaseDir}'. Seems like it's not a git repository`);
    return;
  }

  const isMainBranch = diffBranch === options.mainBranch;
  if (!isMainBranch) {
    try {
      execSync(`git fetch origin ${options.mainBranch} --depth=2`);
    } catch {
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
    .reduce<string[]>((acc, item) => {
      const itemPath = `${env.baseDir}/${item}`;

      if (item !== 'shared' && fs.statSync(itemPath).isDirectory()) {
        acc.push(itemPath);
      }

      return acc;
    }, []);

  const [alerts, alertsToDelete] = getAlertsToSync({
    baseDir: env.absoluteBaseDir,
    dirs: DIRS,
    alertRepository,
    mainBranch: options.mainBranch,
    isMainBranch,
  });

  const printDryRunText = (text: string[], color: Parameters<typeof styleText>[0] = 'cyan'): void => {
    text.forEach((t) => container.logger.info(styleText(color, t)));
  };

  const dryRunWatchHttpClient = {
    put: (id: string, content: unknown, authOpts: { headers?: Record<string, string> }) => {
      printDryRunText([
        '\n\n============= DEPLOYING WATCHER ===============\n',
        `HTTP PUT ${options.endpoint}/_watcher/watch${id}`,
        `AUTH HEADER: ${JSON.stringify(authOpts.headers)}`,
        `BODY: ${JSON.stringify(content, null, 2)}`,
        '\n============= FINISHED DEPLOYING WATCHER ===============\n\n'
      ]);
      return Promise.resolve();
    },
    delete: (id: string, authOpts: { headers?: Record<string, string> }) => {
      printDryRunText([
        '\n\n============= DELETING WATCHER ===============\n',
        `HTTP DELETE ${options.endpoint}/_watcher/watch${id}`,
        `AUTH HEADER: ${JSON.stringify(authOpts.headers)}`,
        '\n============= FINISHED DELETING WATCHER ===============\n\n'
      ]);
      return Promise.resolve(true);
    }
  };

  const dryRunScriptHttpClient = {
    post: (id: string, content: unknown, authOpts: { headers?: Record<string, string> }) => {
      printDryRunText([
        '\n\n============= DEPLOYING SCRIPT ===============\n',
        `HTTP POST ${options.endpoint}/_watcher/watch${id}`,
        `AUTH HEADER: ${JSON.stringify(authOpts.headers)}`,
        `BODY: ${JSON.stringify(content, null, 2)}`,
        '\n============= FINISHED DEPLOYING SCRIPT ===============\n\n'
      ], 'green');
      return Promise.resolve();
    }
  };

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
  const deployWatchService = makeDeployWatch({ deployWatchClient: watchClient });
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

  const deleteAlertsService = makeDeleteAlertsService({
    alerts: alertsToDelete,
    scriptDeployer: deployScriptService,
    watchDeployer: deployWatchService
  });

  const [serverTarget, envTarget] = (options.target ?? '').split('.');

  const deleteAlertsPromise = shouldDelete ? deleteAlertsService.execute() : Promise.resolve<boolean[]>([]);
  const deployAlertsPromise = shouldPush ? deployAlertsService.execute({ envTarget, serverTarget }) : Promise.resolve<boolean[]>([]);

  if (isDryRun) {
    await Promise.allSettled([deployAlertsPromise, deleteAlertsPromise]);
    container.logger.info(styleText(['yellow', 'bold'], '\nFinished execution in DRY RUN mode! No resource was actually pushed to Elastic. To actually push it, run the latest command but wirhout the --dry-run option'));
    return;
  }

  await handlePush({
    deployAlertsPromise,
    shouldPush,
  });

  await handleDeletion({
    deleteAlertsPromise,
    shouldDelete,
  });
}

export function command(program: Command): void {
  program.command('sync')
    .description('Syncs the alerts with the Elastic server')
    .option('-b, --diff-branch <diff branch name>', 'Branch to compare with. Default is current branch')
    .option('-p, --project-id <project id>', 'Project ID to avoid conflicts')
    .option('--base-dir <alerts base dir>', 'Base directory for alerts. Default is src', 'src')
    .option('--main-branch <main branch name>', 'Main branch name. Default is main', 'main')
    .option('--dry-run', 'Dry run the push')
    .option('--remove-only', 'Only delete alerts')
    .option('--push-only', 'Only pushes changed alerts')
    .option('--endpoint <endpoint>', 'Elastic endpoint where watchers and scripts will be sent to. Default: ELASTIC_ENDPOINT env var')
    .option('--api-key <api key>', 'Elastic Api Key to athenticate the request. Default: ELASTIC_API_KEY env var')
    .option('--username <username>', 'Elastic username to authenticate the request. Default: ELASTIC_USERNAME env var')
    .option('--password <password>', 'Elastic password to authenticate the request. Default: ELASTIC_PASSWORD env var')
    .option('--target <target>', 'Pattern to specicy which alerts to pick (e.g. commsplat.non-prod, gopaydev.prod)')
    .action(action);
}
