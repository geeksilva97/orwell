const infoFn = (...args) => {
  process.stdout.write(args.join(' ') + '\n');
};
const errorFn = (...args) => {
  process.stderr.write(args.join(' ') + '\n');
};

const container = {
  logger: {
    debugMode: false,
    info: infoFn,
    notice: infoFn,
    debug: function (...args) {
      if (!this.debugMode) return;
      infoFn.apply(null, args);
    },
    error: errorFn,
    warn: infoFn,
    startGroup: (msg) => infoFn(`::group::${msg}`),
    endGroup: () => infoFn('::endgroup::')
  }
};

module.exports = { container }
