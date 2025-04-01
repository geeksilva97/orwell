const axios = require('axios').default;

const makeHttpClient = (baseUrl) => {
  return axios.create(
    {
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
};

module.exports = {
  makeHttpClient
};
