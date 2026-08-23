import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
for (const line of env.split(String.fromCharCode(10))) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    let v = m[2].trim();
    process.env[m[1].trim()] = v;
  }
}
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const db = admin.database();
const WORKER = 'https://hi.husseinh2711.workers.dev/?url=';
const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const cats = raw.categories || [];
let count = 0;
const updates = {};
for (const cat of cats) {
  const catData = raw[cat];
  if (!catData) continue;
  for (const [id, link] of Object.entries(catData)) {
    if (!link || !link.original) continue;
    if (link.original.includes('workers.dev')) continue;
    const proxied = WORKER + encodeURIComponent(link.original) + String.fromCharCode(38) + 'ua=' + encodeURIComponent('VLC/3.0.18 LibVLC/3.0.18');
    updates['/' + cat + '/' + id + '/original'] = proxied;
    count++;
  }
}
console.log('Updating', count, 'links to use worker proxy...');
await db.ref('/').update(updates);
console.log('Done!');
process.exit(0);
