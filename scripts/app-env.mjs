/**
 * Checks the settings a phone-app build is about to bake in.
 *
 * The web build is copied into the app, so whatever is in .env.local at build
 * time ships inside it and cannot be changed without a new release. This stops
 * a build that would point the app at nothing, at the test emulators, or at a
 * development server.
 *
 *   node scripts/app-env.mjs        (run by npm run build:android / build:ios)
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkAppBuildEnv(env) {
  const errors = [];
  const warnings = [];

  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    errors.push(`Missing ${missing.join(', ')}. Copy them from Firebase Console > Project settings into .env.local.`);
  }

  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (projectId.startsWith('demo-')) {
    errors.push(`NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${projectId}", a demo project that only exists in the emulators.`);
  }

  if (env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    errors.push('NEXT_PUBLIC_USE_FIREBASE_EMULATORS is on. Remove it from .env.local before building the app.');
  }

  if (env.CAP_SERVER_URL) {
    errors.push(`CAP_SERVER_URL is set (${env.CAP_SERVER_URL}), so the app would load a development server instead of its own files. Unset it.`);
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !/^https:\/\//.test(appUrl)) {
    errors.push(`NEXT_PUBLIC_APP_URL is "${appUrl}". Links texted to contacts are built from it, so it must be the public https address.`);
  }

  if (!env.NEXT_PUBLIC_MAP_TILE_URL) {
    warnings.push(
      'NEXT_PUBLIC_MAP_TILE_URL is not set, so the map uses OpenStreetMap\'s own servers. ' +
      'They only allow light traffic and may block apps; set a provider with an API key before release.'
    );
  }

  return { errors, warnings };
}

/** Values from .env.local, without overriding what is already in the environment. */
export function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

// Run as a script
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const env = { ...readEnvFile(path.resolve('.env.local')), ...process.env };
  const { errors, warnings } = checkAppBuildEnv(env);

  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  if (errors.length > 0) {
    console.error('\nThis build should not go into the app:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log('App build settings look right.');
}
