import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
    process.env[m[1].trim()] = v;
  }
}
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const db = admin.database();
const snap = await db.ref('/categories').once('value');
const cats = snap.val() || [];
console.log('Total categories:', cats.length);
console.log('Sample categories (first 30):');
for (const c of cats.slice(0, 30)) {
  const s = await db.ref('/' + c).once('value');
  const v = s.val();
  const n = v ? Object.keys(v).length : 0;
  const first = v ? Object.values(v)[0] : null;
  console.log(`  ${c} (${n} link) -> ${first ? first.name : '?'}`);
}
process.exit(0);
