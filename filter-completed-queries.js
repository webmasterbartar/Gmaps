#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import fs from 'fs';
import config from './config.js';

/**
 * Filter out completed queries from queries.txt
 * Creates a new file with only remaining queries
 */
async function filterCompletedQueries(queriesFile = 'queries.txt', outputFile = 'queries_remaining.txt', dbName = null) {
    try {
        const targetDbName = dbName || config.mongodb.dbName;
        
        console.log(`📊 Connecting to MongoDB: ${targetDbName}...`);
        
        const client = new MongoClient(config.mongodb.uri);
        await client.connect();
        
        const db = client.db(targetDbName);
        
        // Get all completed queries
        const completedQueries = await db.collection('queries_progress')
            .find({ status: 'completed' })
            .project({ query: 1 })
            .toArray();
        
        const completedSet = new Set(completedQueries.map(q => q.query));
        
        console.log(`✅ Found ${completedSet.size} completed queries in database`);
        
        // Read queries file
        console.log(`📖 Reading ${queriesFile}...`);
        const content = await fs.promises.readFile(queriesFile, 'utf-8');
        const allQueries = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));
        
        console.log(`📋 Total queries in file: ${allQueries.length}`);
        
        // Filter out completed queries
        const remainingQueries = allQueries.filter(query => !completedSet.has(query));
        
        console.log(`📊 Remaining queries: ${remainingQueries.length}`);
        console.log(`🗑️  Removed: ${allQueries.length - remainingQueries.length} completed queries`);
        
        // Write remaining queries to new file
        await fs.promises.writeFile(outputFile, remainingQueries.join('\n') + '\n', 'utf-8');
        
        console.log(`✅ Saved remaining queries to: ${outputFile}`);
        
        // Also show statistics
        const failedQueries = await db.collection('queries_progress')
            .find({ status: 'failed' })
            .project({ query: 1 })
            .toArray();
        
        console.log(`\n📈 Statistics:`);
        console.log(`   Total in file: ${allQueries.length}`);
        console.log(`   Completed: ${completedSet.size}`);
        console.log(`   Failed: ${failedQueries.length}`);
        console.log(`   Remaining: ${remainingQueries.length}`);
        
        await client.close();
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Command line arguments
const args = process.argv.slice(2);
const queriesFile = args[0] || 'queries.txt';
const outputFile = args[1] || 'queries_remaining.txt';
const dbName = args[2] || null;

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📋 Filter Completed Queries

Usage: node filter-completed-queries.js [queries-file] [output-file] [db-name]

Arguments:
  queries-file    Input queries file (default: queries.txt)
  output-file     Output file with remaining queries (default: queries_remaining.txt)
  db-name         Database name (default: from config.js)

Examples:
  node filter-completed-queries.js
  node filter-completed-queries.js queries.txt queries_remaining.txt
  node filter-completed-queries.js queries.txt queries_remaining.txt google_maps_scraper
    `);
    process.exit(0);
}

filterCompletedQueries(queriesFile, outputFile, dbName);

