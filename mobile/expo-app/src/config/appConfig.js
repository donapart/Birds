import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig || Constants.manifest || {};

export const DEFAULT_API_URL =
  expoConfig.extra?.apiUrl || 'https://available-nonsegmentary-arlene.ngrok-free.dev';

export const APP_VERSION = expoConfig.version || '0.0.0';

export const createApiHeaders = (apiKey, headers = {}) => ({
  'ngrok-skip-browser-warning': '1',
  ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  ...headers,
});