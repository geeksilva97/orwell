import { readFileSync } from 'node:fs';
import { container } from '../container.ts';
import type { Alert } from '../core/alert.ts';

interface DeployWatchClientLike {
  deploy(params: { id: string; content: Record<string, unknown> }): Promise<void>;
  delete(params: { id: string }): Promise<boolean>;
}

class DeployWatchService {
  #deployWatchClient: DeployWatchClientLike;
  #watchEnvJson: Record<string, unknown>;

  constructor({
    deployWatchClient,
    watchEnvJson,
  }: {
    deployWatchClient: DeployWatchClientLike;
    watchEnvJson?: Record<string, unknown>;
  }) {
    this.#deployWatchClient = deployWatchClient;
    this.#watchEnvJson = watchEnvJson ?? {};
  }

  async deploy(alert: Alert, getFileContent: (path: string) => Buffer | string = readFileSync): Promise<void> {
    container.logger.info(`Started deploying watch for alert ${alert.id}`);

    container.logger.debug(JSON.stringify(alert, null, 2));

    const firstWatchFile = alert.watchFiles[0];
    if (!firstWatchFile) {
      throw new Error(`Alert ${alert.id} has no watch files`);
    }
    const watchJsonContent = getFileContent(`${alert.path}/${alert.name}/${firstWatchFile.filename}`).toString();
    const parsedContent = JSON.parse(watchJsonContent) as Record<string, unknown>;

    await this.deployWatchAsObject(parsedContent, alert.id);

    container.logger.info(`Watch deployed for alert ${alert.id}`);
  }

  async remove(alert: Alert | { id: string }): Promise<boolean> {
    container.logger.info(`Started deleting watch for alert ${alert.id}`);

    const result = await this.#deployWatchClient.delete(alert);

    container.logger.info(`Finished deleting watch for alert ${alert.id}`);

    return result;
  }

  async deployWatchAsObject(parsedContent: Record<string, unknown>, alertId: string): Promise<void> {
    const watchEnvs = this.#watchEnvJson;
    const watchJsonContentWithEnvs = this.#addEnvsToWatch(parsedContent, watchEnvs);

    await this.#deployWatchClient.deploy(
      {
        id: alertId,
        content: this.#replaceTransformScript(alertId, watchJsonContentWithEnvs)
      }
    );
  }

  #replaceTransformScript(alertId: string, watchJSONContent: Record<string, unknown>): Record<string, unknown> {
    const stringified = JSON.stringify(watchJSONContent);
    const transformed = stringified.replace(/<SCRIPT_ID>/g, alertId);

    return JSON.parse(transformed) as Record<string, unknown>;
  }

  #addEnvsToWatch(watchJsonContent: Record<string, unknown>, watchEnvs: Record<string, unknown>): Record<string, unknown> {
    container.logger.info(`Started adding watch envs to watch json content`);

    const input = watchJsonContent.input as Record<string, unknown> | undefined;
    const chain = input?.chain as Record<string, unknown> | undefined;
    const inputs = chain?.inputs as unknown[] | undefined;
    const hasChainOfInputs = (inputs?.length ?? 0) > 0;

    if (hasChainOfInputs && inputs) {
      const watchEnvInput = {
        watchEnvs: {
          simple: watchEnvs
        }
      };

      inputs.unshift(watchEnvInput);

      container.logger.info(`Watch envs added to watch json content`);

      return {
        ...watchJsonContent,
      };
    }

    container.logger.warn(`Watch envs not added to watch json content. Ensure the watch json content has a chain of inputs`);

    return watchJsonContent;
  }
}

export const makeDeployWatch = ({ deployWatchClient, watchEnvJson }: {
  deployWatchClient: DeployWatchClientLike;
  watchEnvJson?: Record<string, unknown>;
}) => {
  return new DeployWatchService({ deployWatchClient, watchEnvJson });
};
