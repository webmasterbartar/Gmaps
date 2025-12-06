# راهنمای اجرای دو ربات هم‌زمان

## مرحله 1: تولید فایل‌های کوئری

روی سرور یا لوکال:

```bash
python3 generate-new-queries.py
```

این دستور دو فایل می‌سازه:
- `queries_elevator.txt` - کوئری‌های آسانسور (310 کوئری)
- `queries_painting.txt` - کوئری‌های نقاشی (434 کوئری)

## مرحله 2: انتقال فایل‌ها به سرور (اگر روی لوکال اجرا کردی)

```bash
scp queries_elevator.txt queries_painting.txt root@82.115.20.113:/root/Gmaps/
```

## مرحله 3: اجرای دو ربات هم‌زمان روی سرور

### ربات 1: آسانسور
```bash
cd Gmaps
nohup node index.js --file queries_elevator.txt --db-name elevator_scraper > scraper_elevator.log 2>&1 &
```

### ربات 2: نقاشی
```bash
cd Gmaps
nohup node index.js --file queries_painting.txt --db-name painting_scraper > scraper_painting.log 2>&1 &
```

## مرحله 4: چک کردن وضعیت

### دیدن لاگ‌های زنده
```bash
# ربات آسانسور
tail -f scraper_elevator.log

# ربات نقاشی
tail -f scraper_painting.log
```

### چک کردن پروسه‌ها
```bash
ps aux | grep "node index.js"
```

### چک کردن دیتابیس‌ها

#### دیتابیس آسانسور
```bash
mongosh
use elevator_scraper
db.contacts.countDocuments()
db.queries_progress.find({status: "completed"}).count()
exit
```

#### دیتابیس نقاشی
```bash
mongosh
use painting_scraper
db.contacts.countDocuments()
db.queries_progress.find({status: "completed"}).count()
exit
```

## متوقف کردن ربات‌ها

```bash
# متوقف کردن همه
pkill -f "node index.js"

# یا متوقف کردن یکی
ps aux | grep "node index.js"  # پیدا کردن PID
kill <PID>
```

## نکات مهم

1. **مصرف RAM**: هر ربات حدود 1-1.5GB RAM مصرف می‌کنه. با 7.5GB RAM، دو ربات هم‌زمان قابل اجراست.

2. **Rate Limiting**: هر ربات مستقل کار می‌کنه، پس احتمال بلاک شدن بیشتر می‌شه. اگر بلاک شدی، delay‌ها رو در `.env` افزایش بده.

3. **Resume Capability**: هر ربات می‌تونه از جایی که قطع شده ادامه بده (چون وضعیت کوئری‌ها در دیتابیس ذخیره می‌شه).

4. **مانیتورینگ**: هر چند ساعت یک‌بار لاگ‌ها و دیتابیس رو چک کن.

