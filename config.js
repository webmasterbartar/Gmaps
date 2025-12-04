import dotenv from 'dotenv';
dotenv.config();

export default {
  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME || 'google_maps_scraper',
    collections: {
      contacts: process.env.CONTACTS_COLLECTION || 'contacts',
      queriesProgress: process.env.QUERIES_COLLECTION || 'queries_progress'
    }
  },

  // Scraper settings
  scraper: {
    maxResultsPerQuery: parseInt(process.env.MAX_RESULTS_PER_QUERY) || 120,
    headless: process.env.HEADLESS !== 'false',
    googleMapsUrl: 'https://www.google.com/maps'
  },

  // Rate limiting (optimized for no proxy)
  rateLimiting: {
    maxQueriesPerHour: parseInt(process.env.MAX_QUERIES_PER_HOUR) || 100,
    browserRestartAfterQueries: parseInt(process.env.BROWSER_RESTART_AFTER_QUERIES) || 50,
    cooldownAfterQueries: parseInt(process.env.COOLDOWN_AFTER_QUERIES) || 200,
    cooldownDurationMs: (parseInt(process.env.COOLDOWN_DURATION_MINUTES) || 10) * 60 * 1000
  },

  // Delays (human-like behavior)
  delays: {
    minClickDelay: parseInt(process.env.MIN_DELAY_BETWEEN_CLICKS) || 1000,
    maxClickDelay: parseInt(process.env.MAX_DELAY_BETWEEN_CLICKS) || 3000,
    minSearchDelay: parseInt(process.env.MIN_DELAY_BETWEEN_SEARCHES) || 2000,
    maxSearchDelay: parseInt(process.env.MAX_DELAY_BETWEEN_SEARCHES) || 5000,
    scrollDelay: parseInt(process.env.SCROLL_DELAY) || 800
  },

  // Concurrency (optimized for 8GB RAM, 4 CPU cores)
  concurrency: {
    maxConcurrentBrowsers: parseInt(process.env.MAX_CONCURRENT_BROWSERS) || 2
  },

  // Memory management
  memory: {
    maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB) || 6000,
    checkIntervalMs: 30000 // Check every 30 seconds
  },

  // User agents for rotation
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ],

  // Viewport sizes for rotation
  viewports: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 }
  ]
};
