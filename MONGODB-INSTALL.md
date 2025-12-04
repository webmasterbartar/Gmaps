# راهنمای نصب MongoDB روی Windows

## روش 1: نصب از وب‌سایت رسمی

1. برو به: https://www.mongodb.com/try/download/community
2. انتخاب کن:
   - Version: 7.0 (Current)
   - Platform: Windows x64
   - Package: MSI

3. دانلود و نصب کن (Next, Next, ...)
4. در طول نصب:
   - ✅ "Install MongoDB as a Service" را تیک بزن
   - ✅ "Install MongoDB Compass" (اختیاری - برای مشاهده دیتابیس)

5. بعد نصب، MongoDB به صورت خودکار اجرا میشه

## روش 2: نصب با Chocolatey (سریع‌تر)

اگر Chocolatey داری:
```powershell
choco install mongodb
```

## بررسی نصب

بعد نصب، این دستورات رو امتحان کن:
```powershell
mongod --version
mongosh --version
```

## اگر MongoDB نصبه ولی دستور کار نمی‌کنه

MongoDB احتمالاً نصبه ولی PATH تنظیم نشده. دستور کامل:
```powershell
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --version
```

## MongoDB رو اجرا کن

معمولاً MongoDB به صورت Service اجرا میشه. برای چک کردن:
```powershell
Get-Service MongoDB
```

برای شروع:
```powershell
Start-Service MongoDB
```

---

## تست اتصال

```powershell
mongosh
```

اگر وصل شد، موفق بوده! ✅
