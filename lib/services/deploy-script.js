const { container } = require("../container");

class DeployScriptService {
  constructor({
    deployScriptClient,
    transpileService
  }) {
    this.deployScriptClient = deployScriptClient;
    this.transpileService = transpileService;
  }

  async deploy(alert, scriptId) {
    const transpiledScript = this.transpileService.transpile(alert.scripts[0].content, `${alert.path}/${alert.id}`, {});

    container.logger.info(`Deploying script for alert ${alert.id}`);
    container.logger.debug(`===== Script content ====\n${transpiledScript}`);

    try {
      await this.deployScriptClient.deploy({ id: scriptId || alert.id, content: transpiledScript });
      container.logger.info(`Script deployed sucessfully`);
    } catch (error) {
      // TODO: handle errors properly here
      container.logger.error(`Could not deploy script for alert ${alert.id}`);

      throw error;
    }
  }
}

const makeDeployScriptService = ({ deployScriptClient, transpileService }) => {
  return new DeployScriptService({ deployScriptClient, transpileService });
};

module.exports = {
  makeDeployScriptService
}
