import type { Alert } from '../core/alert.ts';

interface WatchDeployerLike {
  remove(alert: Alert | { id: string }): Promise<boolean>;
}

class DeleteAlertsService {
  #alerts: Alert[];
  #watchDeployer: WatchDeployerLike;

  constructor({
    alerts,
    watchDeployer
  }: {
    alerts: Alert[];
    scriptDeployer: unknown;
    watchDeployer: WatchDeployerLike;
  }) {
    this.#alerts = alerts;
    this.#watchDeployer = watchDeployer;
  }

  async execute(): Promise<boolean[]> {
    const alertDeploymentInfo: boolean[] = [];

    for (const alert of this.#alerts) {
      if (await this.#watchDeployer.remove(alert)) {
        alertDeploymentInfo.push(true);
      }
    }

    return alertDeploymentInfo;
  }
}

export const makeDeleteAlertsService = ({
  alerts,
  scriptDeployer,
  watchDeployer
}: {
  alerts: Alert[];
  scriptDeployer: unknown;
  watchDeployer: WatchDeployerLike;
}) => {
  return new DeleteAlertsService({ alerts, scriptDeployer, watchDeployer });
};
