const { execSync } = require('node:child_process');

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
  const stdOut = execSync(gitCommand).toString();

  return stdOut.split('\n');
};

/*
 * getChangedAlerts
 * @param {Object} params
 * @param {string} params.baseDir - The base directory to compare against
 * @param {string[]} params.dirs - The directories to look for alerts
 * @param {Function} params.diffFunction - The function to use to get the diff
 * @returns {Alert[]} - An array of changed alerts
 */
module.exports.getChangedAlerts = ({ baseDir, dirs, diffFunction, alertRepository, mainBranch}) => {
  const diffBranches = global?.env?.IS_MAIN_BRANCH ? 'HEAD~1 HEAD' : `origin/${mainBranch} HEAD`;
  const diffFn = diffFunction || gitDiff;
  const diffFiles = diffFn(baseDir, diffBranches);

  const result = diffFiles.reduce((alertsMap, currentPath) => {
    if (!currentPath) return alertsMap; // just in case it's an empty string

    const splittedDir = currentPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertId = splittedDir[2];
    console.log({path, alertId, dirs, currentPath})

    if (!alertsMap[alertId] && dirs.includes(path)) {
      alertsMap[alertId] = 'blah'; //alertRepository.findAlertByPath(`${path}/${alertId}`);
    }

    return alertsMap;
  }, {});

  console.log({result})

  return Object.values(result);
};
