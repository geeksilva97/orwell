import type { Logger } from './types.ts';

const infoFn = (...args: string[]): void => {
  process.stdout.write(args.join(' ') + '\n');
};
const errorFn = (...args: string[]): void => {
  process.stderr.write(args.join(' ') + '\n');
};

export const container: { logger: Logger } = {
  logger: {
    debugMode: Boolean(process.env.DEBUG),
    info: infoFn,
    notice: infoFn,
    debug: function (...args: string[]): void {
      if (!this.debugMode) return;
      infoFn.apply(null, args);
    },
    error: errorFn,
    warn: infoFn,
    startGroup: (msg: string) => infoFn(`::group::${msg}`),
    endGroup: () => infoFn('::endgroup::')
  }
};
