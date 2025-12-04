import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import config from './config.js';
import { getRandomUserAgent, getRandomViewport, log } from './utils.js';

// Add stealth plugin
puppeteer.use(StealthPlugin());

class BrowserManager {
    constructor() {
        this.browser = null;
        this.userAgentIndex = 0;
    }

    /**
     * Launch browser with stealth settings and optimizations
     */
    async launch() {
        try {
            const userAgent = getRandomUserAgent(config.userAgents);
            const viewport = getRandomViewport(config.viewports);

            log(`Launching browser (${viewport.width}x${viewport.height})...`, 'info');

            this.browser = await puppeteer.launch({
                headless: config.scraper.headless ? 'new' : false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=' + viewport.width + ',' + viewport.height,
                    // Memory optimizations
                    '--js-flags=--max-old-space-size=4096',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-breakpad',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-extensions',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-renderer-backgrounding',
                    '--enable-features=NetworkService,NetworkServiceInProcess',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--mute-audio'
                ],
                ignoreHTTPSErrors: true,
                defaultViewport: viewport
            });

            // Set user agent on default context
            const pages = await this.browser.pages();
            if (pages.length > 0) {
                await pages[0].setUserAgent(userAgent);
            }

            log('Browser launched successfully', 'success');
            return this.browser;
        } catch (error) {
            log(`Failed to launch browser: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Create new page with optimizations
     */
    async newPage() {
        if (!this.browser) {
            await this.launch();
        }

        const page = await this.browser.newPage();

        // Set user agent
        const userAgent = getRandomUserAgent(config.userAgents);
        await page.setUserAgent(userAgent);

        // Block unnecessary resources to speed up
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();

            // Block images, fonts, stylesheets to speed up 60-70%
            if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set extra headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });

        // Disable timeout for slow networks
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);

        return page;
    }

    /**
     * Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            log('Browser closed', 'info');
        }
    }

    /**
     * Restart browser (for fingerprint rotation)
     */
    async restart() {
        log('Restarting browser for fingerprint rotation...', 'info');
        await this.close();
        await this.launch();
    }

    /**
     * Check if browser is connected
     */
    isConnected() {
        return this.browser && this.browser.isConnected();
    }
}

export default BrowserManager;
