const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { getChangedAlerts } = require('../services/diff-alerts');
const { makeAlertsRepository } = require('../repositories/alert-repository');

module.exports = function (options) {
  const splittedBaseDir = options.baseDir.split('/');
  let env = {
    PROJECT_ID: options.projectId,
    diffBranch: options.diffBranch,
    baseDir: splittedBaseDir[splittedBaseDir.length - 1],
    absoluteBaseDir: path.resolve(splittedBaseDir.slice(0, -1).join('/')),
  };

  // Change to the base directory
  process.chdir(env.absoluteBaseDir);

  // check if the directory is a git repository
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD');
    env.diffBranch = out.toString().trim();
  } catch (error) {
    process.stderr.write(`The directory '${env.absoluteBaseDir}' is not a git repository`);
    return;
  }

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

  const alertRepository = makeAlertsRepository({
    prefix: env.PROJECT_ID
  });

  const DIRS = fs.readdirSync(env.baseDir)
    .filter(item => {
      // shared folder is a special folder that contains shared scripts, it's not an alert
      return item !== 'shared' && fs.statSync(`${env.baseDir}/${item}`).isDirectory()
    })
    .map(item => `${env.baseDir}/${item}`);

  const alerts = getChangedAlerts({
    baseDir: env.absoluteBaseDir,
    dirs: DIRS,
    alertRepository,
    mainBranch: options.mainBranch,
  });

  console.log(JSON.stringify(alerts, null, 2));
}
