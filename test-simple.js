#!/usr/bin/env node

/**
 * Simple Test Version - No MongoDB Required
 * Saves contacts to JSON file instead
 */

import fs from 'fs/promises';
import chalk from 'chalk';
import BrowserManager from './browser-manager.js';
import SearchHandler from './search-handler.js';
import ResultsNavigator from './results-navigator.js';
import ContactExtractor from './contact-extractor.js';
import { log, sleep } from './utils.js';

class SimpleGoogleMapsScraper {
    constructor() {
        this.browserManager = new BrowserManager();
        this.contacts = [];
        this.outputFile = 'contacts-output.json';
    }

    /**
     * Process single query
     */
    async processQuery(query) {
        let page = null;

        try {
            console.log(chalk.cyan(`\n${'='.repeat(60)}`));
            console.log(chalk.cyan.bold(`📍 Processing: "${query}"`));
            console.log(chalk.cyan(`${'='.repeat(60)}\n`));

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
                log('No results found', 'warning');
                return { query, contacts: 0 };
            }

            // Scroll to load all results
            const totalResults = await resultsNavigator.scrollAndLoadAllResults();
            log(`Found ${totalResults} results`, 'info');

            // Get all business listings
            const businesses = await resultsNavigator.getAllBusinessListings();

            // Extract contacts from each business (limit to 10 for testing)
            const limit = Math.min(businesses.length, 10);
            log(`Extracting contacts from first ${limit} businesses...`, 'info');

            for (let i = 0; i < limit; i++) {
                const business = businesses[i];

                try {
                    // Click on business
                    await resultsNavigator.clickBusinessByIndex(business.element);

                    // Extract contact info
                    const contactInfo = await contactExtractor.extractContactInfo(business.name, query);

                    if (contactInfo && (contactInfo.phone || contactInfo.website || contactInfo.email)) {
                        this.contacts.push(contactInfo);

                        // Save after each contact (in case of crash)
                        await this.saveContacts();
                    }

                } catch (error) {
                    log(`  Skipping business ${i + 1}: ${error.message}`, 'warning');
                }
            }

            console.log(chalk.green(`\n✅ Extracted ${this.contacts.length} contacts from "${query}"`));

            return { query, contacts: this.contacts.length };

        } catch (error) {
            log(`Failed "${query}": ${error.message}`, 'error');
            throw error;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Save contacts to JSON file
     */
    async saveContacts() {
        try {
            await fs.writeFile(
                this.outputFile,
                JSON.stringify(this.contacts, null, 2),
                'utf-8'
            );
        } catch (error) {
            log(`Failed to save contacts: ${error.message}`, 'error');
        }
    }

    /**
     * Run test with sample queries
     */
    async runTest(queries) {
        try {
            console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════╗'));
            console.log(chalk.cyan.bold('║   Google Maps Scraper - TEST MODE             ║'));
            console.log(chalk.cyan.bold('║   (No MongoDB - Saves to JSON file)            ║'));
            console.log(chalk.cyan.bold('╚════════════════════════════════════════════════╝\n'));

            // Launch browser
            await this.browserManager.launch();

            // Process each query
            for (const query of queries) {
                await this.processQuery(query);
                await sleep(2000); // Small delay between queries
            }

            // Final save
            await this.saveContacts();

            // Display results
            console.log(chalk.green.bold('\n\n╔════════════════════════════════════════════════╗'));
            console.log(chalk.green.bold('║             TEST COMPLETED ✓                   ║'));
            console.log(chalk.green.bold('╚════════════════════════════════════════════════╝\n'));

            console.log(chalk.white(`📊 Total Contacts Extracted: ${chalk.green.bold(this.contacts.length)}`));
            console.log(chalk.white(`📁 Saved to: ${chalk.yellow(this.outputFile)}\n`));

            // Show sample contacts
            if (this.contacts.length > 0) {
                console.log(chalk.white('📋 Sample Contacts:\n'));
                this.contacts.slice(0, 3).forEach((contact, i) => {
                    console.log(chalk.cyan(`${i + 1}. ${contact.businessName}`));
                    if (contact.phone) console.log(chalk.white(`   📞 ${contact.phone}`));
                    if (contact.website) console.log(chalk.white(`   🌐 ${contact.website}`));
                    if (contact.email) console.log(chalk.white(`   ✉️  ${contact.email}`));
                    console.log(chalk.gray(`   🔍 Query: "${contact.sourceQuery}"`));
                    console.log('');
                });
            }

        } catch (error) {
            log(`Test error: ${error.message}`, 'error');
            throw error;
        } finally {
            await this.browserManager.close();
        }
    }
}

// Run test
async function main() {
    // Test queries
    const testQueries = [
        'restaurants in Dubai',
        'coffee shops in London'
    ];

    const scraper = new SimpleGoogleMapsScraper();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\n⚠️  Interrupted. Saving and exiting...'));
        await scraper.saveContacts();
        await scraper.browserManager.close();
        process.exit(0);
    });

    try {
        await scraper.runTest(testQueries);
    } catch (error) {
        console.error(chalk.red(`\n❌ Fatal error: ${error.message}`));
        process.exit(1);
    }
}

main();
