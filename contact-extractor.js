import config from './config.js';
import { sleep, randomDelay, validatePhone, validateEmail, validateUrl, log } from './utils.js';

class ContactExtractor {
    constructor(page) {
        this.page = page;
    }

    /**
     * Extract all contact information from current business details panel
     */
    async extractContactInfo(businessName, sourceQuery) {
        try {
            // Wait for details panel to be visible
            await sleep(randomDelay(500, 1000));

            const contactInfo = {
                businessName: businessName || await this.getBusinessName(),
                phone: await this.getPhoneNumber(),
                website: await this.getWebsite(),
                email: await this.getEmail(),
                sourceQuery: sourceQuery,
                extractedAt: new Date().toISOString()
            };

            // Validate and clean data
            contactInfo.phone = validatePhone(contactInfo.phone);
            contactInfo.website = validateUrl(contactInfo.website);
            contactInfo.email = validateEmail(contactInfo.email);

            // Check if we got any useful data
            const hasData = contactInfo.phone || contactInfo.website || contactInfo.email;

            if (hasData) {
                const dataFields = [
                    contactInfo.phone ? 'Phone' : null,
                    contactInfo.website ? 'Website' : null,
                    contactInfo.email ? 'Email' : null
                ].filter(Boolean).join(', ');

                log(`  ✓ ${contactInfo.businessName}: ${dataFields}`, 'success');
            } else {
                log(`  ⚠ ${contactInfo.businessName}: No contact data found`, 'warning');
            }

            return contactInfo;
        } catch (error) {
            log(`Failed to extract contact info: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Get business name from details panel
     */
    async getBusinessName() {
        try {
            const name = await this.page.evaluate(() => {
                // Try h1 tag first (main title)
                const h1 = document.querySelector('h1');
                if (h1) return h1.innerText.trim();

                // Try aria-label on main container
                const main = document.querySelector('[role="main"]');
                if (main) {
                    const ariaLabel = main.getAttribute('aria-label');
                    if (ariaLabel) return ariaLabel;
                }

                return 'Unknown Business';
            });

            return name;
        } catch (error) {
            return 'Unknown Business';
        }
    }

    /**
     * Get phone number - handle click-to-reveal buttons
     */
    async getPhoneNumber() {
        try {
            // Try to find phone button and click it
            const phoneFound = await this.page.evaluate(() => {
                // Look for phone button (has data-item-id attribute containing "phone")
                const buttons = Array.from(document.querySelectorAll('button[data-item-id]'));
                const phoneButton = buttons.find(btn =>
                    btn.getAttribute('data-item-id')?.includes('phone') ||
                    btn.getAttribute('aria-label')?.toLowerCase().includes('phone') ||
                    btn.innerText.includes('Phone')
                );

                if (phoneButton) {
                    phoneButton.click();
                    return true;
                }

                return false;
            });

            if (phoneFound) {
                await sleep(500); // Wait for phone to reveal
            }

            // Extract phone number from page
            const phone = await this.page.evaluate(() => {
                // Method 1: Look for tel: links
                const telLinks = document.querySelectorAll('a[href^="tel:"]');
                if (telLinks.length > 0) {
                    const href = telLinks[0].getAttribute('href');
                    return href.replace('tel:', '');
                }

                // Method 2: Look for phone patterns in aria-labels
                const buttons = Array.from(document.querySelectorAll('[aria-label]'));
                for (const btn of buttons) {
                    const ariaLabel = btn.getAttribute('aria-label');
                    // Match phone patterns
                    const phoneMatch = ariaLabel.match(/[\+\d][\d\s\-\(\)]+\d/);
                    if (phoneMatch) {
                        return phoneMatch[0];
                    }
                }

                // Method 3: Search for phone patterns in text
                const bodyText = document.body.innerText;
                const phonePatterns = [
                    /\+?\d{1,4}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,9}/g,
                    /\(\d{3}\)[\s\-]?\d{3}[\s\-]?\d{4}/g
                ];

                for (const pattern of phonePatterns) {
                    const match = bodyText.match(pattern);
                    if (match) return match[0];
                }

                return null;
            });

            return phone;
        } catch (error) {
            log(`Phone extraction error: ${error.message}`, 'warning');
            return null;
        }
    }

    /**
     * Get website URL - handle external link redirects
     */
    async getWebsite() {
        try {
            const website = await this.page.evaluate(() => {
                // Look for website button/link
                const buttons = Array.from(document.querySelectorAll('a[data-item-id], button[data-item-id]'));

                const websiteButton = buttons.find(btn =>
                    btn.getAttribute('data-item-id')?.includes('authority') ||
                    btn.getAttribute('aria-label')?.toLowerCase().includes('website') ||
                    btn.innerText.toLowerCase().includes('website')
                );

                if (websiteButton) {
                    const href = websiteButton.getAttribute('href');
                    if (href) return href;
                }

                // Alternative: look for external links
                const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]'));
                for (const link of externalLinks) {
                    const href = link.getAttribute('href');
                    // Skip Google-owned domains
                    if (!href.includes('google.com') &&
                        !href.includes('gstatic.com') &&
                        !href.includes('youtube.com')) {
                        return href;
                    }
                }

                return null;
            });

            return website;
        } catch (error) {
            log(`Website extraction error: ${error.message}`, 'warning');
            return null;
        }
    }

    /**
     * Get email address (if available in description or website)
     */
    async getEmail() {
        try {
            const email = await this.page.evaluate(() => {
                // Search for email patterns in the entire page
                const bodyText = document.body.innerText;
                const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const matches = bodyText.match(emailPattern);

                if (matches && matches.length > 0) {
                    // Return first email found (usually the business email)
                    return matches[0];
                }

                // Look for mailto: links
                const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
                if (mailtoLinks.length > 0) {
                    const href = mailtoLinks[0].getAttribute('href');
                    return href.replace('mailto:', '');
                }

                return null;
            });

            return email;
        } catch (error) {
            log(`Email extraction error: ${error.message}`, 'warning');
            return null;
        }
    }

    /**
     * Check if details panel has loaded
     */
    async waitForDetailsPanel() {
        try {
            // Wait for main heading or details container
            await this.page.waitForSelector('h1, [role="main"]', { timeout: 10000 });
            await sleep(randomDelay(500, 1000));
            return true;
        } catch (error) {
            log('Details panel did not load', 'warning');
            return false;
        }
    }
}

export default ContactExtractor;
