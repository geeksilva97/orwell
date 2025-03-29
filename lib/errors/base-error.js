class BaseError extends Error {
  constructor({
    name,
    type,
    meta,
    message
  }) {
    super();

    this.name = name;
    this.type = type;
    this.meta = meta;
    this.message = message;

    Error.captureStackTrace(this, BaseError);
  }
}

module.exports = { BaseError };
