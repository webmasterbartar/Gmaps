import config from './config.js';
import { sleep, randomDelay, log, retryWithBackoff } from './utils.js';

class SearchHandler {
    constructor(page) {
        this.page = page;
    }

    /**
     * Navigate to Google Maps
     */
    async navigateToGoogleMaps() {
        try {
            log('Navigating to Google Maps...', 'info');

            await retryWithBackoff(async () => {
                await this.page.goto(config.scraper.googleMapsUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 60000
                });
            });

            await sleep(randomDelay(1000, 2000));
            log('Google Maps loaded', 'success');

            return true;
        } catch (error) {
            log(`Failed to navigate to Google Maps: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Search for query on Google Maps
     */
    async search(query) {
        try {
            log(`Searching for: "${query}"`, 'info');

            // Find search box
            const searchBoxSelector = 'input#searchboxinput';
            await this.page.waitForSelector(searchBoxSelector, { timeout: 10000 });

            // Clear any existing text
            await this.page.click(searchBoxSelector, { clickCount: 3 });
            await this.page.keyboard.press('Backspace');
            await sleep(randomDelay(300, 600));

            // Type query with human-like delay
            await this.page.type(searchBoxSelector, query, { delay: randomDelay(50, 150) });
            await sleep(randomDelay(500, 1000));

            // Press Enter to search
            await this.page.keyboard.press('Enter');

            // Wait for results to load
            await sleep(randomDelay(
                config.delays.minSearchDelay,
                config.delays.maxSearchDelay
            ));

            // Check if results loaded
            const hasResults = await this.checkForResults();

            if (!hasResults) {
                log(`No results found for: "${query}"`, 'warning');
                return false;
            }

            log(`Search results loaded for: "${query}"`, 'success');
            return true;
        } catch (error) {
            log(`Search failed for "${query}": ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Check if search results are displayed
     */
    async checkForResults() {
        try {
            // Wait for results pane
            const resultsPaneSelector = 'div[role="feed"]';

            await this.page.waitForSelector(resultsPaneSelector, { timeout: 10000 });

            // Check for "no results" message
            const noResultsText = await this.page.evaluate(() => {
                const body = document.body.innerText.toLowerCase();
                return body.includes('no results') ||
                    body.includes('نتیجه‌ای یافت نشد') ||
                    body.includes('couldn\'t find');
            });

            return !noResultsText;
        } catch (error) {
            log(`Could not verify results: ${error.message}`, 'warning');
            return false;
        }
    }

    /**
     * Detect if we're blocked or have CAPTCHA
     */
    async detectBlock() {
        try {
            const isBlocked = await this.page.evaluate(() => {
                const body = document.body.innerText.toLowerCase();
                return body.includes('unusual traffic') ||
                    body.includes('captcha') ||
                    body.includes('verify you\'re not a robot') ||
                    body.includes('suspicious activity');
            });

            if (isBlocked) {
                log('🚨 BLOCK DETECTED! Google is asking for verification', 'error');
            }

            return isBlocked;
        } catch (error) {
            return false;
        }
    }
}

export default SearchHandler;
