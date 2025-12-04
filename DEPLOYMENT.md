# 🚀 راهنمای استقرار روی سرور (Server Deployment)

## پیش‌نیازها

- ✅ سرور Linux (Ubuntu 20.04+ / Debian 11+)
- ✅ دسترسی SSH به سرور
- ✅ حداقل 8GB RAM, 4 CPU cores, 40GB disk
- ✅ Git نصب شده روی سرور

---

## مرحله 1: آپلود پروژه به GitHub

### روی کامپیوتر محلی:

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: Google Maps Scraper"

# Create GitHub repository از وب‌سایت GitHub
# سپس:
git remote add origin https://github.com/YOUR_USERNAME/google-maps-scraper.git
git branch -M main
git push -u origin main
```

---

## مرحله 2: اتصال به سرور

```bash
ssh username@your-server-ip
```

---

## مرحله 3: نصب خودکار (توصیه می‌شود)

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/google-maps-scraper.git
cd google-maps-scraper

# Make install script executable
chmod +x install-server.sh

# Run installation
./install-server.sh
```

این اسکریپت نصب می‌کنه:
- ✅ Node.js 18+
- ✅ MongoDB 7.0
- ✅ PM2 (Process Manager)
- ✅ Dependencies پروژه

---

## مرحله 4: تنظیمات

### ویرایش Environment Variables:

```bash
nano .env
```

تنظیمات پیشنهادی برای سرور:

```env
# Database
MONGODB_URI=mongodb://localhost:27017
DB_NAME=google_maps_scraper

# Scraper Settings
HEADLESS=true
MAX_RESULTS_PER_QUERY=120

# Rate Limiting (بدون پروکسی)
MAX_QUERIES_PER_HOUR=100
BROWSER_RESTART_AFTER_QUERIES=50
COOLDOWN_AFTER_QUERIES=200
COOLDOWN_DURATION_MINUTES=10

# Memory (برای سرور 8GB)
MAX_MEMORY_MB=6000
```

### اضافه کردن Queries:

```bash
nano queries.txt
```

2000 query خود را اضافه کنید (یک query در هر خط).

---

## مرحله 5: اجرای Scraper با PM2

```bash
# Start scraper
pm2 start index.js --name google-maps-scraper

# View logs (برای مشاهده real-time)
pm2 logs google-maps-scraper

# Monitor resource usage
pm2 monit

# Save PM2 process list (برای auto-restart بعد reboot)
pm2 save
pm2 startup
```

---

## مرحله 6: مانیتورینگ

### مشاهده Logs:

```bash
pm2 logs google-maps-scraper --lines 100
```

### چک کردن Database:

```bash
mongosh

use google_maps_scraper

# تعداد کل contacts
db.contacts.countDocuments()

# آخرین 5 contact
db.contacts.find().sort({timestamp: -1}).limit(5).pretty()

# تعداد query های complete شده
db.queries_progress.find({status: "completed"}).count()

# query های failed
db.queries_progress.find({status: "failed"})

exit
```

### چک کردن وضعیت سرور:

```bash
# Memory usage
free -h

# CPU usage
top

# Disk usage
df -h

# PM2 status
pm2 status
```

---

## مشکلات رایج و راه‌حل‌ها

### 1. MongoDB Connection Failed

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Enable auto-start on boot
sudo systemctl enable mongod
```

### 2. Out of Memory

```bash
# Restart scraper to clear memory
pm2 restart google-maps-scraper

# Check memory settings in .env
nano .env
# کم کنید MAX_MEMORY_MB را
```

### 3. Browser Crashes

```bash
# Install missing dependencies
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

### 4. Scraper Stopped/Crashed

```bash
# Check logs for errors
pm2 logs google-maps-scraper --err --lines 50

# Restart
pm2 restart google-maps-scraper

# Check if it's still processing
pm2 status
```

---

## دستورات مفید PM2

```bash
# List all processes
pm2 list

# Stop scraper
pm2 stop google-maps-scraper

# Restart scraper
pm2 restart google-maps-scraper

# Delete from PM2
pm2 delete google-maps-scraper

# View detailed info
pm2 info google-maps-scraper

# Flush logs
pm2 flush google-maps-scraper
```

---

## Backup و Export داده‌ها

### Export به JSON:

```bash
mongosh

use google_maps_scraper

# Export all contacts to JSON
db.contacts.find().forEach(function(doc) {
    print(JSON.stringify(doc));
}) > contacts_backup.json

exit
```

### Export به CSV (از MongoDB Compass):

1. نصب MongoDB Compass روی کامپیوتر محلی
2. اتصال به سرور: `mongodb://your-server-ip:27017`
3. انتخاب database و collection
4. Export as CSV

---

## آپدیت کردن پروژه

```bash
# Stop scraper
pm2 stop google-maps-scraper

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart scraper
pm2 restart google-maps-scraper
```

---

## نکات امنیتی

1. **Firewall:** فقط port 22 (SSH) و 27017 (MongoDB - فقط localhost) باز باشه
2. **MongoDB:** با authentication راه‌اندازی کنید در production
3. **SSH Keys:** از password استفاده نکنید، SSH key استفاده کنید
4. **Updates:** سیستم رو به‌روز نگه دارید

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

---

## Performance Tips

- **Headless Mode:** حتماً `HEADLESS=true` در `.env` برای سرور
- **Memory:** اگر crash می‌کنه، `MAX_MEMORY_MB` رو کاهش بدید
- **Rate Limiting:** برای جلوگیری از ban، `MAX_QUERIES_PER_HOUR` رو کم کنید
- **Cooldown:** زمان استراحت رو زیاد کنید اگر block شدید

---

موفق باشید! 🚀
