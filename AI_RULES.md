# 🤖 قواعد 7esenlink — اقرأ ده قبل أي تعديل

## ⚠️ القاعدة الذهبية
المشروع **رياضة فقط** — ممنوع أي قناة أفلام أو مسلسلات أو غير رياضية. لو لقيت أي قناة مش رياضية **احذفها فوراً بدون سؤال**.

---

## 🚫 الممنوع نهائياً (احذف فوراً)

### أنواع قنوات ممنوعة:
- أفلام / مسلسلات / دراما / سينما
- أطفال / كرتون / أنمي
- دينية / قرآن / إسلامية
- موسيقى / أغاني / راديو
- وثائقية / ناشونال جيوغرافيك
- تركية / هندية / بوليوود / كورية
- أي قناة مش رياضية

### فئات ممنوعة (احذف الفئة كاملة):
- Sky Sports / Sky Cinema / TNT Sports / DAZN (النسخ الأجنبية)
- Bally Sports / Nova Sports / Max Sport / Astro / Digi / Eleven
- Sport TV / Premier / CW / TBS / UFM / GOBX / SONY TEN
- Kurdish Sports / Vixsrc / StarzPlay

### كلمات ممنوعة في أسماء القنوات (فلتر تلقائي):
```
movie, film, aflam, أفلام, افلام, مسلسل, mosalsal, series, drama, cinema,
kids, أطفال, atfal, cartoon, anime, انمي, quran, قرآن, din, دين, islamic,
music, aghani, أغاني, bollywood, entertainment, turkey, تركي, korea,
mosalsalat, star world, nat geo, wild, fox life, gourmet, fatafeat, jeem,
baraem, bbc, comedy, horror, love, fm radio, radio, turkish, persia, loud,
english, france, turkey, espanol, australia, usa, uk, poland, portugal,
romania, croatia, bulgaria, greece, serbia, ireland, brasil, argentina, chile
```

### قنوات غير عربية (احذف):
- أي قناة اسمها إنجليزي بالكامل ومش من القنوات الأساسية
- beIN english / france / turkey / australia / usa
- DAZN مع أسماء دول (DE, IT, PT, ES, UK)
- Sky Sport DE/IT/UK/NZ
- TNT Sports UK/Brasil/Argentina

---

## ✅ الفئات المسموح بها فقط (بالترتيب)

```
1. beIN SPORTS
2. ALWAN SPORTS
3. THAMANYA SPORTS
4. SHAHID SPORTS
5. AD SPORTS
6. ON SPORTS
7. ALKASS SPORTS
8. STC SPORTS
9. EGYPTIAN CLUBS (الأهلي + الزمالك)
10. DAZN SPORTS
11. WWE
```

---

## 🔗 قواعد الروابط

- كل رابط: `https://live.7esentv.com/sports-api/live/testuser/Test1234/{id}.m3u8`
- **ممنوع** IP مباشر (`193.233.219.4:8088`) — الدومين دايماً
- **ممنوع** HTTP — HTTPS فقط
- **ممنوع** Cloudflare Worker (`workers.dev`) — بيرجع 403

---

## 🔃 مصادر القنوات (كيفية الجلب)

| المصدر | API | الحالة |
|---|---|---|
| **GENRAL** | `https://koralive.lol/aghmdev/kooralive/api/v3` أو `https://high-rez.vevi-cobty-14-b.club/...` | ممكن يقع (404) |
| **PRIME** | PocketBase: `https://primeott.sytes.net/pb/api/collections/...` | ممكن يقع (503) |
| **OSCAR** | Cloudflare Worker: `still-dust-c9ae.manon-lol2000.workers.dev` | الأكثر استقراراً |

**التوكنات:** GENRAL يحتاج توكن SHA1 يتبني كل 3 ساعات — السيرفر `/root/sports_api.py` بيبنيه تلقائي.

**التجديد:** `sports-refresh.timer` كل 90 دقيقة يسحب من المصادر الثلاثة ويحدّث `/root/sports_data.json`.

---

## 📋 خطوات الترتيب (لما المستخدم يقول "رتب" أو "ظبط")

1. **امسح** أي قناة فيها كلمة من الممنوع (فوراً، بدون سؤال)
2. **احذف** الفئات الفارغة أو الغريبة
3. **اجلب** القنوات الشغالة من `player_api.php?action=get_live_streams`
4. **وزّع** القنوات على الفئات بالترتيب الثابت أعلاه
5. **رتب** القنوات داخل كل فئة بالرقم تصاعدي (bein 1، bein 2، bein 3...)
6. **الأولوية** للقنوات الشغالة (200 OK) — لو القناة ميتة بدّلها أو احذفها

## 📋 خطوات إضافة قنوات جديدة (لما المستخدم يستورد M3U)

1. فك تشفير الـ M3U (لو مشفر)
2. طبّق فلتر الممنوع فوراً
3. صنّف كل قناة في الفئة الصح
4. استبدل الرابط بـ `https://live.7esentv.com/sports-api/live/...`
5. احذف أي قناة مش رياضية

---

## 🖥️ السيرفر (193.233.219.4)

| الخدمة | المنفذ | الملف |
|---|---|---|
| sports_api | :8088 | `/root/sports_api.py` |
| catmap-guard | — | `/root/catmap_guard.py` |
| sports-refresh | timer 90د | `/etc/systemd/system/sports-refresh.*` |
| XUI One | :80/:443 | `/home/xui/service` |

### SSH
```
root / O3e8LgxVwtCJ @ 193.233.219.4
```

### IPTV
```
https://live.7esentv.com/sports-api
testuser / Test1234
```

### سكريبتات مفيدة
```bash
python3 /root/sports_api.py refresh        # تجديد يدوي
systemctl restart sports-api               # إعادة تشغيل
journalctl -u sports-api -n 20             # سجلات
```
