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

// 2) Extract GROUP (bein/alwan/thamanya/ad sport/on sport/etc) + QUALITY (hd/4k/fhd/sd)
function extractGroup(name) {
  let n = name.toLowerCase();
  // Remove source tags and extra info
  n = n.replace(/\[[^\]]*\]/g, '').trim();
  // Detect group
  if (n.includes('bein')) return 'bein';
  if (n.includes('alwan') || n.includes('الوان')) return 'alwan';
  if (n.includes('tham') || n.includes('ثمانية')) return 'thamanya';
  if (n.includes('ad sport') || n.includes('ابو ظبي')) return 'ad sport';
  if (n.includes('on sport') || n.includes('on sport')) return 'on sport';
  if (n.includes('alkass') || n.includes('كاس')) return 'alkass';
  if (n.includes('shahid')) return 'shahid';
  if (n.includes('mbc')) return 'mbc';
  if (n.includes('stc')) return 'stc';
  if (n.includes('dazn')) return 'dazn';
  if (n.includes('wwe')) return 'wwe';
  if (n.includes('starzplay')) return 'starzplay';
  if (n.includes('nova')) return 'nova';
  if (n.includes('ziggo')) return 'ziggo';
  if (n.includes('eleven')) return 'eleven';
  if (n.includes('sport tv')) return 'sport tv';
  if (n.includes('sky')) return 'sky';
  if (n.includes('tnt')) return 'tnt';
  if (n.includes('sony')) return 'sony';
  if (n.includes('astro')) return 'astro';
  if (n.includes('bally')) return 'bally';
  if (n.includes('max sport')) return 'max sport';
  if (n.includes('digi')) return 'digi';
  if (n.includes('arena')) return 'arena';
  if (n.includes('الاهلي') || n.includes('ahly')) return 'ahly';
  if (n.includes('الزمالك') || n.includes('zamalek')) return 'zamalek';
  if (n.includes('ملخص') || n.includes('اهداف')) return 'ملخصات';
  if (n.includes('oman')) return 'oman';
  if (n.includes('sharjah')) return 'sharjah';
  if (n.includes('iraq')) return 'iraq';
  if (n.includes('supersport')) return 'supersport';
  // fallback: first word
  const first = n.split(' ')[0];
  return first || 'other';
}

function extractQuality(name) {
  const n = name.toLowerCase();
  if (n.includes('4k') || n.includes('uhd')) return '4k';
  if (n.includes('fhd') || n.includes('full hd') || n.includes('1080')) return 'fhd';
  if (n.includes('hd') && !n.includes('fhd') && !n.includes('4k') && !n.includes('uhd')) return 'hd';
  if (n.includes('sd')) return 'sd';
  return ''; // no quality specified = default
}

// 3) Group by group+quality
const groups = {};
for (const e of entries) {
  const grp = extractGroup(e.name);
  const qual = extractQuality(e.name);
  const catKey = qual ? grp + ' ' + qual : grp;
  if (!groups[catKey]) groups[catKey] = [];
  groups[catKey].push(e);
}

console.log('Categories:', Object.keys(groups).length);
for (const [k, v] of Object.entries(groups).sort((a,b) => b[1].length - a[1].length).slice(0, 20)) {
  console.log(`  ${k}: ${v.length} links`);
}

// 4) Clear old data
const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const oldCats = Array.isArray(raw.categories) ? raw.categories : Object.keys(raw.categories || {});
for (const c of oldCats) {
  await db.ref('/' + c).remove();
}
await db.ref('/categories').remove();
console.log('Old cleared');

// 5) Write new structure
const newCats = Object.keys(groups).sort();
await db.ref('/categories').set(newCats);

let batch = {};
let count = 0;
for (const cat of newCats) {
  const links = groups[cat];
  for (let i = 0; i < links.length; i++) {
    const e = links[i];
    // Clean display name
    let displayName = e.name.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    // If same channel appears multiple times in this category, number it
    // Count how many times this exact name appears before this one
    const sameCount = links.slice(0, i).filter(l => 
      l.name.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().toLowerCase() === 
      displayName.toLowerCase()
    ).length;
    if (sameCount > 0) displayName = displayName + ' ' + (sameCount + 1);
    
    batch['/' + cat + '/' + (i + 1)] = {
      id: i + 1,
      name: displayName,
      original: e.url,
      converted: '/api/stream/' + encodeURIComponent(cat) + '/' + (i + 1),
      category: cat,
      createdAt: new Date().toISOString()
    };
    count++;
  }
}
await db.ref('/').update(batch);
console.log('Written', count, 'links in', newCats.length, 'categories');

// 6) Show samples
console.log('\n--- Sample categories ---');
for (const cat of newCats.slice(0, 20)) {
  const links = groups[cat];
  const names = links.map(e => e.name.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim());
  console.log(`  ${cat} (${links.length}): ${names.join(', ')}`);
}
process.exit(0);
