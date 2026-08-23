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

const NEW_BASE = 'https://ooo-hand-simulations-writings.trycloudflare.com';
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
    // استبدل أي URL قديم بالـ HTTPS tunnel
    const match = link.original.match(/\/live\/testuser\/Test1234\/(\d+)\.m3u8/);
    if (match) {
      const newUrl = NEW_BASE + '/live/testuser/Test1234/' + match[1] + '.m3u8';
      updates['/' + cat + '/' + id + '/original'] = newUrl;
      count++;
    }
  }
}
console.log('Updating', count, 'links to HTTPS tunnel...');
await db.ref('/').update(updates);
console.log('Done!');
// اختبار عينة
const test = await db.ref('/' + cats[0] + '/1').once('value');
if (test.exists()) console.log('sample:', test.val().original.substring(0, 100));
process.exit(0);
