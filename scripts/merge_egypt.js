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

// الفئات المصرية اللي هندمجها
const EGY = ['ahly', 'zamalek', 'on sport', 'mbc', 'mbc hd'];
const ORDER = [
  'bein', 'alwan', 'thamanya', 'shahid', 'ad sport',
  'egypt', 'alkass hd', 'stc',
  'dazn', 'wwe', 'starzplay', 'eleven', 'sky',
];

const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const cats = raw.categories || [];

// اجمع القنوات المصرية
let egyLinks = [];
const newRaw = {};

for (const cat of cats) {
  const catData = raw[cat];
  if (!catData) continue;
  
  if (EGY.includes(cat)) {
    // ضيف لفئة egypt
    for (const [id, link] of Object.entries(catData)) {
      if (!link) continue;
      egyLinks.push({ ...link, oldCat: cat });
    }
  } else {
    newRaw[cat] = catData;
  }
}

console.log('Egyptian channels:', egyLinks.length);

// رتب الفئات الجديدة
const sortedCats = [];
for (const o of ORDER) {
  if (o === 'egypt') continue;
  if (newRaw[o]) sortedCats.push(o);
}
// ضيف egypt في مكانها
const egyIdx = ORDER.indexOf('egypt');
sortedCats.splice(Math.min(egyIdx, sortedCats.length), 0, 'egypt');
// أي فئات متبقية
for (const c of Object.keys(newRaw).sort()) {
  if (!sortedCats.includes(c)) sortedCats.push(c);
}

await db.ref('/categories').set(sortedCats);

// اكتب القنوات المصرية تحت egypt
if (egyLinks.length > 0) {
  const egyBatch = {};
  egyLinks.forEach((link, i) => {
    egyBatch['/' + (i + 1)] = {
      id: i + 1,
      name: link.name,
      original: link.original,
      converted: '/api/stream/egypt/' + (i + 1),
      category: 'egypt',
      createdAt: new Date().toISOString()
    };
  });
  await db.ref('/egypt').set(egyBatch);
  console.log('Egypt category:', egyLinks.length, 'links');
}

console.log('Final order:', sortedCats.join(' > '));
process.exit(0);
