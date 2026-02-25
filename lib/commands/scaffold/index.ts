import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { container } from '../../container.ts';

const { logger } = container;
import type { Command } from 'commander';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function createFile(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`Created file: ${filePath}`);
  }
}

interface ScaffoldOptions {
  groupName?: string;
  baseDir?: string;
  name?: string;
  dest?: string;
  git?: boolean;
}

interface ScaffoldDeps {
  createFile: (filePath: string, content: string) => void;
  createDirectory: (dirPath: string) => void;
}

export function makeAction({ createFile, createDirectory }: ScaffoldDeps): (options: ScaffoldOptions) => void {
  return function action(options: ScaffoldOptions): void {
    const groupName = options.groupName ?? 'alert-group';
    const alertBaseDir = options.baseDir ?? 'src';
    const name = options.name;
    const dest = options.dest;

    if (!name) {
      console.error('Please provide an alert name using -n or --name');
      process.exit(1);
    }

    const baseDir = dest ?? process.cwd();
    const srcDir = path.join(baseDir, alertBaseDir);
    const alertGroupDir = path.join(srcDir, groupName);
    const sharedDir = path.join(srcDir, 'shared');
    const alertDir = path.join(alertGroupDir, name);

    const watcherFile = path.join(alertDir, `watcher.non-prod.json`);
    const scriptFile = path.join(alertDir, 'script.groovy');
    const sharedScriptFile = path.join(sharedDir, 'shared.groovy');

    createDirectory(srcDir);
    createDirectory(alertGroupDir);
    createDirectory(alertDir);
    createDirectory(sharedDir);

    const scaffoldSharedFileLocation = path.resolve(__dirname, '../../scaffold/shared.groovy');
    const scaffoldWatchJSONFileLocation = path.resolve(__dirname, '../../scaffold/watcher.sample.json');
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
  };
}

export function command(program: Command): void {
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
