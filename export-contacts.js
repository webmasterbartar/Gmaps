#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import fs from 'fs';
import config from './config.js';

/**
 * Export contacts from MongoDB to CSV
 */
async function exportContacts(dbName, outputFile) {
    try {
        console.log(`Connecting to MongoDB: ${dbName}...`);
        
        const client = new MongoClient(config.mongodb.uri);
        await client.connect();
        
        const db = client.db(dbName);
        const contacts = await db.collection('contacts').find({}).toArray();
        
        console.log(`Found ${contacts.length} contacts`);
        
        if (contacts.length === 0) {
            console.log('No contacts to export');
            await client.close();
            return;
        }
        
        // CSV Header
        const headers = ['Business Name', 'Phone', 'Website', 'Email', 'Source Query', 'Extracted At'];
        let csv = headers.join(',') + '\n';
        
        // CSV Rows
        contacts.forEach(contact => {
            const row = [
                `"${(contact.businessName || '').replace(/"/g, '""')}"`,
                `"${(contact.phone || '').replace(/"/g, '""')}"`,
                `"${(contact.website || '').replace(/"/g, '""')}"`,
                `"${(contact.email || '').replace(/"/g, '""')}"`,
                `"${(contact.sourceQuery || '').replace(/"/g, '""')}"`,
                `"${(contact.extractedAt || contact.createdAt || '').replace(/"/g, '""')}"`
            ];
            csv += row.join(',') + '\n';
        });
        
        // Write to file
        fs.writeFileSync(outputFile, csv, 'utf-8');
        console.log(`✅ Exported ${contacts.length} contacts to ${outputFile}`);
        
        await client.close();
    } catch (error) {
        console.error(`❌ Export failed: ${error.message}`);
        process.exit(1);
    }
}

// Command line arguments
const args = process.argv.slice(2);
const dbName = args[0];
const outputFile = args[1] || `contacts_${dbName}.csv`;

if (!dbName) {
    console.log(`
Usage: node export-contacts.js <db-name> [output-file]

Examples:
  node export-contacts.js elevator_scraper
  node export-contacts.js painting_scraper contacts_painting.csv
  node export-contacts.js elevator_scraper contacts_elevator.csv
    `);
    process.exit(1);
}

exportContacts(dbName, outputFile);

