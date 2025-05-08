const { readFile } = require('node:fs/promises');
const { parseWatchJSFile } = require('../../dsl/watch-js-utilities');
const { container } = require('../container');

class DeleteAlertsService {
  constructor({
    alerts,
    scriptDeployer,
    watchDeployer
  }) {
    this.alerts = alerts;
    this.scriptDeployer = scriptDeployer;
    this.watchDeployer = watchDeployer;
  }

  async execute() {
    const alertDeploymentInfo = [];

    for (const alert of this.alerts) {
      if (await this.watchDeployer.remove(alert)) {
        alertDeploymentInfo.push(true);
      }
    }

    return alertDeploymentInfo;
  }
}

const makeDeleteAlertsService = ({
  alerts,
  scriptDeployer,
  watchDeployer
}) => {
  return new DeleteAlertsService({ alerts, scriptDeployer, watchDeployer })
}

module.exports = {
  makeDeleteAlertsService
}
