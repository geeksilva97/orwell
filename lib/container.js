// const infoFn = process.stdout.write.bind(process.stdout);
const infoFn = (...args) => {
  process.stdout.write(args.join(' ') + '\n');
};
const errorFn = (...args) => {
  process.stderr.write(args.join(' ') + '\n');
};

const container = {
  logger: {
    info: infoFn,
    notice: infoFn,
    debug: infoFn,
    error: errorFn,
    warn: infoFn,
    startGroup: (msg) => infoFn(`::group::${msg}`),
    endGroup: () => infoFn('::endgroup::')
  }
};

module.exports = { container }
