const assert = require('node:assert');

class Alert {
  constructor({ id, name, path, scripts, watchFiles }) {
    assert(id);
    assert(path);
    assert(watchFiles?.length > 0, 'An alert must have at least one watch file');

    this.id = id;
    this.name = name;
    this.path = path;
    this.scripts = scripts;
    this.watchFiles = watchFiles
  }

  /*
   * @param params
   * @param {String} id
   * @param {String} path
   * @param {Array<Script>} scripts
   * @param {Array<Object>} watchFiles
   * @returns {Alert}
   */
  static create(params) {
    return new Alert(params);
  }

  hasScript() {
    return this.scripts.length > 0;
  }

  withScript(content) {
    return new Alert({
      ...this,
      scripts: [
        ...this.scripts,
        {
          id: this.id,
          path: this.path,
          content
        }
      ]
    });
  }

  withWatchFiles(watchFiles) {
    return new Alert({
      ...this,
      watchFiles: Array.from(new Set([
        ...this.watchFiles,
        watchFiles
      ]))
    });
  }
}

module.exports.Alert = Alert;
