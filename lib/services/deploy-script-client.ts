import { createRequestError } from '../errors/request-error.ts';
import type { AuthOptions } from '../types.ts';

interface HttpClientLike {
  post(url: string, data: unknown, config: unknown): Promise<unknown>;
}

interface AxiosLikeError {
  response?: {
    status: number;
    data: Record<string, unknown>;
  };
  config?: Record<string, unknown>;
  request?: unknown;
  cause?: { code?: string };
}

class DeployScriptClient {
  #httpClient: HttpClientLike;
  #authOptions: AuthOptions;

  constructor({ httpClient, authOptions }: { httpClient: HttpClientLike; authOptions: AuthOptions }) {
    this.#httpClient = httpClient;
    this.#authOptions = authOptions;
  }

  async deploy({ id, content }: { id: string; content: string }): Promise<void> {
    try {
      await this.#httpClient.post(`/${id}`, {
        script: {
          lang: 'painless',
          source: `${content}`
        }
      }, this.#authOptions);
    } catch (error) {
      const axiosError = error as AxiosLikeError;

      if (axiosError.response) {
        throw createRequestError({
          message: `Error while deploying script ${id}`,
          response: axiosError.response,
          config: axiosError.config,
          request: axiosError.request
        });
      }

      if (axiosError.cause && axiosError.cause.code === 'ENOTFOUND') {
        throw createRequestError({
          message: `Error while deploying script ${id}: could not connect to the server`,
          response: {},
          config: axiosError.config,
          request: axiosError.request
        });
      }

      throw error;
    }
  }
}

export const makeDeployScriptClient = ({ httpClient, authOptions }: {
  httpClient: HttpClientLike;
  authOptions: AuthOptions;
}) => {
  return new DeployScriptClient({ httpClient, authOptions });
};
