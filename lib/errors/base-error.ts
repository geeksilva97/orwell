import { type ErrorTypeName } from '../types.ts';

export class OrwellError extends Error {
  readonly errorType: ErrorTypeName;
  readonly meta: Record<string, unknown>;

  constructor({
    errorType,
    meta,
    message,
  }: {
    errorType: ErrorTypeName;
    meta: Record<string, unknown>;
    message: string;
  }) {
    super(message);

    this.name = 'OrwellError';
    this.errorType = errorType;
    this.meta = meta;

    Error.captureStackTrace(this, OrwellError);
  }
}
