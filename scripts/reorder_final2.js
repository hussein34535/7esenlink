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

// 1) الترتيب المطلوب
const ORDER = [
  'bein', 'bein 4k', 'bein hd',
  'alwan', 'alwan 4k',
  'thamanya', 'thamanya 4k', 'thamanya hd',
  'shahid', 'shahid 4k',
  'ad sport',
  'mbc', 'mbc hd',
  'on sport', 'on sport hd', 'on sport 4k',
  'alkass hd',
  'stc',
  'ahly', 'zamalek',
  'dazn', 'wwe', 'starzplay', 'eleven', 'sky',
];

// 2) الفئات اللي هنشيل (مش رياضية مهمة)
const DELETE = ['cw', 'bally', 'tbs', 'ufm', 'gobx', 'ku:', 'ku:aso', 'bbc', 'baraeam', 'fatafeat', 'gorment', 'jeem', 'premier'];

// 3) اقرأ كل حاجة
const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const cats = raw.categories || [];

// 4) اجمع كل القنوات في مكان واحد
const allLinks = [];
for (const cat of cats) {
  const catData = raw[cat];
  if (!catData) continue;
  for (const [id, link] of Object.entries(catData)) {
    if (!link || !link.original) continue;
    allLinks.push({ ...link, oldCat: cat });
  }
}
console.log('Total links:', allLinks.length);

// 5) صنف كل قناة
function classify(link) {
  const name = (link.name || '').toLowerCase();
  const cat = (link.category || '').toLowerCase();

  // استخدم الفئة الموجودة لو مطابقة
  for (const o of ORDER) {
    if (cat === o || cat.startsWith(o + ' ') || cat === o.replace(/ /g, '-')) return o;
  }

  // ابحث في الاسم
  if (name.includes('bein') || name.includes('be in')) {
    if (name.includes('4k')) return 'bein 4k';
    if (name.includes('hd')) return 'bein hd';
    return 'bein';
  }
  if (name.includes('alwan') || name.includes('الوان')) {
    if (name.includes('4k')) return 'alwan 4k';
    return 'alwan';
  }
  if (name.includes('ثمانية') || name.includes('tham')) {
    if (name.includes('4k')) return 'thamanya 4k';
    if (name.includes('hd')) return 'thamanya hd';
    return 'thamanya';
  }
  if (name.includes('shahid') || name.includes('شاهد')) {
    if (name.includes('4k')) return 'shahid 4k';
    return 'shahid';
  }
  if (name.includes('ad sport') || name.includes('ابو ظبي')) return 'ad sport';
  if (name.includes('mbc')) {
    if (name.includes('hd')) return 'mbc hd';
    return 'mbc';
  }
  if (name.includes('on sport') || name.includes('on sport')) return 'on sport';
  if (name.includes('alkass') || name.includes('كاس')) return 'alkass hd';
  if (name.includes('stc')) return 'stc';
  if (name.includes('الاهلي') || name.includes('ahly')) return 'ahly';
  if (name.includes('الزمالك') || name.includes('zamalek')) return 'zamalek';
  if (name.includes('dazn')) return 'dazn';
  if (name.includes('wwe')) return 'wwe';
  if (name.includes('starzplay')) return 'starzplay';
  if (name.includes('eleven')) return 'eleven';
  if (name.includes('sky')) return 'sky';
  if (name.includes('on sport') || name.includes('on')) return 'on sport';

  // فئات للحذف
  for (const d of DELETE) {
    if (cat.includes(d) || name.includes(d)) return '__DELETE__';
  }

  return null; // مش عارفين تصنفها
}

// 6) صنف واحذف
const kept = {};
const deleted = [];
for (const link of allLinks) {
  const newCat = classify(link);
  if (newCat === '__DELETE__') {
    deleted.push(link);
    continue;
  }
  if (newCat === null) {
    // حاول تصنفها من الفئة القديمة
    const oldCat = link.category.toLowerCase();
    let matched = false;
    for (const o of ORDER) {
      if (oldCat.includes(o.split(' ')[0])) {
        if (!kept[o]) kept[o] = [];
        kept[o].push(link);
        matched = true;
        break;
      }
    }
    if (!matched) {
      deleted.push(link);
    }
    continue;
  }
  if (!kept[newCat]) kept[newCat] = [];
  kept[newCat].push(link);
}

console.log('Kept categories:', Object.keys(kept).length);
console.log('Deleted:', deleted.length);

// 7) امسح القديم واكتب الجديد
for (const c of cats) {
  await db.ref('/' + c).remove();
}
await db.ref('/categories').remove();

// 8) رتب الفئات حسب ORDER
const sortedCats = [];
for (const o of ORDER) {
  if (kept[o] && kept[o].length > 0) sortedCats.push(o);
}
// أضف أي فئات متبقية مش في ORDER
for (const k of Object.keys(kept).sort()) {
  if (!sortedCats.includes(k)) sortedCats.push(k);
}

await db.ref('/categories').set(sortedCats);

// 9) اكتب الروابط
let batch = {};
let count = 0;
for (const cat of sortedCats) {
  const links = kept[cat];
  for (let i = 0; i < links.length; i++) {
    const e = links[i];
    let displayName = (e.name || '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    // Number duplicates
    const sameCount = links.slice(0, i).filter(l => {
      const ln = (l.name || '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      return ln === displayName.toLowerCase();
    }).length;
    if (sameCount > 0) displayName = displayName + ' ' + (sameCount + 1);

    batch['/' + cat + '/' + (i + 1)] = {
      id: i + 1,
      name: displayName,
      original: e.original,
      converted: '/api/stream/' + encodeURIComponent(cat) + '/' + (i + 1),
      category: cat,
      createdAt: new Date().toISOString()
    };
    count++;
  }
}
await db.ref('/').update(batch);
console.log('Written', count, 'links in', sortedCats.length, 'categories');
console.log('\nFinal order:');
sortedCats.forEach((c, i) => console.log(`  ${i + 1}. ${c} (${kept[c].length})`));
process.exit(0);
