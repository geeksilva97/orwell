const axios = require('axios').default;

const makeHttpClient = (baseUrl) => {
  return axios.create(
    {
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};

module.exports = {
  makeHttpClient
};
