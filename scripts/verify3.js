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
console.log('\n--- First 25 categories ---');
for (const c of cats.slice(0, 25)) {
  const s = await db.ref('/' + encodeURIComponent(c)).once('value');
  const v = s.val();
  const n = v ? Object.keys(v).length : 0;
  const first = v ? Object.values(v)[0] : null;
  console.log(`  "${c}" (${n} link) -> ${first ? first.name : '?'} | ${first ? first.original.substring(0, 60) : '?'}`);
}
console.log('\n--- Categories with 2+ links ---');
let multi = 0;
for (const c of cats) {
  const s = await db.ref('/' + encodeURIComponent(c)).once('value');
  const v = s.val();
  const n = v ? Object.keys(v).length : 0;
  if (n > 1) {
    multi++;
    if (multi <= 10) {
      const links = Object.values(v);
      console.log(`  "${c}":`);
      for (const l of links) console.log(`    -> ${l.name} | ${l.original.substring(0, 70)}`);
    }
  }
}
console.log('Total multi:', multi);
process.exit(0);
