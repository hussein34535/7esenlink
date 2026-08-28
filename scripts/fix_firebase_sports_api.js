import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    let v = m[2].trim();
    process.env[m[1].trim()] = v;
  }
}
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const db = admin.database();

const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const cats = raw.categories || [];
let fixed = 0;
const updates = {};
for (const cat of cats) {
  const catData = raw[cat];
  if (!catData) continue;
  for (const [id, link] of Object.entries(catData)) {
    if (!link || !link.original) continue;
    if (link.original.includes('live.7esentv.com/live/') && !link.original.includes('/sports-api/')) {
      const newUrl = link.original.replace('live.7esentv.com/live/', 'live.7esentv.com/sports-api/live/');
      updates['/' + cat + '/' + id + '/original'] = newUrl;
      fixed++;
    }
  }
}
console.log('Fixing', fixed, 'links (adding /sports-api)');
if (fixed > 0) {
  await db.ref('/').update(updates);
  console.log('Done!');
} else {
  console.log('No links to fix');
}
// verify
const test = await db.ref('/' + cats[0] + '/1').once('value');
if (test.exists()) console.log('sample:', test.val().original);
process.exit(0);
