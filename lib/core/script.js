const assert = require('node:assert');

class Script {
  constructor({ id, content, path }) {
    assert(id);
    assert(path);

    this.id = id;
    this.path = path;
    this.content = content;
  }

  setContent(content) {
    this.content = content;
  }

  static create(params) {
    return new Script(params);
  }
}

module.exports.Script = Script;
