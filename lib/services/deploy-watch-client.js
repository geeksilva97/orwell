const { PainlessCompilationError } = require("../errors/compilation-error");
const { RequestError } = require("../errors/request-error");
const { WatchDeploymentError } = require("../errors/watch-deployment-error");

class DeployWatchClient {
  constructor({ httpClient, authOptions }) {
    this.httpClient = httpClient;
    this.authOptions = authOptions;
  }

  async deploy({ id, content }) {
    try {
      await this.httpClient.put(`/${id}`, content, this.authOptions);
    } catch (error) {
      const errorResponse = error.response;

      if (errorResponse) {
        this.#handleErrorResponse({
          errorConfig: error.config,
          errorRequest: error.request,
          errorResponse,
          id,
          bodyPayload: content
        });
      }

      throw error;
    }
  }

  async delete({ id }) {
    console.log('deploy watch client', id)
    try {
      await this.httpClient.delete(`/${id}`, this.authOptions);
    } catch (error) {
      const errorResponse = error.response;

      if (errorResponse) {
        this.#handleErrorResponse({
          errorConfig: error.config,
          errorRequest: error.request,
          errorResponse,
          id,
          bodyPayload: content
        });
      }

      throw error;
    }
  }

  #handleErrorResponse({ errorResponse, errorConfig, errorRequest, id, bodyPayload }) {
    const { data, status, headers } = errorResponse;

    switch (status) {
      case 400:
        this.#handleBadRequestError({ ...errorResponse, id, bodyPayload });
        break;
      case 401:
        this.#handleUnauthorizedError();
        break;
      case 403:
        this.#handleForbiddenError({ response: errorResponse, config: errorConfig, request: errorRequest });
        break;
      case 404:
        this.#handleNotFoundError({ id, errorResponse, errorRequest, errorConfig });
        break;
      default:
        this.#handleDefaultError({ data, status, headers });
    }
  }

  #handleNotFoundError({ id, errorResponse, errorRequest, errorConfig }) {
    throw WatchDeploymentError.create({
      message: `Error while deploying watch ${id}: watcher not found\n* url=${errorConfig.url}\nbaseURL=${errorConfig.baseURL}`,
      status: errorResponse.status,
      headers: errorResponse.headers,
      responsePayload:  errorResponse.data,
      requestPayload: errorConfig
    });
  }

  #handleBadRequestError({ data, status, headers, id: alertId, bodyPayload }) {
    const error = data?.error || {};

    if (error?.type === 'script_exception') {
      throw PainlessCompilationError.create({
        message: `[Painless Compilation Error] ${error.reason}`,
        position: error.position,
        errorType: error.caused_by.type,
        errorReason: error.caused_by.reason,
        scriptStack: error.script_stack
      });
    }

    throw WatchDeploymentError.create({
      message: `Could not deploy watch ${alertId}`,
      status,
      headers,
      requestPayload: bodyPayload,
      responsePayload: data
    });
  }

  #handleUnauthorizedError() { }

  #handleForbiddenError({
    response,
    config,
    request
  }) {
    throw RequestError.create({
      message: 'Error while deploying watch: forbidden',
      response,
      config,
      request
    });
  }

  #handleDefaultError({ data, status, headers }) { }
}

module.exports = {
  makeDeployWatchClient: ({ httpClient, authOptions }) => {
    return new DeployWatchClient({ httpClient, authOptions });
  }
};
