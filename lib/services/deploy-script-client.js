const { RequestError } = require("../errors/request-error");

class DeployScriptClient {
  constructor({ httpClient, authOptions }) {
    this.httpClient = httpClient;
    this.authOptions = authOptions;
  }

  async deploy({ id, content }) {
    try {
      await this.httpClient.post(`/${id}`, {
        script: {
          lang: 'painless',
          source: `${content}`
        }
      }, this.authOptions);
    } catch (error) {
      if (error.response) {
        throw RequestError.create({
          message: `Error while deploying script ${id}`,
          response: error.response,
          config: error.config,
          request: error.request
        });
      }

      throw error;
    }
  }
}

module.exports = {
  makeDeployScriptClient: ({ httpClient, authOptions }) => {
    return new DeployScriptClient({ httpClient, authOptions });
  }
}
