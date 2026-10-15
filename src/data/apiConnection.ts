import { Platform } from 'react-native';
import { isLoopbackHost, isSecureApiUrl } from './networkPolicy';
export const API_URL = (process.env.EXPO_PUBLIC_DISCOVERY_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!isSecureApiUrl(API_URL)) throw new Error('Invalid API URL. Use an HTTPS origin without a path, credentials or query string. See docs/device-testing.md.');
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, signal: options.signal || AbortSignal.timeout(10_000) });
  } catch {
    if (Platform.OS !== 'web' && isLoopbackHost(new URL(API_URL).hostname)) {
      throw new Error('API points to this device’s localhost. For a physical phone, set EXPO_PUBLIC_DISCOVERY_API_URL to your private HTTPS Serve URL, then restart Expo with --clear. See docs/device-testing.md.');
    }
    throw new Error('API connection failed or timed out. Check the API is running, both devices are connected to Tailscale, and the HTTPS URL opens on this phone. Restart Expo after changing .env.');
  }
  if (response.status === 403) throw new Error('API access denied (403). Check the phone’s Tailscale login against API_TESTER_LOGINS; on web also check API_ALLOWED_ORIGINS.');
  return response;
}
