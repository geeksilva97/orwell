import axios from 'axios';
import type { AxiosInstance } from 'axios';

export const makeHttpClient = (baseUrl: string): AxiosInstance => {
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
