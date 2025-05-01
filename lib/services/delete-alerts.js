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

  async execute({
    envTarget,
    serverTarget
  }) {
    const alertDeploymentInfo = [];

    for (const alert of this.alerts) {
      console.log(`Deleting alert ${alert.id}`);
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
