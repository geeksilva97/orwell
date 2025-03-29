const { BaseError } = require("./base-error");

const type = Symbol();

class RequestError {
  static is(error) {
    return error.type === type;
  }

  static create({
    message,
    response,
    config,
    request
  }) {
    return new BaseError({
      type,
      meta: {
        response,
        config,
        request
      },
      message,
    });
  }
}

module.exports = {
  RequestError
};
