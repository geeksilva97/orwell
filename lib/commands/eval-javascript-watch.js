const path = require("node:path");
const { styleText } = require("node:util");
const { container } = require("../container");
const { accessSync, constants } = require('node:fs');
const { makeAlertsRepository } = require('../repositories/alert-repository');
const { parseWatchJSFile } = require("../../dsl/watch-js-utilities");

const fileExists = (filePath) => {
  try {
    accessSync(filePath, constants.F_OK);

    return true;
  } catch (err) {
    return false;
  }
};

function evaluateJavaScriptWatchAction(options) {
  if (!options.path) {
    container.logger.error('Path to the file is required. Define it using -p option');
    return;
  }

  if (!fileExists(options.path)) {
    container.logger.error(`The file '${options.path}' could not be found`);
    return;
  }

  const fileExtention = path.extname(options.path);

  if (fileExtention !== '.cjs' && fileExtention !== '.js') {
    if (fileExtention === '.mjs') {
      container.logger.error('ESMs are not supported, Use commonjs instead');
      return;
    }

    container.logger.error('File must be a JavaScript with extension .js or .cjs');
    return;
  }

  const pieces = options.path.split('/');
  const fullPath = path.resolve(options.path);

  process.chdir(fullPath.split('/').slice(0, -1).join('/') + '/../../..');
  container.logger.info(`Changing current directory to ${process.cwd()}`);

  const alertPath = `${pieces.at(-4)}/${pieces.at(-3)}/${pieces.at(-2)}`;
  const alertRepository = makeAlertsRepository({
    prefix: options.projectId || ''
  });

  const alert = alertRepository.findAlertByPath(alertPath);
  if (!alert) {
    container.logger.error('Unable to find the alert at: ' + fullPath);
    return;
  }

  container.logger.info('Started evaluating JavaScript file\n');
  const { watchObject } = parseWatchJSFile(fullPath, {
    alertId: alert.id,
    baseDir: `${alert.path}/${alert.name}`
  });

  container.logger.info(styleText(['cyan', 'italic'], JSON.stringify(watchObject, null, 2)));
}

function evaluateJavaScriptWatchCommand(program) {
  program.command('eval:watch')
    .description('Evaluates a JavaScript Watcher file and print out the result')
    .option('-p, --path <path>', 'Watch Js file path')
    .option('--project-id <project id>', 'Set the project id. A prefix to avoid conflicts')
    .action(evaluateJavaScriptWatchAction)
}

module.exports = evaluateJavaScriptWatchCommand;
