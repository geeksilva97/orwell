import { OrwellError } from './base-error.ts';
import { ErrorType } from '../types.ts';

export function createWatchDeploymentError({
  message,
  status,
  headers,
  responsePayload,
  requestPayload,
}: {
  message: string;
  status: number;
  headers: unknown;
  responsePayload: unknown;
  requestPayload: unknown;
}): OrwellError {
  return new OrwellError({
    errorType: ErrorType.WatchDeployment,
    meta: {
      status,
      headers,
      responsePayload,
      requestPayload,
    },
    message,
  });
}

export function isWatchDeploymentError(error: unknown): error is OrwellError {
  return error instanceof OrwellError && error.errorType === ErrorType.WatchDeployment;
}
