const { BaseError } = require("./base-error");

const type = Symbol();

class PainlessCompilationError {
  static is(error) {
    return error.type === type;
  }

  static create({
    message,
    position,
    errorType,
    errorReason,
    scriptStack
  }) {
    return new BaseError({
      type,
      meta: {
        position,
        caused_by: {
          type: errorType,
          reason: errorReason
        },
        scriptStack
      },
      message
    });
  }
}

module.exports = {
  PainlessCompilationError
};
