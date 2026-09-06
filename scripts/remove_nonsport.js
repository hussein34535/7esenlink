import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => { const m = l.match(/^([^#=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim(); });
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const db = admin.database();

const BANNED = ['movie','film','aflam','أفلام','افلام','مسلسل','mosalsal','series','drama','cinema','kids','اطفال','atfal','cartoon','anime','انمي','quran','قرآن','قران','din','دين','islamic','music','aghani','أغاني','اغاني','bollywood','entertainment','turkey','turki','تركي','korea','bolly','mosalsalat','star world','nat geo','wild','fox life','gourmet','fatafeat','jeem','baraem','braem','bbc','comedy','horror','love','fm radio','radio','turkish','persia','loud'];

const snap = await db.ref('/').once('value');
const raw = snap.val() || {};
const cats = raw.categories || [];
let removed = 0;
const updates = {};
for (const cat of cats) {
  const d = raw[cat];
  if (!d) continue;
  for (const [id, l] of Object.entries(d)) {
    if (!l || !l.name) continue;
    const n = l.name.toLowerCase();
    if (BANNED.some(k => n.includes(k))) {
      updates['/' + cat + '/' + id] = null;
      removed++;
    }
  }
}
console.log('Removing', removed, 'non-sports links');
if (removed) await db.ref('/').update(updates);

// Final count
const snap2 = await db.ref('/').once('value');
const raw2 = snap2.val() || {};
let total = 0;
const per = {};
for (const c of raw2.categories || []) {
  const d = raw2[c];
  if (!d) continue;
  const n = Object.keys(d).length;
  total += n;
  per[c] = n;
}
console.log('Final:', total, 'links in', Object.keys(per).length, 'categories');
console.log(JSON.stringify(per, null, 1));
process.exit(0);
