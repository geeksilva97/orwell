const { readFileSync } = require('node:fs');
const { container } = require('../container');

class DeployWatchService {
  constructor({
    deployWatchClient,
  }) {
    this.deployWatchClient = deployWatchClient;
  }

  async deploy(alert, getFileContent = readFileSync) {
    container.logger.info(`Started deploying watch for alert ${alert.id}`);

    container.logger.debug(JSON.stringify(alert, null, 2));

    const watchJsonContent = getFileContent(`${alert.path}/${alert.name}/${alert.watchFiles[0].filename}`).toString();
    const parsedContent = JSON.parse(watchJsonContent);

    await this.deployWatchAsObject(parsedContent, alert.id);

    container.logger.info(`Watch deployed for alert ${alert.id}`);
  }

  async remove(alert) {
    container.logger.info(`Started deleting watch for alert ${alert.id}`);

    const result = await this.deployWatchClient.delete(alert);

    container.logger.info(`Finished deleting watch for alert ${alert.id}`);

    return result;
  }

  async deployWatchAsObject(parsedContent, alertId) {
    const watchEnvs = global?.env?.WATCH_ENV_JSON || {};
    const watchJsonContentWithEnvs = this.#addEnvsToWatch(parsedContent, watchEnvs);

    await this.deployWatchClient.deploy(
      {
        id: alertId,
        content: this.#replaceTransformScript(alertId, watchJsonContentWithEnvs)
      }
    );
  }

  /**
   * @deprecated Should use JS watchers with the script(path) function instead
   *
   * @param {string} alertId
   * @param {object} watchJSONContent
   * @returns {object}
   * @private
   * @memberof DeployWatchService
   */
  #replaceTransformScript(alertId, watchJSONContent) {
    const stringified = JSON.stringify(watchJSONContent);
    const transformed = stringified.replace(/<SCRIPT_ID>/g, alertId);

    return JSON.parse(transformed);
  }

  /**
   * @deprecated Watch envs should not be used anymore
   */
  #addEnvsToWatch(watchJsonContent, watchEnvs) {
    container.logger.info(`Started adding watch envs to watch json content`);

    const hasChainOfInputs = watchJsonContent.input?.chain?.inputs?.length > 0;

    if (hasChainOfInputs) {
      const watchEnvInput = {
        watchEnvs: {
          simple: watchEnvs
        }
      };

      watchJsonContent.input.chain.inputs.unshift(watchEnvInput);

      container.logger.info(`Watch envs added to watch json content`);

      return {
        ...watchJsonContent,
      };
    }

    container.logger.warn(`Watch envs not added to watch json content. Ensure the watch json content has a chain of inputs`);

    return watchJsonContent
  }
}

const makeDeployWatchServive = ({ deployWatchClient }) => {
  return new DeployWatchService({ deployWatchClient });
};

module.exports = {
  makeDeployWatch: makeDeployWatchServive
};
