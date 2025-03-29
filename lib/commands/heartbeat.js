function heartbeatUpAction(options) {
  if (options.baseDir) {
    // TODO: check if dir exists
    process.chdir(options.baseDir);
  }

  const orwellConfig = require(`${process.cwd()}/orwell.js`);
  const heartbeatConfig = orwellConfig.heartbeat;

  console.log(orwellConfig);
}

function command(program) {
  program.command('heartbeat:up')
    .description('Evaluates a JavaScript Watcher file and print out the result')
    .option('--base-dir <base dir>', 'Alerts base dir')
    .action(heartbeatUpAction)
}

module.exports = command;
