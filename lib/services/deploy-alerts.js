const { readFile } = require('node:fs/promises');
const { parseWatchJSFile } = require('../../dsl/watch-js-utilities');
const { container } = require('../container');

class DeployAlerts {
  constructor({
    alerts,
    scriptDeployer,
    watchDeployer
  }) {
    this.alerts = alerts;
    this.scriptDeployer = scriptDeployer;
    this.watchDeployer = watchDeployer;
  }

  async execute({
    envTarget,
    serverTarget
  }) {
    const alertDeploymentInfo = [];

    for (const alert of this.alerts) {
      const alertWatchJSONFiles = this.#getAlertWatchJSONFiles(alert, { envTarget, serverTarget });

      if (alertWatchJSONFiles.length !== 1) {
        container.logger.warn(`Alert ${alert.id} skipped: it must have exactly one watcher file for the environment "${envTarget}" and server "${serverTarget}". Found ${alertWatchJSONFiles.length} files.`);

        continue;
      }

      const alertWatchJSONFile = alertWatchJSONFiles[0];

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

          await this.scriptDeployer.deploy({
            ...alert,
            scripts: [
              {
                id: scriptId,
                content: await readFile(scripts[scriptId].fullPath, 'utf-8')
              }
            ]
          }, scriptId);
        }

        await this.watchDeployer.deployWatchAsObject(watchObject, alert.id);

        alertDeploymentInfo.push(true);

        container.logger.info(`Alert deployed`);

        container.logger.endGroup();

        continue;
      }

      try {
        await this.#deployScript(alert);
        await this.watchDeployer.deploy({
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

  async #deployScript(alert) {
    if (alert.hasScript()) await this.scriptDeployer.deploy(alert);
  }

  #getAlertWatchJSONFiles(alert, { envTarget, serverTarget }) {
    return alert.watchFiles.filter(({ filename: fileName, type }) => {
      const pieces = fileName.split('.');
      const isServerLevel = pieces.length === 3;
      const isFullLeveled = pieces.length === 4;
      const server = (isServerLevel || isFullLeveled) && pieces[1];
      const environment = isFullLeveled && pieces[2];

      return envTarget === environment && serverTarget === server;
    });
  }
}

const makeDeployAlertsService = ({
  alerts,
  scriptDeployer,
  watchDeployer
}) => {
  return new DeployAlerts({ alerts, scriptDeployer, watchDeployer })
}

module.exports = {
  makeDeployAlertsService
}
