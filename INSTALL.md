# نصب و راه‌اندازی (Installation Guide)

## مشکل دانلود Chrome در ایران

اگر با خطای 403 در هنگام نصب مواجه شدید، یکی از این روش‌ها را امتحان کنید:

### روش 1: استفاده از VPN/Proxy (پیشنهادی)

1. VPN خود را روشن کنید
2. دستور نصب را دوباره اجرا کنید:
```bash
npm install
```

### روش 2: استفاده از Chrome نصب شده در سیستم

1. مطمئن شوید Google Chrome یا Chromium نصب است
2. متغیر محیطی را تنظیم کنید:

**Windows (PowerShell):**
```powershell
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
npm install
```

**Linux/Mac:**
```bash
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install
```

3. در فایل `.env` مسیر Chrome را اضافه کنید:
```env
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

4. در `browser-manager.js` خط 24 را اینطور تغییر دهید:
```javascript
this.browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: config.scraper.headless ? 'new' : false,
  // ... rest of config
```

### روش 3: دانلود دستی Chrome

1. Chrome را از این لینک دانلود کنید:
   https://googlechromelabs.github.io/chrome-for-testing/#stable

2. فایل zip را extract کنید در یک پوشه (مثلا `C:\chrome`)

3. متغیر محیطی را تنظیم کنید:
```powershell
$env:PUPPETEER_EXECUTABLE_PATH="C:\chrome\chrome.exe"
npm install
```

### روش 4: استفاده از Mirror چینی

```powershell
$env:PUPPETEER_DOWNLOAD_HOST="https://registry.npmmirror.com/-/binary/chrome-for-testing"
npm install
```

## تست نصب

بعد از نصب موفق، تست کنید:

```bash
node -e "console.log(require('puppeteer').executablePath())"
```

اگر مسیر Chrome را نشان داد، نصب موفق بوده است! ✅

## مراحل بعدی

1. MongoDB را نصب و راه‌اندازی کنید
2. فایل `.env` را از `.env.example` کپی کنید
3. برنامه را اجرا کنید:
```bash
npm start
```
