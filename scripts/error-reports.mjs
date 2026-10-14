/**
 * The fault reports the app has sent (src/lib/errorReports.ts), newest first.
 * Read-only. The reports name no account and hold no position.
 *
 *   node scripts/error-reports.mjs [days back, default 7] [--emulator]
 *
 * Against the live project it uses the signed-in Google account on this
 * computer (gcloud application-default credentials).
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const local = args.includes('--emulator');
const days = Number(args.find((a) => /^\d+$/.test(a)) ?? 7);
if (local) process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
else delete process.env.FIRESTORE_EMULATOR_HOST;

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const admin = createRequire(join(repo, 'functions', 'package.json'))('firebase-admin');
admin.initializeApp({ projectId: local ? 'demo-wakaguard' : 'routepulse-5701f' });

const since = admin.firestore.Timestamp.fromMillis(Date.now() - days * 24 * 60 * 60 * 1000);
const reports = await admin.firestore().collection('errorReports')
  .where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(200).get();
const lagos = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

console.log(`${reports.size} fault report(s) in the last ${days} day(s), Nigeria time:`);
const same = new Map();
for (const doc of reports.docs) {
  const r = doc.data();
  const key = `${r.build}|${r.message}`;
  same.set(key, (same.get(key) ?? 0) + 1);
  console.log(`${lagos.format(r.createdAt.toMillis())} | build ${r.build} ${r.platform} | ${r.device} | ${r.where}\n    ${r.message}`);
}
if (same.size) {
  console.log('\nMost often:');
  for (const [key, count] of [...same].sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(`  ${count} x build ${key.replace('|', ': ')}`);
}
await admin.app().delete();
