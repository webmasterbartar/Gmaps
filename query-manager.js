import fs from 'fs/promises';
import { log } from './utils.js';

class QueryManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.queries = [];
        this.completedQueries = new Set();
    }

    /**
     * Load queries from file
     * Supports both .txt (one query per line) and .json (array of queries)
     */
    async loadQueriesFromFile(filePath) {
        try {
            log(`Loading queries from ${filePath}...`, 'info');

            const content = await fs.readFile(filePath, 'utf-8');

            if (filePath.endsWith('.json')) {
                this.queries = JSON.parse(content);
            } else {
                // Assume .txt file with one query per line
                this.queries = content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#')); // Skip empty lines and comments
            }

            log(`Loaded ${this.queries.length} queries from file`, 'success');
            return this.queries.length;
        } catch (error) {
            log(`Failed to load queries: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Load completed queries from database and filter them out
     */
    async filterCompletedQueries() {
        try {
            const completed = await this.db.getCompletedQueries();
            this.completedQueries = new Set(completed);

            const remainingQueries = this.queries.filter(q => !this.completedQueries.has(q));
            const skipped = this.queries.length - remainingQueries.length;

            if (skipped > 0) {
                log(`Skipping ${skipped} already-completed queries (resume capability)`, 'info');
            }

            this.queries = remainingQueries;
            return {
                total: this.queries.length + skipped,
                remaining: this.queries.length,
                completed: skipped
            };
        } catch (error) {
            log(`Failed to filter completed queries: ${error.message}`, 'error');
            return {
                total: this.queries.length,
                remaining: this.queries.length,
                completed: 0
            };
        }
    }

    /**
     * Add failed queries for retry
     */
    async addFailedQueriesForRetry(maxRetries = 3) {
        try {
            const failed = await this.db.getFailedQueries(maxRetries);

            if (failed.length > 0) {
                // Add failed queries to the beginning for priority retry
                this.queries = [...failed, ...this.queries];
                log(`Added ${failed.length} failed queries for retry`, 'info');
            }

            return failed.length;
        } catch (error) {
            log(`Failed to add retry queries: ${error.message}`, 'error');
            return 0;
        }
    }

    /**
     * Get next query to process
     */
    getNextQuery() {
        return this.queries.shift();
    }

    /**
     * Get remaining query count
     */
    getRemainingCount() {
        return this.queries.length;
    }

    /**
     * Check if there are more queries
     */
    hasMore() {
        return this.queries.length > 0;
    }

    /**
     * Get all queries (for manual processing)
     */
    getAllQueries() {
        return [...this.queries];
    }

    /**
     * Create sample queries file (helper function)
     */
    static async createSampleQueriesFile(filePath = 'queries.txt') {
        const sampleQueries = [
            '# Sample Google Maps queries - one per line',
            '# Lines starting with # are ignored',
            '',
            'restaurants in Tehran',
            'coffee shops in Tehran',
            'hotels in Tehran',
            'dentists in Tehran',
            'lawyers in Tehran'
        ];

        try {
            await fs.writeFile(filePath, sampleQueries.join('\n'), 'utf-8');
            log(`Sample queries file created: ${filePath}`, 'success');
            return true;
        } catch (error) {
            log(`Failed to create sample file: ${error.message}`, 'error');
            return false;
        }
    }
}

export default QueryManager;
