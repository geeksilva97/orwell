import type { AuthOptions } from '../types.ts';

export const makeAuthOptions = ({ apiKey, username, password }: {
  apiKey?: string;
  username?: string;
  password?: string;
}): AuthOptions => {
  if (apiKey) {
    return {
      headers: {
        Authorization: `ApiKey ${apiKey}`
      }
    };
  }

  return {
    auth: {
      username: username ?? '',
      password: password ?? ''
    }
  };
};
