import { MongoClient } from 'mongodb';
import config from './config.js';
import { log, getTimestamp } from './utils.js';

class DatabaseManager {
    constructor(dbName = null) {
        this.client = null;
        this.db = null;
        this.collections = {};
        this.isConnected = false;
        this.dbName = dbName || config.mongodb.dbName;
    }

    /**
     * Connect to MongoDB
     */
    async connect() {
        try {
            log('Connecting to MongoDB...', 'info');

            this.client = new MongoClient(config.mongodb.uri, {
                maxPoolSize: 10,
                minPoolSize: 2,
                maxIdleTimeMS: 30000
            });

            await this.client.connect();
            this.db = this.client.db(this.dbName);

            // Get collections
            this.collections.contacts = this.db.collection(config.mongodb.collections.contacts);
            this.collections.queriesProgress = this.db.collection(config.mongodb.collections.queriesProgress);

            // Create indexes for performance
            await this.createIndexes();

            this.isConnected = true;
            log(`Connected to MongoDB: ${this.dbName}`, 'success');
        } catch (error) {
            log(`MongoDB connection failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Create database indexes for better performance
     */
    async createIndexes() {
        try {
            // Index on phone for duplicate detection
            await this.collections.contacts.createIndex({ phone: 1 });

            // Compound index for query tracking
            await this.collections.contacts.createIndex({ sourceQuery: 1, businessName: 1 });

            // Index on timestamp for sorting
            await this.collections.contacts.createIndex({ timestamp: -1 });

            // Index on query for progress tracking
            await this.collections.queriesProgress.createIndex({ query: 1 }, { unique: true });

            log('Database indexes created', 'success');
        } catch (error) {
            // Indexes might already exist, that's okay
            log(`Index creation: ${error.message}`, 'warning');
        }
    }

    /**
     * Insert contact with duplicate check
     */
    async insertContact(contactData) {
        try {
            // Check for duplicate by phone number
            if (contactData.phone) {
                const existing = await this.collections.contacts.findOne({
                    phone: contactData.phone
                });

                if (existing) {
                    log(`Duplicate contact skipped: ${contactData.businessName} (${contactData.phone})`, 'warning');
                    return { inserted: false, duplicate: true };
                }
            }

            // Insert contact
            const result = await this.collections.contacts.insertOne({
                ...contactData,
                timestamp: new Date(),
                createdAt: getTimestamp()
            });

            log(`✓ Saved: ${contactData.businessName} (Query: "${contactData.sourceQuery}")`, 'success');

            return {
                inserted: true,
                duplicate: false,
                id: result.insertedId
            };
        } catch (error) {
            log(`Failed to insert contact: ${error.message}`, 'error');
            return { inserted: false, error: error.message };
        }
    }

    /**
     * Batch insert contacts (more efficient)
     */
    async batchInsertContacts(contacts) {
        if (!contacts || contacts.length === 0) return { inserted: 0 };

        try {
            // Filter out duplicates by checking existing phones
            const phones = contacts.map(c => c.phone).filter(p => p);

            const existingPhones = await this.collections.contacts
                .find({ phone: { $in: phones } })
                .project({ phone: 1 })
                .toArray();

            const existingPhoneSet = new Set(existingPhones.map(e => e.phone));

            const newContacts = contacts.filter(c => !c.phone || !existingPhoneSet.has(c.phone));

            if (newContacts.length === 0) {
                log('All contacts are duplicates, skipped batch', 'warning');
                return { inserted: 0, duplicates: contacts.length };
            }

            // Add timestamp to all
            const contactsWithTimestamp = newContacts.map(c => ({
                ...c,
                timestamp: new Date(),
                createdAt: getTimestamp()
            }));

            const result = await this.collections.contacts.insertMany(contactsWithTimestamp, {
                ordered: false // Continue on error
            });

            log(`Batch inserted ${result.insertedCount} contacts`, 'success');

            return {
                inserted: result.insertedCount,
                duplicates: contacts.length - newContacts.length
            };
        } catch (error) {
            log(`Batch insert error: ${error.message}`, 'error');
            return { inserted: 0, error: error.message };
        }
    }

    /**
     * Mark query as completed
     */
    async markQueryCompleted(query, stats) {
        try {
            await this.collections.queriesProgress.updateOne(
                { query },
                {
                    $set: {
                        status: 'completed',
                        completedAt: new Date(),
                        completedTimestamp: getTimestamp(),
                        ...stats
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            log(`Failed to mark query completed: ${error.message}`, 'error');
        }
    }

    /**
     * Mark query as failed
     */
    async markQueryFailed(query, errorMessage) {
        try {
            await this.collections.queriesProgress.updateOne(
                { query },
                {
                    $set: {
                        status: 'failed',
                        failedAt: new Date(),
                        failedTimestamp: getTimestamp(),
                        error: errorMessage
                    },
                    $inc: { retryCount: 1 }
                },
                { upsert: true }
            );
        } catch (error) {
            log(`Failed to mark query as failed: ${error.message}`, 'error');
        }
    }

    /**
     * Mark query as in progress
     */
    async markQueryInProgress(query) {
        try {
            await this.collections.queriesProgress.updateOne(
                { query },
                {
                    $set: {
                        status: 'in_progress',
                        startedAt: new Date(),
                        startedTimestamp: getTimestamp()
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            log(`Failed to mark query in progress: ${error.message}`, 'error');
        }
    }

    /**
     * Get completed queries
     */
    async getCompletedQueries() {
        try {
            const completed = await this.collections.queriesProgress
                .find({ status: 'completed' })
                .project({ query: 1 })
                .toArray();

            return completed.map(q => q.query);
        } catch (error) {
            log(`Failed to get completed queries: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Get failed queries for retry
     */
    async getFailedQueries(maxRetries = 3) {
        try {
            const failed = await this.collections.queriesProgress
                .find({
                    status: 'failed',
                    $or: [
                        { retryCount: { $exists: false } },
                        { retryCount: { $lt: maxRetries } }
                    ]
                })
                .project({ query: 1 })
                .toArray();

            return failed.map(q => q.query);
        } catch (error) {
            log(`Failed to get failed queries: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Get statistics
     */
    async getStats() {
        try {
            const totalContacts = await this.collections.contacts.countDocuments();
            const completedQueries = await this.collections.queriesProgress.countDocuments({ status: 'completed' });
            const failedQueries = await this.collections.queriesProgress.countDocuments({ status: 'failed' });
            const inProgressQueries = await this.collections.queriesProgress.countDocuments({ status: 'in_progress' });

            // Get contacts per source query
            const contactsByQuery = await this.collections.contacts.aggregate([
                { $group: { _id: '$sourceQuery', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray();

            return {
                totalContacts,
                completedQueries,
                failedQueries,
                inProgressQueries,
                topQueries: contactsByQuery.map(q => ({ query: q._id, contacts: q.count }))
            };
        } catch (error) {
            log(`Failed to get stats: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            log('MongoDB connection closed', 'info');
        }
    }
}

export default DatabaseManager;
