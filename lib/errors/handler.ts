import { isPainlessCompilationError } from './compilation-error.ts';
import { isRequestError } from './request-error.ts';
import { isWatchDeploymentError } from './watch-deployment-error.ts';
import type { OrwellError } from './base-error.ts';
import type { Logger } from '../types.ts';

import { styleText } from 'node:util';

const handleError = (logger: Logger) => (error: unknown): void => {
  if (isPainlessCompilationError(error)) {
    const meta = (error as OrwellError).meta as { caused_by: { reason: string } };
    logger.debug(JSON.stringify((error as OrwellError).meta, null, 2));
    logger.error(`Watch Deployment Error: ${(error as OrwellError).message}\n* main cause: ${meta.caused_by.reason} -- enable actions debug logging to see more details`);
    return;
  }

  if (isRequestError(error)) {
    const err = error as OrwellError;
    const meta = err.meta as { response?: { status?: number; data?: unknown }; config?: { baseURL?: string; url?: string; method?: string; data?: unknown } };
    const { response, config } = meta;

    logger.error(styleText(['redBright'], `Alert Deployment Error: ${err.message}
    (
        name=RequestError;
        statusCode=${response?.status};
        request.baseURL=${config?.baseURL};
        request.url=${config?.url};
        request.method=${config?.method};
        response.body=${JSON.stringify(response?.data, null, 2)};
        request.payload=${JSON.stringify(config?.data, null, 2)}
        stack=${err.stack}
      )`));

    return;
  }

  if (isWatchDeploymentError(error)) {
    const err = error as OrwellError;
    const meta = err.meta as { status: number; requestPayload: unknown; responsePayload: unknown; headers: unknown };
    const { status, requestPayload, responsePayload, headers } = meta;
    logger.error(`Watch Deployment Error: ${err.message}\n* status: ${status}\n* headers: ${JSON.stringify(headers)}\n* request payload: ${JSON.stringify(requestPayload, null, 2)}\n* response payload: ${JSON.stringify(responsePayload)}`);
    return;
  }
};

export default handleError;
