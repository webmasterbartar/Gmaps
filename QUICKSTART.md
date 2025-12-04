# 🚀 راهنمای سریع اجرا

## تست سریع بدون MongoDB

اگر می‌خواهید **همین الان** برنامه رو تست کنید بدون نصب MongoDB:

```powershell
node test-simple.js
```

این نسخه:
- ✅ بدون MongoDB کار می‌کنه
- ✅ نتایج رو توی فایل `contacts-output.json` ذخیره می‌کنه
- ✅ فقط 10 کسب‌وکار اول هر query رو چک می‌کنه (سریع‌تر)
- ✅ 2 query تستی داره: "restaurants in Dubai" و "coffee shops in London"

---

## اجرای کامل با MongoDB (Production)

### مرحله 1: نصب MongoDB

**راه سریع (با Chocolatey):**
```powershell
choco install mongodb
```

**راه دستی:**
1. برو به https://www.mongodb.com/try/download/community
2. دانلود و نصب کن MongoDB Community Server
3. بعد نصب، MongoDB به صورت service اجرا میشه

**چک کردن:**
```powershell
Get-Service MongoDB
```

اگر stopped بود:
```powershell
Start-Service MongoDB
```

### مرحله 2: تنظیم فایل‌ها

کپی کردن environment file:
```powershell
Copy-Item .env.example .env
```

ویرایش `queries.txt` و query های خودت رو اضافه کن (یک query در هر خط).

### مرحله 3: اجرا

```powershell
npm start
```

یا با فایل query دلخواه:
```powershell
node index.js --file my_queries.txt
```

---

## مشاهده نتایج

### نسخه Test (JSON):
```powershell
cat contacts-output.json
```

### نسخه Production (MongoDB):
```powershell
mongosh
use google_maps_scraper
db.contacts.find().pretty()
db.contacts.countDocuments()
```

---

## توقف برنامه

در هر زمان `Ctrl+C` بزن. برنامه:
- داده‌ها رو ذخیره می‌کنه
- browser رو می‌بنده
- از جایی که بود ادامه می‌ده (resume capability)

---

## نکات مهم

🔥 **نسخه test** فقط برای آزمایش سریع است  
🚀 **نسخه production** برای 2000 query و استفاده واقعی  
⏱️ **زمان اجرا:** 2000 query = 24-48 ساعت  
💾 **حافظه:** حداکثر 6GB (auto-restart)
