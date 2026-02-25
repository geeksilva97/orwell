import { execSync } from 'node:child_process';
import { container } from '../container.ts';
import { AlertFactory } from '../core/alert-factory.ts';
import type { Alert } from '../core/alert.ts';

type DiffFunction = (baseDir: string, diffBranches: string) => string[];
type SyncDiffFunction = (baseDir: string, diffBranches: string) => { updated: string[]; deleted: string[] };

interface AlertRepositoryLike {
  findAlertByPath(path: string): Alert | null;
}

const gitDiff: DiffFunction = (baseDir, diffBranches) => {
  // https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
  // diff-filter=d: Excludes deleted
  const gitCommand = `git diff-tree --no-commit-id --diff-filter=d --name-only -r ${diffBranches} ${baseDir}`;

  container.logger.debug('Running git command:', gitCommand);

  const stdOut = execSync(gitCommand).toString();

  container.logger.debug(`${stdOut}\n`);

  return stdOut.split('\n');
};

const getDeleted = (baseDir: string, diffBranches: string): string[] => {
  const gitCommand = `git diff-tree --no-commit-id --diff-filter=D --name-only -r ${diffBranches} ${baseDir}`;

  container.logger.debug('Running git command:', gitCommand);

  const stdOut = execSync(gitCommand).toString();

  container.logger.debug(`${stdOut}\n`);

  return stdOut.split('\n');
};

const getChangesToSync: SyncDiffFunction = (baseDir, diffBranches) => {
  const updated = gitDiff(baseDir, diffBranches);
  const deleted = getDeleted(baseDir, diffBranches);

  return { updated, deleted };
};

export const getChangedAlerts = ({ baseDir, dirs, diffFunction, alertRepository, mainBranch, isMainBranch }: {
  baseDir: string;
  dirs: string[];
  diffFunction?: DiffFunction;
  alertRepository: AlertRepositoryLike;
  mainBranch?: string;
  isMainBranch?: boolean;
}): Alert[] => {
  const diffBranches = isMainBranch ? 'HEAD~1 HEAD' : `origin/${mainBranch} HEAD`;
  const diffFn = diffFunction ?? gitDiff;
  const diffFiles = diffFn(baseDir, diffBranches);

  const result: Record<string, Alert | null> = diffFiles.reduce<Record<string, Alert | null>>((alertsMap, currentPath) => {
    if (!currentPath) return alertsMap; // just in case it's an empty string

    const splittedDir = currentPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertId = splittedDir[2];

    if (alertId && !alertsMap[alertId] && dirs.includes(path)) {
      alertsMap[alertId] = alertRepository.findAlertByPath(`${path}/${alertId}`);
    }

    return alertsMap;
  }, {});

  return Object.values(result).filter((v): v is Alert => v != null);
};

export const getAlertsToSync = ({ baseDir, dirs, diffFunction, alertRepository, mainBranch, isMainBranch }: {
  baseDir: string;
  dirs: string[];
  diffFunction?: SyncDiffFunction;
  alertRepository: AlertRepositoryLike;
  mainBranch?: string;
  isMainBranch?: boolean;
}): [Alert[], Alert[]] => {
  const diffBranches = isMainBranch ? 'HEAD~1 HEAD' : `origin/${mainBranch} HEAD`;
  const diffFn = diffFunction ?? getChangesToSync;
  const { updated, deleted } = diffFn(baseDir, diffBranches);

  const result: Record<string, Alert | null> = updated.reduce<Record<string, Alert | null>>((alertsMap, currentPath) => {
    if (!currentPath) return alertsMap; // just in case it's an empty string

    const splittedDir = currentPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertId = splittedDir[2];

    if (alertId && !alertsMap[alertId] && dirs.includes(path)) {
      alertsMap[alertId] = alertRepository.findAlertByPath(`${path}/${alertId}`);
    }

    return alertsMap;
  }, {});


  function splitPath(alertPath: string, prefix = ''): { path: string; alertId: string; alertName: string } {
    const splittedDir = alertPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertName = splittedDir[2] ?? '';
    const alertId = `${prefix}${splittedDir[1]}-${alertName}`;

    return { path, alertId, alertName };
  }

  const alertsToDelete: Record<string, Alert> = deleted.reduce<Record<string, Alert>>((alertsMap, currentPath) => {
    if (!currentPath) return alertsMap; // just in case it's an empty string

    const splittedDir = currentPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertId = splittedDir[2] ?? '';
    const watchFile = splittedDir[3] ?? '';

    const { alertId: newAlertId, alertName } = splitPath(`${path}/${alertId}`);

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

    if (watchFile.startsWith('watcher.') && alertsMap[alertId]) {
      alertsMap[alertId] = alertsMap[alertId]!.withWatchFiles(watchFile);
    }

    return alertsMap;
  }, {});

  console.log(alertsToDelete);

  return [
    Object.values(result).filter((v): v is Alert => v != null),
    Object.values(alertsToDelete)
  ];
};
