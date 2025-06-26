const path = require('node:path');

module.exports = {
  path: (filePath) => {
    return path.resolve(__dirname, filePath || '');
  }
}
