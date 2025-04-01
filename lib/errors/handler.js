const { PainlessCompilationError } = require("./compilation-error");
const { RequestError } = require("./request-error");
const { WatchDeploymentError } = require("./watch-deployment-error");

const { styleText } = require('node:util');

const handleError = (logger) => (error) => {
  if (PainlessCompilationError.is(error)) {
    const { caused_by } = error.meta;
    logger.debug(JSON.stringify(error.meta, null, 2));
    logger.error(`Watch Deployment Error: ${error.message}\n* main cause: ${caused_by.reason} -- enable actions debug logging to see more details`);
    return;
  }

  if (RequestError.is(error)) {
    const { response, config } = error.meta;

    logger.error(styleText(['redBright'], `Alert Deployment Error: ${error.message}
    (
        name=RequestError;
        statusCode=${response?.status};
        request.baseURL=${config?.baseURL};
        request.url=${config?.url};
        request.method=${config?.method};
        response.body=${JSON.stringify(response?.data, null, 2)};
        request.payload=${JSON.stringify(config?.data, null, 2)}
        stack=${error.stack}
      )`));

    return;
  }

  if (WatchDeploymentError.is(error)) {
    const { status, requestPayload, responsePayload, headers } = error.meta;
    logger.error(`Watch Deployment Error: ${error.message}\n* status: ${status}\n* headers: ${JSON.stringify(headers)}\n* request payload: ${JSON.stringify(requestPayload, null, 2)}\n* response payload: ${JSON.stringify(responsePayload)}`);
    return;
  }
};

module.exports = handleError;
