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
  let n = name.replace(/\[[^\]]*\]/g, ''); // remove [source tag]
  n = n.replace(/\s*\|\s*[^\|]+$/, ''); // remove "| arabic name" part (keep first part only)
  n = n.replace(/\s*\([^)]*\)/g, ''); // remove (country)
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

// 3) Group by CLEAN name (quality KEPT!)
const groups = {};
for (const e of entries) {
  const clean = cleanName(e.name);
  const key = clean.toLowerCase();
  if (!groups[key]) groups[key] = [];
  groups[key].push({ ...e, cleanName: clean });
}

console.log('Unique channel+quality categories:', Object.keys(groups).length);

// 4) Clear old data
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
  const displayName = links[0].cleanName;
  for (let i = 0; i < links.length; i++) {
    const linkNum = i === 0 ? '' : ' ' + (i + 1);
    const linkName = displayName + linkNum;
    // slug for category: keep letters, numbers, spaces -> dashes
    const slug = cat.replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const link = {
      id: i + 1,
      name: linkName,
      original: links[i].url,
      converted: '/api/stream/' + encodeURIComponent(slug) + '/' + (i + 1),
      category: slug,
      createdAt: new Date().toISOString()
    };
    batch['/' + slug + '/' + (i + 1)] = link;
    count++;
  }
}
await db.ref('/').update(batch);
console.log('Written', count, 'links in', newCats.length, 'categories');

// 6) Show samples
const samples = newCats.filter(c => groups[c].length > 1).slice(0, 15);
for (const s of samples) {
  const names = groups[s].map(e => e.cleanName);
  console.log(`  ${s}: ${groups[s].length} links -> ${names.join(', ')}`);
}
console.log('Categories with multiple links:', samples.length, '(showing first 15)');
process.exit(0);
