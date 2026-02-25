import { OrwellError } from './base-error.ts';
import { ErrorType } from '../types.ts';

export function createRequestError({
  message,
  response,
  config,
  request,
}: {
  message: string;
  response: unknown;
  config: unknown;
  request: unknown;
}): OrwellError {
  return new OrwellError({
    errorType: ErrorType.Request,
    meta: {
      response,
      config,
      request,
    },
    message,
  });
}

export function isRequestError(error: unknown): error is OrwellError {
  return error instanceof OrwellError && error.errorType === ErrorType.Request;
}
