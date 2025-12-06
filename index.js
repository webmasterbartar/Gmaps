#!/usr/bin/env node

import chalk from 'chalk';
import cliProgress from 'cli-progress';
import config from './config.js';
import BrowserManager from './browser-manager.js';
import DatabaseManager from './database-manager.js';
import QueryManager from './query-manager.js';
import SearchHandler from './search-handler.js';
import ResultsNavigator from './results-navigator.js';
import ContactExtractor from './contact-extractor.js';
import { log, sleep, isMemoryHigh, getMemoryUsage, formatNumber, estimateTimeRemaining } from './utils.js';

class GoogleMapsScraper {
    constructor(dbName = null) {
        this.browserManager = new BrowserManager();
        this.dbManager = new DatabaseManager(dbName);
        this.queryManager = new QueryManager(this.dbManager);
        this.stats = {
            totalQueries: 0,
            completedQueries: 0,
            failedQueries: 0,
            totalContacts: 0,
            startTime: Date.now()
        };
        this.queriesProcessedSinceRestart = 0;
        this.queriesProcessedSinceCooldown = 0;
    }

    /**
     * Initialize scraper
     */
    async initialize(queriesFile) {
        try {
            console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════╗'));
            console.log(chalk.cyan.bold('║   Google Maps Contact Scraper v1.0             ║'));
            console.log(chalk.cyan.bold('╚════════════════════════════════════════════════╝\n'));

            // Connect to database
            await this.dbManager.connect();

            // Load queries
            await this.queryManager.loadQueriesFromFile(queriesFile);

            // Filter completed queries (resume capability)
            const queryStats = await this.queryManager.filterCompletedQueries();
            this.stats.totalQueries = queryStats.total;

            // Add failed queries for retry
            await this.queryManager.addFailedQueriesForRetry();

            log(`📊 Queries: ${queryStats.remaining} remaining (${queryStats.completed} already completed)`, 'info');
            log(`⚙️  Memory limit: ${config.memory.maxMemoryMB}MB`, 'info');
            log(`🚀 Starting scraper...\n`, 'success');

            return true;
        } catch (error) {
            log(`Initialization failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Process single query
     */
    async processQuery(query) {
        let page = null;

        try {
            // Mark query as in progress
            await this.dbManager.markQueryInProgress(query);

            log(`\n${'='.repeat(60)}`, 'info');
            log(`📍 Processing query: "${query}"`, 'info');
            log('='.repeat(60), 'info');

            // Create new page
            page = await this.browserManager.newPage();

            // Initialize handlers
            const searchHandler = new SearchHandler(page);
            const resultsNavigator = new ResultsNavigator(page);
            const contactExtractor = new ContactExtractor(page);

            // Navigate to Google Maps
            await searchHandler.navigateToGoogleMaps();

            // Perform search
            const hasResults = await searchHandler.search(query);

            if (!hasResults) {
                await this.dbManager.markQueryCompleted(query, {
                    resultsFound: 0,
                    contactsExtracted: 0
                });
                this.stats.completedQueries++;
                return;
            }

            // Check for blocks
            const isBlocked = await searchHandler.detectBlock();
            if (isBlocked) {
                throw new Error('BLOCKED: Google detected unusual traffic');
            }

            // Scroll to load all results
            const totalResults = await resultsNavigator.scrollAndLoadAllResults();

            // Get all business listings
            const businesses = await resultsNavigator.getAllBusinessListings();
            log(`Found ${businesses.length} businesses to process`, 'info');

            // Extract contacts from each business
            let contactsExtracted = 0;
            const contactsBatch = [];

            for (let i = 0; i < businesses.length; i++) {
                const business = businesses[i];

                try {
                    // Click on business
                    await resultsNavigator.clickBusinessByIndex(business.element);

                    // Extract contact info
                    const contactInfo = await contactExtractor.extractContactInfo(business.name, query);

                    if (contactInfo && (contactInfo.phone || contactInfo.website || contactInfo.email)) {
                        contactsBatch.push(contactInfo);
                        contactsExtracted++;

                        // Batch insert every 10 contacts
                        if (contactsBatch.length >= 10) {
                            await this.dbManager.batchInsertContacts(contactsBatch);
                            this.stats.totalContacts += contactsBatch.length;
                            contactsBatch.length = 0; // Clear array
                        }
                    }

                } catch (error) {
                    log(`  Skipping business ${i + 1}: ${error.message}`, 'warning');
                }
            }

            // Insert remaining contacts
            if (contactsBatch.length > 0) {
                await this.dbManager.batchInsertContacts(contactsBatch);
                this.stats.totalContacts += contactsBatch.length;
            }

            // Mark query as completed
            await this.dbManager.markQueryCompleted(query, {
                resultsFound: totalResults,
                contactsExtracted
            });

            this.stats.completedQueries++;
            log(`✅ Completed "${query}": ${contactsExtracted} contacts extracted`, 'success');

        } catch (error) {
            log(`❌ Failed "${query}": ${error.message}`, 'error');
            await this.dbManager.markQueryFailed(query, error.message);
            this.stats.failedQueries++;

            // If blocked, throw to trigger cooldown
            if (error.message.includes('BLOCKED')) {
                throw error;
            }
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Run scraper for all queries
     */
    async run(queriesFile = 'queries.txt') {
        try {
            await this.initialize(queriesFile);

            // Launch browser
            await this.browserManager.launch();

            // Process queries
            while (this.queryManager.hasMore()) {
                const query = this.queryManager.getNextQuery();

                try {
                    await this.processQuery(query);

                    this.queriesProcessedSinceRestart++;
                    this.queriesProcessedSinceCooldown++;

                    // Check memory usage
                    if (isMemoryHigh(config.memory.maxMemoryMB)) {
                        const memory = getMemoryUsage();
                        log(`⚠️  High memory usage: ${memory.rss}MB - Restarting browser`, 'warning');
                        await this.browserManager.restart();
                        this.queriesProcessedSinceRestart = 0;
                    }

                    // Restart browser every N queries for fingerprint rotation
                    if (this.queriesProcessedSinceRestart >= config.rateLimiting.browserRestartAfterQueries) {
                        log('🔄 Restarting browser for fingerprint rotation...', 'info');
                        await this.browserManager.restart();
                        this.queriesProcessedSinceRestart = 0;
                    }

                    // Cooldown every N queries
                    if (this.queriesProcessedSinceCooldown >= config.rateLimiting.cooldownAfterQueries) {
                        const cooldownMinutes = config.rateLimiting.cooldownDurationMs / 60000;
                        log(`😴 Cooldown: Sleeping for ${cooldownMinutes} minutes...`, 'info');
                        await sleep(config.rateLimiting.cooldownDurationMs);
                        this.queriesProcessedSinceCooldown = 0;
                    }

                    // Display progress
                    this.displayProgress();

                } catch (error) {
                    if (error.message.includes('BLOCKED')) {
                        log('🛑 Detected block - entering extended cooldown (30 min)', 'error');
                        await sleep(30 * 60 * 1000); // 30 minute cooldown
                        await this.browserManager.restart();
                        this.queriesProcessedSinceRestart = 0;
                    }
                }
            }

            // Final statistics
            await this.displayFinalStats();

        } catch (error) {
            log(`Scraper error: ${error.message}`, 'error');
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Display progress
     */
    displayProgress() {
        const remaining = this.queryManager.getRemainingCount();
        const total = this.stats.totalQueries;
        const completed = this.stats.completedQueries;
        const percentage = ((completed / total) * 100).toFixed(1);
        const eta = estimateTimeRemaining(completed, total, this.stats.startTime);

        console.log(chalk.cyan(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
        console.log(chalk.white.bold(`📊 Progress: ${completed}/${total} queries (${percentage}%)`));
        console.log(chalk.white(`   Remaining: ${remaining} | Failed: ${this.stats.failedQueries}`));
        console.log(chalk.white(`   Contacts extracted: ${formatNumber(this.stats.totalContacts)}`));
        console.log(chalk.white(`   ETA: ${eta}`));
        console.log(chalk.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
    }

    /**
     * Display final statistics
     */
    async displayFinalStats() {
        const dbStats = await this.dbManager.getStats();
        const runtime = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1);

        console.log(chalk.green.bold('\n\n╔════════════════════════════════════════════════╗'));
        console.log(chalk.green.bold('║             SCRAPING COMPLETED ✓               ║'));
        console.log(chalk.green.bold('╚════════════════════════════════════════════════╝\n'));

        console.log(chalk.white(`📊 Final Statistics:`));
        console.log(chalk.white(`   Total Queries: ${this.stats.totalQueries}`));
        console.log(chalk.white(`   Completed: ${dbStats.completedQueries}`));
        console.log(chalk.white(`   Failed: ${dbStats.failedQueries}`));
        console.log(chalk.white(`   Total Contacts: ${formatNumber(dbStats.totalContacts)}`));
        console.log(chalk.white(`   Runtime: ${runtime} minutes\n`));

        console.log(chalk.white(`🏆 Top Queries by Contacts:`));
        dbStats.topQueries.slice(0, 5).forEach((q, i) => {
            console.log(chalk.white(`   ${i + 1}. "${q.query}": ${q.contacts} contacts`));
        });
        console.log('');
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        log('Cleaning up...', 'info');
        await this.browserManager.close();
        await this.dbManager.close();
        log('Scraper stopped', 'success');
    }
}

// Command-line interface
async function main() {
    const args = process.argv.slice(2);

    let queriesFile = 'queries.txt';
    let dbName = null;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--file' || args[i] === '-f') {
            queriesFile = args[i + 1];
        }
        if (args[i] === '--db-name' || args[i] === '-d') {
            dbName = args[i + 1];
        }
        if (args[i] === '--help' || args[i] === '-h') {
            console.log(`
Google Maps Contact Scraper

Usage:
  node index.js [options]

Options:
  --file, -f <path>       Path to queries file (default: queries.txt)
  --db-name, -d <name>     Database name (default: google_maps_scraper)
  --help, -h              Show this help message

Examples:
  node index.js --file my_queries.txt
  node index.js --file queries_elevator.txt --db-name elevator_scraper
  node index.js --file queries_painting.txt --db-name painting_scraper
  npm start
      `);
            process.exit(0);
        }
    }

    const scraper = new GoogleMapsScraper(dbName);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\n⚠️  Received interrupt signal. Cleaning up...'));
        await scraper.cleanup();
        process.exit(0);
    });

    try {
        await scraper.run(queriesFile);
    } catch (error) {
        console.error(chalk.red(`\n❌ Fatal error: ${error.message}`));
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default GoogleMapsScraper;
