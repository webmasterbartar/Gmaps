# Google Maps Contact Scraper

🗺️ Professional high-speed scraper for extracting contact information (phone, website, email) from Google Maps business listings.

## Features

- 🚀 **High-Speed Extraction** - Up to 120 results per query
- 🗄️ **MongoDB Integration** - Real-time storage with duplicate detection
- 🔄 **Resume Capability** - Automatically continues from where it stopped
- 🛡️ **Anti-Detection** - Stealth mode, User-Agent rotation, human-like delays
- 💾 **Memory Optimized** - Designed for 8GB RAM servers
- 📊 **Progress Tracking** - Real-time statistics and ETA

## Requirements

- Node.js 18+
- MongoDB 4.4+
- Server: 8GB RAM, 40GB disk, 4 CPU cores (recommended)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings (default values are optimized).

### 3. Create Queries File

Create `queries.txt` with your search queries (one per line):

```txt
restaurants in Tehran
coffee shops in Dubai
hotels in London
```

### 4. Run

**Test Mode (without MongoDB):**
```bash
node test-simple.js
```

**Production Mode (with MongoDB):**
```bash
npm start
```

## Server Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete server deployment instructions.

Quick server setup:

```bash
git clone <your-repo-url>
cd google-maps-scraper
chmod +x install-server.sh
./install-server.sh
```

## Output Format

Contacts are stored in MongoDB with the following schema:

```json
{
  "businessName": "Example Restaurant",
  "phone": "+1234567890",
  "website": "https://example.com",
  "email": "info@example.com",
  "sourceQuery": "restaurants in Dubai",
  "timestamp": "2024-12-04T12:00:00.000Z"
}
```

## Configuration

Key settings in `.env`:

- `MAX_QUERIES_PER_HOUR=100` - Conservative for no proxy
- `BROWSER_RESTART_AFTER_QUERIES=50` - Fingerprint rotation
- `MAX_MEMORY_MB=6000` - For 8GB RAM servers
- `HEADLESS=true` - Run without GUI (required for servers)

## Performance

- **Speed:** ~50-80 contacts/hour (conservative, no proxy)
- **Success Rate:** 85-95% depending on query quality
- **Runtime:** 2000 queries = 24-48 hours
- **Data Coverage:** 60-80% have phone, 40-60% have website, 10-20% have email

## Anti-Detection Features

- Puppeteer stealth plugin
- User-Agent rotation (5 agents)
- Viewport randomization
- Random human-like delays
- Browser restart every 50 queries
- Cooldown periods (10 min every 200 queries)
- Automatic block detection & recovery

## Monitoring

View database:

```bash
mongosh
use google_maps_scraper
db.contacts.countDocuments()
db.contacts.find().limit(5).pretty()
```

Check progress:

```bash
db.queries_progress.find({status: "completed"}).count()
```

## Troubleshooting

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting guide.

Common issues:
- **MongoDB Connection Failed:** Check if MongoDB is running
- **Out of Memory:** Reduce `MAX_MEMORY_MB` in `.env`
- **Browser Crashes:** Install required system dependencies

## License

MIT

## Disclaimer

This tool is for educational purposes. Please respect Google's Terms of Service and use responsibly.
