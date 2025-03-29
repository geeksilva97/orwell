const nodePath = require('node:path')
const { readdirSync, readFileSync } = require('fs');
const { AlertFactory } = require('../core/alert-factory');

class AlertRepositoryFileSystem {
  constructor({
    prefix,
    readDir,
    readFile
  }) {
    this.prefix = !prefix ? '' : `${prefix}-`;
    this.readDir = readDir || readdirSync;
    this.readFile = readFile || readFileSync;
  }

  findAlertByPath(alertPath) {
    try {
      const files = this.readDir(alertPath);

      const watchFiles = files.reduce((acc, filename) => {
        const fileExtension = nodePath.extname(filename);
        const isJSONOrJs = ['.json', '.js'].includes(fileExtension);
        if(filename.includes('watcher.') && isJSONOrJs) {
          acc.push({
            type: fileExtension === '.json' ? 'json' : 'js',
            filename
          });
        }

        return acc;
      }, []);

      const scriptContent = this.#getScript(alertPath);

      const { alertId, alertName, path } = this.#splitPath(alertPath);

      return AlertFactory.build({
        alertData: {
          id: alertId,
          name: alertName,
          path,
          watchFiles
        },
        scriptParams: {
          content: scriptContent,
          id: alertId,
          path
        }
      });
    } catch (err) {
      console.error(`Could not find alert in ${alertPath}. Make sure your branch is aligned with its base`, { alertPath, err });

      return null;
    }
  }

  #splitPath(alertPath) {
    const splittedDir = alertPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertName = splittedDir[2];
    const alertId = `${this.prefix}${splittedDir[1]}-${alertName}`;

    return { path, alertId, alertName };
  }

  #getScript(alertPath) {
    try {
      const scriptCode = this.readFile(`${alertPath}/script.groovy`);

      return scriptCode.toString();
    } catch (err) {
      console.warn('Could not find script at ', { alertPath });

      return null;
    }
  }
}

const makeAlertsRepository = ({
  readDir,
  readFile,
  prefix
}) => new AlertRepositoryFileSystem({
  readFile,
  readDir,
  prefix
});

module.exports.makeAlertsRepository = makeAlertsRepository;
module.exports.alertRepository = makeAlertsRepository({
  readDir: readdirSync,
  readFile: readFileSync
});
