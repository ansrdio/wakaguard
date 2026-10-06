import * as functions from 'firebase-functions';

/**
 * Read a setting from the environment (functions/.env or a secret).
 *
 * legacyPath is the old functions.config() location, e.g. 'twilio.auth_token'.
 * It is only a fallback for existing deployments: functions.config() is
 * deprecated and new deploys that rely on it will fail after March 2027.
 */
export function getSetting(envName: string, legacyPath?: string): string {
  const fromEnv = process.env[envName];
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv;
  if (!legacyPath) return '';

  try {
    let node: any = functions.config();
    for (const part of legacyPath.split('.')) {
      node = node?.[part];
    }
    return typeof node === 'string' ? node : '';
  } catch {
    return '';
  }
}

export function getNumberSetting(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
