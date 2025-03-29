const { BaseError } = require("./base-error");

const type = Symbol();

class WatchDeploymentError {
  static is(error) {
    return error.type === type;
  }

  static create({
    message,
    status,
    headers,
    responsePayload,
    requestPayload
  }) {
    return new BaseError({
      message,
      type,
      meta: {
        status,
        headers,
        responsePayload,
        requestPayload
      }
    });
  }
}

module.exports = {
  WatchDeploymentError
};
