import { OrwellError } from './base-error.ts';
import { ErrorType } from '../types.ts';

export function createPainlessCompilationError({
  message,
  position,
  errorType,
  errorReason,
  scriptStack,
}: {
  message: string;
  position: unknown;
  errorType: string;
  errorReason: string;
  scriptStack: unknown;
}): OrwellError {
  return new OrwellError({
    errorType: ErrorType.PainlessCompilation,
    meta: {
      position,
      caused_by: {
        type: errorType,
        reason: errorReason,
      },
      scriptStack,
    },
    message,
  });
}

export function isPainlessCompilationError(error: unknown): error is OrwellError {
  return error instanceof OrwellError && error.errorType === ErrorType.PainlessCompilation;
}
