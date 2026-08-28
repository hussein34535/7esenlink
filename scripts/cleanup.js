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

const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const cats = new Set(raw.categories || []);
const allKeys = Object.keys(raw).filter(k => k !== 'categories');

// 1) Find orphaned nodes (not in /categories)
const orphans = allKeys.filter(k => !cats.has(k));
console.log('Orphaned nodes:', orphans.length);
for (const o of orphans.slice(0, 5)) {
  const n = raw[o] ? Object.keys(raw[o]).length : 0;
  console.log(' ', o, n, 'links');
}

// 2) Delete orphans
for (const o of orphans) {
  await db.ref('/' + o).remove();
  console.log('Deleted', o);
}
console.log('Orphans deleted');

// 3) Update visible links IP -> domain
const OLD = 'https://193.233.219.4/sports-api';
const NEW = 'https://live.7esentv.com';
let updated = 0;
const updates = {};
for (const cat of cats) {
  const data = raw[cat];
  if (!data) continue;
  for (const [id, link] of Object.entries(data)) {
    if (link && link.original && link.original.includes(OLD)) {
      updates['/' + cat + '/' + id + '/original'] = link.original.replace(OLD, NEW);
      updated++;
    }
  }
}
if (updated > 0) {
  await db.ref('/').update(updates);
}
console.log('Updated', updated, 'visible links to', NEW);
process.exit(0);
