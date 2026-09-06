# قواعد 7esenlink — اقرأ قبل أي تعديل

## الممنوع نهائياً
- قنوات أفلام / مسلسلات / دراما / سينما
- قنوات أطفال / كرتون / أنمي
- قنوات دينية / قرآن / إسلامية
- قنوات موسيقى / أغاني / راديو
- قنوات وثائقية / ناشونال جيوغرافيك
- قنوات تركية / هندية / بوليوود / كورية
- أي قناة مش رياضية

## الكلمات الممنوعة (فلتر تلقائي)
```
movie, film, aflam, أفلام, افلام, مسلسل, mosalsal, series, drama, cinema,
kids, أطفال, atfal, cartoon, anime, انمي, quran, قرآن, din, دين, islamic,
music, aghani, أغاني, bollywood, entertainment, turkey, تركي, korea,
mosalsalat, star world, nat geo, wild, fox life, gourmet, fatafeat, jeem,
baraem, bbc, comedy, horror, love, fm radio, radio, turkish, persia, loud
```

## الترتيب الثابت للفئات
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
10. STARZPLAY SPORTS
11. KURDISH SPORTS
12. ARAB SPORTS
13. DAZN SPORTS
14. MAX SPORTS
15. SKY SPORTS
16. TNT SPORTS
17. VIP SPORTS
18. SPORT TV
19. WWE
```

## قواعد الروابط
- كل رابط لازم يكون: `https://live.7esentv.com/sports-api/live/testuser/Test1234/{id}.m3u8`
- **ممنوع** IP مباشر (`193.233.219.4:8088`) — استخدم الدومين دايماً
- **ممنوع** Cloudflare Worker (`workers.dev`) — بيرجع 403
- **ممنوع** HTTP (`http://`) — استخدم HTTPS فقط

## لو المستخدم قال "رتب" أو "ظبط"
1. امسح أي قناة فيها كلمة من قائمة الممنوع
2. جيب البث الشغال من `https://live.7esentv.com/sports-api/player_api.php?username=testuser&password=Test1234&action=get_live_streams`
3. وزّع القنوات الشغالة على الفئات بالترتيب الثابت
4. القنوات اللي مش رياضية → **احذفها فوراً بدون سؤال**
