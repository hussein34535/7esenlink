import * as admin from 'firebase-admin';
import * as fs from 'fs/promises';
import { join } from 'path';
import { readFileSync } from 'fs';

// Load .env.local manually
try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
      process.env[m[1].trim()] = v;
    }
  }
} catch {}

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}';
let sa = {};
try { sa = JSON.parse(saRaw); } catch { sa = JSON.parse(saRaw.replace(/\n/g, '\\n')); }
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  });
}
const db = admin.database();

async function main() {
  // 1) اقرأ الملف الجديد من السيرفر (520 قناة)
  const dl = 'C:\\Users\\husso\\Downloads\\GENRAL_PRIME\\SPORTS_KEPT_520.m3u';
  let m3uContent: string;
  try { m3uContent = await fs.readFile(dl, 'utf8'); } catch {}
  if (!m3uContent) {
    try { m3uContent = await fs.readFile(join(process.cwd(), 'data', 'channels.m3u'), 'utf8'); } catch {}
  }
  if (!m3uContent) {
    console.error('No m3u found');
    return;
  }
  const lines = m3uContent.split('\n');
  const entries: {name:string, url:string, group:string}[] = [];
  for (let i=0;i<lines.length;i++) {
    if (lines[i].startsWith('#EXTINF')) {
      const g = lines[i].match(/group-title="([^"]*)"/)?.[1] || 'unknown';
      const n = lines[i].split(',').pop()?.trim() || 'Unknown';
      const url = lines[i+1]?.trim();
      if (url && url.startsWith('http')) entries.push({name:n, url, group:g});
    }
  }
  console.log('Found', entries.length, 'channels');

  // 2) احذف القديم
  console.log('Deleting old categories...');
  const snap = await db.ref('/').once('value');
  const raw = snap.val() || {};
  const cats: string[] = Array.isArray(raw.categories) ? raw.categories : Object.keys(raw.categories||{});
  for (const c of cats) {
    await db.ref(`/${c}`).remove();
    console.log(' removed', c);
  }
  await db.ref('/categories').remove();

  // 3) نظم الجديد حسب المصدر
  const byCat: Record<string, typeof entries> = {};
  for (const e of entries) {
    // group like "GENRAL - Bein Sport" -> category "genral"
    let cat = 'other';
    const low = (e.group + ' ' + e.name).toLowerCase();
    if (low.includes('genral')) cat = 'genral';
    else if (low.includes('prime')) cat = 'prime';
    else if (low.includes('oscar')) cat = 'oscar';
    else cat = e.group.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20) || 'other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(e);
  }
  const newCats = Object.keys(byCat);
  console.log('New categories:', newCats);
  await db.ref('/categories').set(newCats);

  let id = 1;
  for (const cat of newCats) {
    for (const e of byCat[cat]) {
      const link = {
        id,
        name: e.name,
        original: e.url,
        converted: `/api/stream/${cat}/${id}`,
        category: cat,
        createdAt: new Date().toISOString()
      };
      await db.ref(`/${cat}/${id}`).set(link);
      id++;
    }
  }
  console.log('Done, total', id-1);
}
main().catch(e=>{console.error(e); process.exit(1)});
