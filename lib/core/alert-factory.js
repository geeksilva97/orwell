const { Alert } = require("./alert");
const { Script } = require("./script");

function buildScript(scriptParams) {
  try {
    return Script.create(scriptParams);
  } catch (err) {
    console.error('Could not build script', { scriptParams, err });

    return null;
  }
}

class AlertFactory {
  /*
   * @param alertData
   * @param {String} alertData.id
   * @param {String} alertData.path
   * @param {Object} scriptParams
   * @returns {Alert}
   */
  static build({ alertData, scriptParams }) {
    const script = scriptParams?.content ? buildScript(scriptParams) : null;

    return Alert.create({
      ...alertData,
      scripts: script != null ? [script] : []
    });
  }
}

module.exports.AlertFactory = AlertFactory;
