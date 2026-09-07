import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim(); });
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const db = admin.database();

// 1) الفئات المسموح بها فقط (عربية/رياضية مهمة)
const ALLOWED_CATS = [
  'beIN SPORTS',
  'ALWAN SPORTS',
  'THAMANYA SPORTS',
  'SHAHID SPORTS',
  'AD SPORTS',
  'ON SPORTS',
  'ALKASS SPORTS',
  'STC SPORTS',
  'EGYPTIAN CLUBS',
  'DAZN SPORTS',
  'WWE',
];

// 2) حذف الفئات الغريبة بالكامل
const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const cats = raw.categories || [];
for (const c of cats) {
  if (!ALLOWED_CATS.includes(c)) {
    await db.ref('/' + c).remove();
    console.log('DELETED CATEGORY:', c);
  }
}
await db.ref('/categories').set(ALLOWED_CATS.filter(c => raw[c]));

// 3) داخل الفئات المسموحة، احذف القنوات الإنجليزية/الأجنبية
const EN_PATTERNS = [
  // country codes
  /\b(DE|IT|PT|UK|NZ|ES|FR|TR|USA|US)\b/i,
  // english/french/foreign words in name
  /\b(english|france|turkey|espanol|australia|poland|portugal|romania|croatia|bulgaria|greece|serbia|ireland|brasil|argentina|chile|qatar)\b/i,
  // non-Arabic specific channels
  /\b(sky sport|sky cinema|tnt sport|dazn \d|dazn (la|f1|spain|bar)|eleven sport|bally|nova sport|astro|digi|sport tv|premier|cw|tbs|ufm|gobx|sony ten)\b/i,
];
// كلمات إنجليزية مش محتاجينها
const EN_ONLY = [
  'english', 'france', 'turkey', 'espanol', 'australia', 'usa', 'uk',
  'poland', 'portugal', 'romania', 'croatia', 'bulgaria', 'greece',
  'serbia', 'ireland', 'brasil', 'argentina', 'chile', 'nz', 'de',
];

let removed = 0;
const updates = {};
for (const cat of ALLOWED_CATS) {
  const d = raw[cat];
  if (!d) continue;
  for (const [id, l] of Object.entries(d)) {
    if (!l || !l.name) continue;
    const n = l.name.toLowerCase();
    let shouldRemove = false;
    // لو الاسم إنجليزي بالكامل (مفيش حروف عربية)
    const hasArabic = /[\u0600-\u06FF]/.test(l.name);
    const hasEnglish = /[a-zA-Z]/.test(l.name);
    // قنوات beIN/english/france/turkey إلخ
    for (const p of EN_PATTERNS) {
      if (p.test(n)) { shouldRemove = true; break; }
    }
    // كلمات EN فقط
    for (const w of EN_ONLY) {
      if (n.includes(w)) { shouldRemove = true; break; }
    }
    // استثناء: beIN Sports 1-9 (الأسماء الأساسية) و ON Sport و AD Sport
    if (shouldRemove && /^(beIN\s+Sport[s]?\s*\d)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(ON\s+Sport)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(AD\s+Sport)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(Alkass|الكأس)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(Shahid\s+Sports?\s*\d)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(Alwan|الوان)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(ثمانية)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(STC)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(DAZN\s+\d)/i.test(l.name)) shouldRemove = false;
    if (shouldRemove && /^(WWE)/i.test(l.name)) shouldRemove = false;
    
    if (shouldRemove) {
      updates['/' + cat + '/' + id] = null;
      removed++;
      console.log('DEL:', cat, '|', l.name);
    }
  }
}
console.log('Removing', removed, 'foreign channels');
if (removed) await db.ref('/').update(updates);

// 4) Final count
const snap2 = await db.ref('/').once('value');
const raw2 = snap2.val() || {};
let total = 0;
const per = {};
for (const c of raw2.categories || []) {
  const d = raw2[c];
  if (!d) continue;
  const n = Object.keys(d).length;
  if (n === 0) { await db.ref('/' + c).remove(); continue; }
  total += n;
  per[c] = n;
}
console.log('Final:', total, 'links in', Object.keys(per).length, 'categories');
console.log(JSON.stringify(per, null, 1));
process.exit(0);
