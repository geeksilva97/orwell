const makeAuthOptions = ({ apiKey, username, password }) => {
  if (apiKey) {
    return {
      headers: {
        Authorization: `ApiKey ${apiKey}`
      }
    };
  }

  return {
    auth: {
      username,
      password
    }
  };
};

module.exports = { makeAuthOptions };
