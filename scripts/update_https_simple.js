import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim();
  }
}
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const db = admin.database();

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
    // Replace http://193.233.219.4:8088 with https://193.233.219.4/sports-api
    const newUrl = link.original.replace(
      'http://193.233.219.4:8088',
      'https://193.233.219.4/sports-api'
    );
    if (newUrl !== link.original) {
      updates['/' + cat + '/' + id + '/original'] = newUrl;
      count++;
    }
  }
}
console.log('Updating', count, 'links to HTTPS...');
await db.ref('/').update(updates);
console.log('Done!');
// verify
const test = await db.ref('/bein/1').once('value');
if (test.exists()) console.log('sample:', test.val().original);
process.exit(0);
