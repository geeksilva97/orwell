const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { container: { logger } } = require('../lib/container');

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function createFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`Created file: ${filePath}`);
  }
}

function makeAction({ createFile, createDirectory }) {
  return function action(options) {
    const groupName = options.groupName || 'alert-group';
    const alertBaseDir = options.baseDir || 'src';
    const server = options.server;
    const name = options.name;
    const dest = options.dest;

    if (!name) {
      console.error('Please provide an alert name using -n or --name');
      process.exit(1);
    }

    // Define paths
    const baseDir = dest || process.cwd();
    const srcDir = path.join(baseDir, alertBaseDir);
    const alertGroupDir = path.join(srcDir, groupName);
    const sharedDir = path.join(srcDir, 'shared');
    const alertDir = path.join(alertGroupDir, name);

    const watcherFile = path.join(alertDir, `watcher.non-prod.json`);
    const scriptFile = path.join(alertDir, 'script.groovy');
    const sharedScriptFile = path.join(sharedDir, 'shared.groovy');

    // Create directories and files
    createDirectory(srcDir);
    createDirectory(alertGroupDir);
    createDirectory(alertDir);
    createDirectory(sharedDir);

    const scaffoldSharedFileLocation = path.resolve(__dirname, '../lib/scaffold/shared.groovy');
    const scaffoldWatchJSONFileLocation = path.resolve(__dirname, '../lib/scaffold/watcher.sample.json');
    const sharedFileContent = fs.readFileSync(scaffoldSharedFileLocation, 'utf8');
    const watcherFileContent = fs.readFileSync(scaffoldWatchJSONFileLocation, 'utf8')
      .toString()
      .replace('{{alertId}}', name);

    createFile(watcherFile, watcherFileContent.toString());
    createFile(sharedScriptFile, sharedFileContent.toString());
    createFile(scriptFile, '#include "../../shared/shared.groovy"');

    if (options.git) {
      process.chdir(baseDir);
      execSync('git init');
    }

    logger.info(`Project structure scaffolded successfully at ${alertDir}`);
  }
}

function command(program) {
  program.command('scaffold')
    .description('Scaffold alerts project structure')
    .option('-g, --group-name <group name>', 'Name of the alert grouping')
    .option('--base-dir <alerts base dir>', 'Base directory for alerts. Default is src')
    .option('--dest <project destination>', 'Destination directory for the project. Default is current directory')
    .option('-n, --name <name>', 'Name of the alert')
    .option('--no-git', 'To skip git repository initialization')
    .action(makeAction({
      createFile,
      createDirectory
    }));
}

module.exports = {
  command,
  action,
  makeAction
};
