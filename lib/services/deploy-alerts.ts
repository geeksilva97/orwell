import { readFile } from 'node:fs/promises';
import { parseWatchJSFile } from '../../dsl/watch-js-utilities.ts';
import { container } from '../container.ts';
import { getAlertWatchersByEnvironment } from './filter-alerts-by-environment.ts';
import type { Alert } from '../core/alert.ts';
import type { WatchFile } from '../types.ts';

interface ScriptDeployerLike {
  deploy(alert: {
    id: string;
    path: string;
    scripts: Array<{ id: string; content: string }>;
  }, scriptId: string): Promise<void>;
}

interface WatchDeployerLike {
  deploy(alert: { id: string; name: string; path: string; watchFiles: WatchFile[] }): Promise<void>;
  deployWatchAsObject(watchObject: Record<string, unknown>, alertId: string): Promise<void>;
}

class DeployAlerts {
  #alerts: Alert[];
  #scriptDeployer: ScriptDeployerLike;
  #watchDeployer: WatchDeployerLike;

  constructor({
    alerts,
    scriptDeployer,
    watchDeployer
  }: {
    alerts: Alert[];
    scriptDeployer: ScriptDeployerLike;
    watchDeployer: WatchDeployerLike;
  }) {
    this.#alerts = alerts;
    this.#scriptDeployer = scriptDeployer;
    this.#watchDeployer = watchDeployer;
  }

  async execute({
    envTarget,
    serverTarget
  }: {
    envTarget?: string;
    serverTarget?: string;
  }): Promise<boolean[]> {
    const alertDeploymentInfo: boolean[] = [];

    for (const alert of this.#alerts) {
      const alertWatchJSONFiles = this.#getAlertWatchJSONFiles(alert, { envTarget, serverTarget });

      if (alertWatchJSONFiles.length !== 1) {
        container.logger.warn(`Alert ${alert.id} skipped: it must have exactly one watcher file for the environment "${envTarget}" and server "${serverTarget}". Found ${alertWatchJSONFiles.length} files.`);

        continue;
      }

      const alertWatchJSONFile = alertWatchJSONFiles[0]!;

      container.logger.startGroup(`Deploying alert ${alert.id}\n`);

      if (alertWatchJSONFile.type === 'js') {
        container.logger.debug(JSON.stringify(alert, null, 2));

        const { watchObject, scripts } = parseWatchJSFile(`${alert.path}/${alert.name}/${alertWatchJSONFile.filename}`, {
          alertId: alert.id,
          baseDir: `${alert.path}/${alert.name}`
        });

        container.logger.debug(JSON.stringify({ watchObject, scripts }, null, 2));

        for (const scriptId in scripts) {
          container.logger.debug(`Deploying script ${scriptId}`);

          const scriptRef = scripts[scriptId];
          if (!scriptRef) continue;

          await this.#scriptDeployer.deploy({
            ...alert,
            scripts: [
              {
                id: scriptId,
                content: await readFile(scriptRef.fullPath, 'utf-8')
              }
            ]
          }, scriptId);
        }

        await this.#watchDeployer.deployWatchAsObject(watchObject, alert.id);

        alertDeploymentInfo.push(true);

        container.logger.info(`Alert deployed`);

        container.logger.endGroup();

        continue;
      }

      try {
        await this.#deployScript(alert);
        await this.#watchDeployer.deploy({
          ...alert,
          watchFiles: [alertWatchJSONFile]
        });

        alertDeploymentInfo.push(true);

        container.logger.info('Alert deployed');
      } catch (error) {
        container.logger.error('Could not deploy alert');

        throw error;
      } finally {
        container.logger.endGroup();
      }
    }

    return alertDeploymentInfo;
  }

  async #deployScript(alert: Alert): Promise<void> {
    if (alert.hasScript()) await this.#scriptDeployer.deploy(alert as unknown as {
      id: string;
      path: string;
      scripts: Array<{ id: string; content: string }>;
    }, alert.id);
  }

  #getAlertWatchJSONFiles(alert: Alert, { envTarget, serverTarget }: { envTarget?: string; serverTarget?: string }): WatchFile[] {
    return getAlertWatchersByEnvironment(alert, { serverName: serverTarget, env: envTarget });
  }
}

export const makeDeployAlertsService = ({
  alerts,
  scriptDeployer,
  watchDeployer
}: {
  alerts: Alert[];
  scriptDeployer: ScriptDeployerLike;
  watchDeployer: WatchDeployerLike;
}) => {
  return new DeployAlerts({ alerts, scriptDeployer, watchDeployer });
};
