import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const templatePath = path.resolve('public', 'sw.template.js');
const outPath = path.resolve('out', 'sw.js');

const map = {
  __FIREBASE_API_KEY__: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  __FIREBASE_AUTH_DOMAIN__: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  __FIREBASE_PROJECT_ID__: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  __FIREBASE_STORAGE_BUCKET__: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  __FIREBASE_MESSAGING_SENDER_ID__: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  __FIREBASE_APP_ID__: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

for (const [k, v] of Object.entries(map)) {
  if (!v) {
    console.error(`Missing env var for ${k}. Ensure NEXT_PUBLIC_FIREBASE_* exist when deploying.`);
    process.exit(1);
  }
}

let sw = fs.readFileSync(templatePath, 'utf8');
for (const [k, v] of Object.entries(map)) {
  sw = sw.replaceAll(k, v);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sw, 'utf8');

console.log(`Generated ${outPath}`);
