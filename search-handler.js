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

            // Log URL after navigation (may be consent.google.com)
            let currentUrl = this.page.url();
            log(`Current URL after navigation: ${currentUrl}`, 'info');

            // Try to handle possible consent / cookies page (EU-style)
            await this.handleConsentIfPresent();

            // If we were on consent.google.com, wait a bit and log the new URL
            currentUrl = this.page.url();
            log(`Current URL after consent handling: ${currentUrl}`, 'info');

            await sleep(randomDelay(1000, 2000));

            // Only claim "Google Maps loaded" if we actually see the Maps URL
            if (currentUrl.includes('google.com/maps')) {
                log('Google Maps loaded', 'success');
            } else {
                log('Google Maps UI may not be fully loaded yet (still not on google.com/maps)', 'warning');
            }

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

            // Find search box (support multiple possible selectors / layouts)
            const searchBoxSelectors = [
                'input#searchboxinput',                                   // standard desktop
                'input[aria-label*="Search Google Maps"]',                // English aria-label
                'input[aria-label*="جستجو در Google Maps"]',              // Persian aria-label variant
                'input[aria-label*="Search in Google Maps"]'
            ];

            const combinedSelector = searchBoxSelectors.join(', ');

            await this.page.waitForSelector(combinedSelector, { timeout: 15000 });

            // Clear any existing text
            await this.page.click(combinedSelector, { clickCount: 3 });
            await this.page.keyboard.press('Backspace');
            await sleep(randomDelay(300, 600));

            // Type query with human-like delay
            await this.page.type(combinedSelector, query, { delay: randomDelay(50, 150) });
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
     * Handle Google consent / cookie pages that block the UI
     */
    async handleConsentIfPresent() {
        try {
            const url = this.page.url();

            // If we are on consent.google.com, we are definitely on a consent page
            if (url.includes('consent.google.com')) {
                log('Detected consent.google.com, trying to accept...', 'info');

                const clicked = await this.page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));

                    // Try language-specific / generic texts first
                    const matchTexts = [
                        // English
                        'accept all',
                        'i agree',
                        'accept',
                        'got it',
                        'accept & continue',
                        // Persian
                        'موافقم',
                        'پذیرفتن',
                        'قبول می‌کنم',
                        // German (common on EU servers)
                        'alle akzeptieren',
                        'zustimmen',
                        'ich stimme zu',
                        'akzeptieren'
                    ];

                    // 1) Try to find by text
                    for (const el of buttons) {
                        const txt = (el.innerText || '').toLowerCase().trim();
                        if (!txt) continue;
                        if (matchTexts.some(m => txt.includes(m))) {
                            el.click();
                            return true;
                        }
                    }

                    // 2) Fallback: click the last primary-looking button
                    if (buttons.length > 0) {
                        buttons[buttons.length - 1].click();
                        return true;
                    }

                    return false;
                });

                if (clicked) {
                    log('Clicked consent button on consent.google.com, waiting for redirect...', 'info');

                    // Wait for redirect away from consent.google.com (up to ~10 seconds)
                    const start = Date.now();
                    while (Date.now() - start < 10000) {
                        await sleep(500);
                        const newUrl = this.page.url();
                        if (!newUrl.includes('consent.google.com')) {
                            log(`Redirected from consent page to: ${newUrl}`, 'info');
                            return true;
                        }
                    }

                    log('Still on consent.google.com after clicking button', 'warning');
                    return false;
                } else {
                    log('Consent page detected but no clickable button found', 'warning');
                    return false;
                }
            }

            // Fallback: detect consent text on non-consent.google.com pages
            const hasConsentText = await this.page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                return text.includes('before you continue to google maps') ||
                    text.includes('قبل از ادامه') ||
                    text.includes('consent') ||
                    text.includes('accept all');
            });

            if (!hasConsentText) return false;

            log('Detected possible inline consent on google.com, trying to accept...', 'info');

            const clickedInline = await this.page.evaluate(() => {
                const candidates = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
                const matchTexts = [
                    'accept all',
                    'i agree',
                    'accept',
                    'got it',
                    'accept & continue',
                    'موافقم',
                    'پذیرفتن',
                    'قبول می‌کنم'
                ];

                for (const el of candidates) {
                    const txt = (el.innerText || '').toLowerCase().trim();
                    if (!txt) continue;
                    if (matchTexts.some(m => txt.includes(m))) {
                        el.click();
                        return true;
                    }
                }

                return false;
            });

            if (clickedInline) {
                log('Clicked inline consent button, waiting a bit...', 'info');
                await sleep(2000);
                return true;
            }

            log('Inline consent detected but no suitable button found', 'warning');
            return false;
        } catch (error) {
            log(`Consent handling error: ${error.message}`, 'warning');
            return false;
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
