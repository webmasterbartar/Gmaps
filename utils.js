import chalk from 'chalk';

/**
 * Generate random delay for human-like behavior
 */
export function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(chalk.yellow(`⚠️  Retry ${attempt}/${maxRetries} after ${delay}ms: ${error.message}`));
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Get random user agent from pool
 */
export function getRandomUserAgent(userAgents) {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Get random viewport size
 */
export function getRandomViewport(viewports) {
    return viewports[Math.floor(Math.random() * viewports.length)];
}

/**
 * Validate phone number
 */
export function validatePhone(phone) {
    if (!phone) return null;

    // Remove all non-digit characters except + at start
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Must have at least 7 digits
    if (cleaned.replace(/\+/g, '').length < 7) return null;

    return cleaned;
}

/**
 * Validate email address
 */
export function validateEmail(email) {
    if (!email) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email.toLowerCase() : null;
}

/**
 * Validate and clean URL
 */
export function validateUrl(url) {
    if (!url) return null;

    try {
        // Remove Google redirect wrapper
        if (url.includes('google.com/url?q=')) {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            url = urlParams.get('q') || url;
        }

        const parsed = new URL(url);

        // Only http and https
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;

        return url;
    } catch {
        return null;
    }
}

/**
 * Format timestamp for logging
 */
export function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Log with timestamp and color
 */
export function log(message, type = 'info') {
    const timestamp = chalk.gray(`[${getTimestamp()}]`);

    switch (type) {
        case 'success':
            console.log(timestamp, chalk.green('✓'), message);
            break;
        case 'error':
            console.log(timestamp, chalk.red('✗'), message);
            break;
        case 'warning':
            console.log(timestamp, chalk.yellow('⚠'), message);
            break;
        case 'info':
        default:
            console.log(timestamp, chalk.blue('ℹ'), message);
            break;
    }
}

/**
 * Check memory usage
 */
export function getMemoryUsage() {
    const used = process.memoryUsage();
    return {
        heapUsed: Math.round(used.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(used.heapTotal / 1024 / 1024),
        rss: Math.round(used.rss / 1024 / 1024),
        external: Math.round(used.external / 1024 / 1024)
    };
}

/**
 * Check if memory usage is too high
 */
export function isMemoryHigh(maxMemoryMB) {
    const memory = getMemoryUsage();
    return memory.rss > maxMemoryMB;
}

/**
 * Sanitize query for filename/logging
 */
export function sanitizeQuery(query) {
    return query.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Calculate estimated time remaining
 */
export function estimateTimeRemaining(completed, total, startTime) {
    if (completed === 0) return 'Calculating...';

    const elapsed = Date.now() - startTime;
    const rate = completed / elapsed;
    const remaining = (total - completed) / rate;

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
