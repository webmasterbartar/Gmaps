import config from './config.js';
import { sleep, randomDelay, log } from './utils.js';

class ResultsNavigator {
    constructor(page) {
        this.page = page;
    }

    /**
     * Scroll results sidebar to load all businesses (up to 120)
     */
    async scrollAndLoadAllResults() {
        try {
            log('Scrolling to load all results...', 'info');

            const resultsPaneSelector = 'div[role="feed"]';
            await this.page.waitForSelector(resultsPaneSelector, { timeout: 10000 });

            let previousHeight = 0;
            let scrollAttempts = 0;
            const maxScrollAttempts = 50; // Prevent infinite loops
            let noNewResultsCount = 0;

            while (scrollAttempts < maxScrollAttempts) {
                // Get current scroll height
                const currentHeight = await this.page.evaluate((selector) => {
                    const feed = document.querySelector(selector);
                    if (!feed) return 0;

                    // Scroll to bottom
                    feed.scrollTop = feed.scrollHeight;
                    return feed.scrollHeight;
                }, resultsPaneSelector);

                // Wait for new results to load
                await sleep(config.delays.scrollDelay);

                // Check if we've reached the end
                if (currentHeight === previousHeight) {
                    noNewResultsCount++;

                    // If height hasn't changed for 3 attempts, we're at the end
                    if (noNewResultsCount >= 3) {
                        const endReached = await this.detectEndOfResults();
                        if (endReached) {
                            log('Reached end of results', 'success');
                            break;
                        }
                    }
                } else {
                    noNewResultsCount = 0;
                }

                previousHeight = currentHeight;
                scrollAttempts++;

                // Log progress every 10 scrolls
                if (scrollAttempts % 10 === 0) {
                    const currentCount = await this.getResultsCount();
                    log(`Scrolling... ${currentCount} results loaded so far`, 'info');
                }
            }

            const totalResults = await this.getResultsCount();
            log(`Total results loaded: ${totalResults}`, 'success');

            return totalResults;
        } catch (error) {
            log(`Failed to scroll results: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Detect "end of results" message
     */
    async detectEndOfResults() {
        try {
            const hasEndMessage = await this.page.evaluate(() => {
                const body = document.body.innerText;

                // English messages
                if (body.includes('You\'ve reached the end of the list') ||
                    body.includes('reached the end') ||
                    body.includes('No more results')) {
                    return true;
                }

                // Persian messages (if Google Maps is in Persian)
                if (body.includes('به انتهای لیست رسیدید') ||
                    body.includes('نتیجه بیشتری وجود ندارد')) {
                    return true;
                }

                return false;
            });

            return hasEndMessage;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get count of loaded results
     */
    async getResultsCount() {
        try {
            const count = await this.page.evaluate(() => {
                // Google Maps uses specific div structure for results
                const results = document.querySelectorAll('div[role="feed"] > div > div > a');
                return results.length;
            });

            return count;
        } catch (error) {
            log(`Failed to count results: ${error.message}`, 'warning');
            return 0;
        }
    }

    /**
     * Get all business listing elements
     */
    async getAllBusinessListings() {
        try {
            const businesses = await this.page.evaluate(() => {
                const results = document.querySelectorAll('div[role="feed"] > div > div > a');

                return Array.from(results).map((element, index) => {
                    // Get business name from aria-label
                    const ariaLabel = element.getAttribute('aria-label');

                    // Get href for clicking
                    const href = element.getAttribute('href');

                    return {
                        index,
                        name: ariaLabel || `Business ${index + 1}`,
                        href,
                        element: index // Store index to find element later
                    };
                });
            });

            log(`Extracted ${businesses.length} business listings`, 'success');
            return businesses;
        } catch (error) {
            log(`Failed to get business listings: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Click on business listing by index
     */
    async clickBusinessByIndex(index) {
        try {
            await this.page.evaluate((idx) => {
                const results = document.querySelectorAll('div[role="feed"] > div > div > a');
                if (results[idx]) {
                    results[idx].click();
                }
            }, index);

            // Wait for details panel to load
            await sleep(randomDelay(
                config.delays.minClickDelay,
                config.delays.maxClickDelay
            ));

            return true;
        } catch (error) {
            log(`Failed to click business #${index}: ${error.message}`, 'error');
            return false;
        }
    }
}

export default ResultsNavigator;
