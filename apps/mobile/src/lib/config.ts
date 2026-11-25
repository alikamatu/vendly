import Constants from 'expo-constants';

/**
 * Live production Verndly API on Render (same host whitelisted in apps/web/next.config.ts).
 * Can be overridden via EXPO_PUBLIC_API_URL in apps/mobile/.env.
 */
const PRODUCTION_API_URL = 'https://api.verndly.com';

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    // If someone set localhost in .env but is running on a physical phone via Expo Go,
    // rewrite localhost to the dev machine's LAN IP automatically.
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
      if (debuggerHost) {
        return envUrl.replace(/localhost|127\.0\.0\.1/, debuggerHost);
      }
    }
    return envUrl.replace(/\/+$/, '');
  }
  return PRODUCTION_API_URL;
}

export const API_URL = resolveApiUrl();

export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://verndly.com').replace(
  /\/+$/,
  '',
);

export const DEFAULT_CURRENCY = 'GH₵';
