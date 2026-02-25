import { container } from '../container.ts';
import { createPainlessCompilationError } from '../errors/compilation-error.ts';
import { createRequestError } from '../errors/request-error.ts';
import { createWatchDeploymentError } from '../errors/watch-deployment-error.ts';
import type { AuthOptions } from '../types.ts';

interface HttpClientLike {
  put(url: string, data: unknown, config: unknown): Promise<unknown>;
  delete(url: string, config: unknown): Promise<unknown>;
}

interface AxiosLikeError {
  response?: {
    status: number;
    data: Record<string, unknown>;
    headers: Record<string, unknown>;
  };
  config?: {
    baseURL?: string;
    url?: string;
    method?: string;
    data?: unknown;
  };
  request?: unknown;
}

class DeployWatchClient {
  #httpClient: HttpClientLike;
  #authOptions: AuthOptions;

  constructor({ httpClient, authOptions }: { httpClient: HttpClientLike; authOptions: AuthOptions }) {
    this.#httpClient = httpClient;
    this.#authOptions = authOptions;
  }

  async deploy({ id, content }: { id: string; content: Record<string, unknown> }): Promise<void> {
    try {
      await this.#httpClient.put(`/${id}`, content, this.#authOptions);
    } catch (error) {
      const axiosError = error as AxiosLikeError;
      const errorResponse = axiosError.response;

      if (errorResponse) {
        this.#handleErrorResponse({
          errorConfig: axiosError.config,
          errorRequest: axiosError.request,
          errorResponse,
          id,
          bodyPayload: content
        });
      }

      throw error;
    }
  }

  async delete({ id }: { id: string }): Promise<boolean> {
    try {
      await this.#httpClient.delete(`/${id}`, this.#authOptions);
      return true;
    } catch (error) {
      const axiosError = error as AxiosLikeError;
      const errorResponse = axiosError.response;

      if (errorResponse) {
        if (errorResponse.status === 404) {
          container.logger.warn(`Watch ${id} not found, nothing to delete`);
          return false;
        }

        this.#handleErrorResponse({
          errorConfig: axiosError.config,
          errorRequest: axiosError.request,
          errorResponse,
          id,
          bodyPayload: {}
        });
      }

      throw error;
    }
  }

  #handleErrorResponse({ errorResponse, errorConfig, errorRequest, id, bodyPayload }: {
    errorResponse: NonNullable<AxiosLikeError['response']>;
    errorConfig: AxiosLikeError['config'];
    errorRequest: unknown;
    id: string;
    bodyPayload: unknown;
  }): void {
    const { data, status, headers } = errorResponse;

    switch (status) {
      case 400:
        this.#handleBadRequestError({ data, status, headers, id, bodyPayload });
        break;
      case 401:
        this.#handleUnauthorizedError();
        break;
      case 403:
        this.#handleForbiddenError({ response: errorResponse, config: errorConfig, request: errorRequest });
        break;
      case 404:
        this.#handleNotFoundError({ id, errorResponse, errorRequest, errorConfig });
        break;
      default:
        this.#handleDefaultError();
    }
  }

  #handleNotFoundError({ id, errorResponse, errorConfig }: {
    id: string;
    errorResponse: NonNullable<AxiosLikeError['response']>;
    errorRequest: unknown;
    errorConfig: AxiosLikeError['config'];
  }): void {
    throw createWatchDeploymentError({
      message: `Error while deploying watch ${id}: watcher not found\n* url=${errorConfig?.url}\nbaseURL=${errorConfig?.baseURL}`,
      status: errorResponse.status,
      headers: errorResponse.headers,
      responsePayload: errorResponse.data,
      requestPayload: errorConfig
    });
  }

  #handleBadRequestError({ data, status, headers, id: alertId, bodyPayload }: {
    data: Record<string, unknown>;
    status: number;
    headers: Record<string, unknown>;
    id: string;
    bodyPayload: unknown;
  }): void {
    const error = (data?.error ?? {}) as Record<string, unknown>;

    if (error?.type === 'script_exception') {
      const causedBy = error.caused_by as { type: string; reason: string };
      throw createPainlessCompilationError({
        message: `[Painless Compilation Error] ${error.reason as string}`,
        position: error.position,
        errorType: causedBy.type,
        errorReason: causedBy.reason,
        scriptStack: error.script_stack
      });
    }

    throw createWatchDeploymentError({
      message: `Could not deploy watch ${alertId}`,
      status,
      headers,
      requestPayload: bodyPayload,
      responsePayload: data
    });
  }

  #handleUnauthorizedError(): void { }

  #handleForbiddenError({
    response,
    config,
    request
  }: {
    response: unknown;
    config: unknown;
    request: unknown;
  }): void {
    throw createRequestError({
      message: 'Error while deploying watch: forbidden',
      response,
      config,
      request
    });
  }

  #handleDefaultError(): void { }
}

export const makeDeployWatchClient = ({ httpClient, authOptions }: {
  httpClient: HttpClientLike;
  authOptions: AuthOptions;
}) => {
  return new DeployWatchClient({ httpClient, authOptions });
};
