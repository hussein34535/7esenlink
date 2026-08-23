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

// 2) Clean name: remove [source tags] and (country) but KEEP quality
function cleanName(name) {
  let n = name.replace(/\[[^\]]*\]/g, '');
  n = n.replace(/\s*\|\s*[^\|]+$/, '');
  n = n.replace(/\s*\([^)]*\)/g, '');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

// 3) Group by clean lowercase name (quality preserved)
const groups = {};
for (const e of entries) {
  const clean = cleanName(e.name);
  const key = clean.toLowerCase();
  if (!groups[key]) groups[key] = [];
  groups[key].push({ ...e, cleanName: clean });
}

console.log('Unique categories:', Object.keys(groups).length);

// 4) Clear old
const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const oldCats = Array.isArray(raw.categories) ? raw.categories : Object.keys(raw.categories || {});
for (const c of oldCats) {
  await db.ref('/' + c).remove();
}
await db.ref('/categories').remove();
console.log('Old cleared');

// 5) Build — use the SAME key for category list AND data path
const newCats = Object.keys(groups).sort();
await db.ref('/categories').set(newCats);

let batch = {};
let count = 0;
for (const cat of newCats) {
  const links = groups[cat];
  const displayName = links[0].cleanName;
  for (let i = 0; i < links.length; i++) {
    const linkNum = i === 0 ? '' : ' ' + (i + 1);
    const linkName = displayName + linkNum;
    // Use cat directly as the path key (lowercase with spaces -> Firebase handles it)
    batch['/' + cat + '/' + (i + 1)] = {
      id: i + 1,
      name: linkName,
      original: links[i].url,
      converted: '/api/stream/' + encodeURIComponent(cat) + '/' + (i + 1),
      category: cat,
      createdAt: new Date().toISOString()
    };
    count++;
  }
}
await db.ref('/').update(batch);
console.log('Written', count, 'links in', newCats.length, 'categories');

// 6) Verify
let multi = 0;
for (const cat of newCats) {
  const n = groups[cat].length;
  if (n > 1) {
    multi++;
    if (multi <= 10) {
      const names = groups[cat].map(e => e.cleanName);
      console.log(`  ${cat}: ${n} links -> ${names.join(' | ')}`);
    }
  }
}
console.log('Multi-link categories:', multi);
process.exit(0);
