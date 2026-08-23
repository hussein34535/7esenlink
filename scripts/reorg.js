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

// 1) Parse M3U
const m3u = readFileSync('C:\\Users\\husso\\Downloads\\GENRAL_PRIME\\SPORTS_KEPT_529.m3u', 'utf8');
const lines = m3u.split('\n');
const entries = [];
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].startsWith('#EXTINF')) continue;
  const logoMatch = lines[i].match(/tvg-logo="([^"]*)"/);
  const name = (lines[i].split(',')[1] || '').trim();
  const url = (lines[i+1] || '').trim();
  if (name && url.startsWith('http')) entries.push({ name, url, logo: logoMatch ? logoMatch[1] : '' });
}
console.log('Total entries:', entries.length);

// 2) Normalize: strip quality/link-number/source-tag to get base channel name
function normalize(name) {
  let n = name.trim();
  n = n.replace(/\[[^\]]*\]/g, ''); // remove [source tags]
  n = n.replace(/\([^)]*\)/g, ''); // remove (country)
  n = n.replace(/\s*\|\s*.*$/, ''); // remove "| arabic name" part
  n = n.replace(/\b(4K|FHD|FULL HD|HD|SD|UHD|MULTI|HEVC|H265|VIP|LIVE|LOCAL)\b/gi, '');
  n = n.replace(/\s+\d+$/, ''); // strip trailing number (link number)
  n = n.replace(/\s+/g, ' ').trim();
  return n.toLowerCase();
}

// 3) Group by normalized base name
const groups = {};
for (const e of entries) {
  const base = normalize(e.name);
  if (!base) base = e.name.toLowerCase();
  if (!groups[base]) groups[base] = [];
  groups[base].push(e);
}
console.log('Unique channels:', Object.keys(groups).length);

// 4) Delete old data
const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const oldCats = Array.isArray(raw.categories) ? raw.categories : Object.keys(raw.categories || {});
for (const c of oldCats) {
  await db.ref('/' + c).remove();
}
await db.ref('/categories').remove();
console.log('Old data cleared');

// 5) Build new structure
const newCats = Object.keys(groups).sort();
await db.ref('/categories').set(newCats);

let batch = {};
let count = 0;
for (const cat of newCats) {
  const links = groups[cat];
  // Display name: use first entry's cleaned name
  const displayName = links[0].name.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < links.length; i++) {
    const linkNum = i === 0 ? '' : ' ' + (i + 1);
    const linkName = displayName + linkNum;
    const link = {
      id: i + 1,
      name: linkName,
      original: links[i].url,
      converted: '/api/stream/' + encodeURIComponent(cat) + '/' + (i + 1),
      category: cat,
      createdAt: new Date().toISOString()
    };
    batch['/' + cat + '/' + (i + 1)] = link;
    count++;
  }
}
// Batch write
await db.ref('/').update(batch);
console.log('Written', count, 'links in', newCats.length, 'categories');
console.log('Sample categories:', newCats.slice(0, 20));
process.exit(0);
