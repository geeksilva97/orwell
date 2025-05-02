const { execSync } = require('node:child_process');
const { container } = require('../container');
const { AlertFactory } = require('../core/alert-factory');

/*
 * gitDiff
 * @param {string} baseDir - The base directory to compare against
 * @param {string} diffBranches - The branches to compare against
 * @returns {string[]} - An array of changed files
 */
const gitDiff = (baseDir, diffBranches) => {
  // https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
  // diff-filter=d: Excludes deleted
  const gitCommand = `git diff-tree --no-commit-id --diff-filter=d --name-only -r ${diffBranches} ${baseDir}`;

  container.logger.debug('Running git command:', gitCommand);

  const stdOut = execSync(gitCommand).toString();

  container.logger.debug(`${stdOut}\n`);

  return stdOut.split('\n');
};

const getDeleted = (baseDir, diffBranches) => {
  const gitCommand = `git diff-tree --no-commit-id --diff-filter=D --name-only -r ${diffBranches} ${baseDir}`;

  container.logger.debug('Running git command:', gitCommand);

  const stdOut = execSync(gitCommand).toString();

  container.logger.debug(`${stdOut}\n`);

  return stdOut.split('\n');
};

const getChangesToSync = (baseDir, diffBranches) => {
  const updated = gitDiff(baseDir, diffBranches);
  const deleted = getDeleted(baseDir, diffBranches);

  return { updated, deleted };
};

/*
 * getChangedAlerts
 * @param {Object} params
 * @param {string} params.baseDir - The base directory to compare against
 * @param {string[]} params.dirs - The directories to look for alerts
 * @param {Function} params.diffFunction - The function to use to get the diff
 * @returns {Alert[]} - An array of changed alerts
 */
module.exports.getChangedAlerts = ({ baseDir, dirs, diffFunction, alertRepository, mainBranch }) => {
  const diffBranches = global?.env?.IS_MAIN_BRANCH ? 'HEAD~1 HEAD' : `origin/${mainBranch} HEAD`;
  const diffFn = diffFunction || gitDiff;
  const diffFiles = diffFn(baseDir, diffBranches);

  const result = diffFiles.reduce((alertsMap, currentPath) => {
    if (!currentPath) return alertsMap; // just in case it's an empty string

    const splittedDir = currentPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertId = splittedDir[2];

    if (!alertsMap[alertId] && dirs.includes(path)) {
      alertsMap[alertId] = alertRepository.findAlertByPath(`${path}/${alertId}`);
    }

    return alertsMap;
  }, {});

  return Object.values(result);
};

/*
 * getAlertsToSync
 * @param {Object} params
 * @param {string} params.baseDir - The base directory to compare against
 * @param {string[]} params.dirs - The directories to look for alerts
 * @param {Function} params.diffFunction - The function to use to get the diff
 * @returns {Alert[]} - An array of changed alerts
 */
module.exports.getAlertsToSync = ({ baseDir, dirs, diffFunction, alertRepository, mainBranch }) => {
  const diffBranches = global?.env?.IS_MAIN_BRANCH ? 'HEAD~1 HEAD' : `origin/${mainBranch} HEAD`;
  const diffFn = diffFunction || getChangesToSync;
  const { updated, deleted } = diffFn(baseDir, diffBranches);

  const result = updated.reduce((alertsMap, currentPath) => {
    if (!currentPath) return alertsMap; // just in case it's an empty string

    const splittedDir = currentPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertId = splittedDir[2];

    if (!alertsMap[alertId] && dirs.includes(path)) {
      alertsMap[alertId] = alertRepository.findAlertByPath(`${path}/${alertId}`);
    }

    return alertsMap;
  }, {});


  function splitPath(alertPath, prefix = '') {
    const splittedDir = alertPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertName = splittedDir[2];
    const alertId = `${prefix}${splittedDir[1]}-${alertName}`;

    return { path, alertId, alertName };
  }

  let scriptData;
  const alertsToDelete = deleted.reduce((alertsMap, currentPath) => {
    if (!currentPath) return alertsMap; // just in case it's an empty string

    const splittedDir = currentPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertId = splittedDir[2];
    const watchFile = splittedDir[3];

    const { alertId: newAlertId, alertName } = splitPath(`${path}/${alertId}`); // Assuming this is a method in the same class

    if (!alertsMap[alertId] && dirs.includes(path) && watchFile.startsWith('watcher.')) {
      alertsMap[alertId] = AlertFactory.build({
        alertData: {
          id: newAlertId,
          name: alertName,
          path,
          watchFiles: [watchFile]
        }
      });
    }

    if (watchFile.startsWith('watcher.')) {
      alertsMap[alertId] = alertsMap[alertId].withWatchFiles(watchFile);
    }

    // TODO: add support to scripts

    return alertsMap;
  }, {});

  console.log(alertsToDelete)

  return [Object.values(result), Object.values(alertsToDelete)];
};
