#!/usr/bin/env node

import { createRequire } from 'node:module';
import { program } from 'commander';
import pushAction from '../lib/commands/push.ts';
import evaluateJavaScriptWatchCommand from '../lib/commands/eval-javascript-watch.ts';
import { command as heartbeatCommand } from '../lib/commands/heartbeat.ts';
import { command as syncCommand } from '../lib/commands/sync.ts';
import { command as scaffoldCommand } from '../lib/commands/scaffold/index.ts';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

program
  .version(version)
  .description('Orwell CLI');

program.command('push')
  .description('Push alerts to the server')
  .option('-b, --diff-branch <diff branch name>', 'Branch to compare with. Default is current branch')
  .option('-p, --project-id <project id>', 'Project ID to avoid conflicts')
  .option('--base-dir <alerts base dir>', 'Base directory for alerts. Default is src', 'src')
  .option('--main-branch <main branch name>', 'Main branch name. Default is main', 'main')
  .option('--dry-run', 'Dry run the push')
  .option('--endpoint <endpoint>', 'Elastic endpoint where watchers and scripts will be sent to. Default: ELASTIC_ENDPOINT env var')
  .option('--api-key <api key>', 'Elastic Api Key to athenticate the request. Default: ELASTIC_API_KEY env var')
  .option('--username <username>', 'Elastic username to authenticate the request. Default: ELASTIC_USERNAME env var')
  .option('--password <password>', 'Elastic password to authenticate the request. Default: ELASTIC_PASSWORD env var')
  .option('--target <target>', 'Pattern to specicy which alerts to pick (e.g. commsplat.non-prod, gopaydev.prod)')
  .action(pushAction);

evaluateJavaScriptWatchCommand(program);
heartbeatCommand(program);
syncCommand(program);
scaffoldCommand(program);

program.parse(process.argv);
