#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import ExcelJS from 'exceljs';
import fs from 'fs';
import config from './config.js';

/**
 * Export contacts from MongoDB to Excel (XLSX) with UTF-8 encoding
 */
async function exportToExcel(dbName, outputFile) {
    try {
        console.log(`📊 Connecting to MongoDB: ${dbName}...`);
        
        const client = new MongoClient(config.mongodb.uri);
        await client.connect();
        
        const db = client.db(dbName);
        const contacts = await db.collection('contacts').find({}).toArray();
        
        console.log(`✅ Found ${contacts.length} contacts`);
        
        if (contacts.length === 0) {
            console.log('⚠️  No contacts to export');
            await client.close();
            return;
        }
        
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Google Maps Scraper';
        workbook.created = new Date();
        
        // Create worksheet
        const worksheet = workbook.addWorksheet('Contacts');
        
        // Define columns with Persian headers
        worksheet.columns = [
            { header: 'نام کسب‌وکار', key: 'businessName', width: 30 },
            { header: 'تلفن', key: 'phone', width: 20 },
            { header: 'وب‌سایت', key: 'website', width: 40 },
            { header: 'ایمیل', key: 'email', width: 30 },
            { header: 'کوئری منبع', key: 'sourceQuery', width: 40 },
            { header: 'تاریخ استخراج', key: 'extractedAt', width: 25 }
        ];
        
        // Style header row
        worksheet.getRow(1).font = { bold: true, size: 12 };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Add data rows
        contacts.forEach((contact, index) => {
            const row = worksheet.addRow({
                businessName: contact.businessName || '',
                phone: contact.phone || '',
                website: contact.website || '',
                email: contact.email || '',
                sourceQuery: contact.sourceQuery || '',
                extractedAt: contact.extractedAt || contact.createdAt || ''
            });
            
            // Alternate row colors for better readability
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF9F9F9' }
                };
            }
            
            // Set text alignment
            row.alignment = { vertical: 'middle', horizontal: 'right' };
        });
        
        // Freeze header row
        worksheet.views = [
            { state: 'frozen', ySplit: 1 }
        ];
        
        // Auto-fit columns (optional)
        worksheet.columns.forEach(column => {
            column.width = Math.max(column.width || 10, 15);
        });
        
        // Write to file
        await workbook.xlsx.writeFile(outputFile);
        console.log(`✅ Exported ${contacts.length} contacts to ${outputFile}`);
        console.log(`📁 File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
        
        await client.close();
    } catch (error) {
        console.error(`❌ Export failed: ${error.message}`);
        process.exit(1);
    }
}

// Command line arguments
const args = process.argv.slice(2);
const dbName = args[0];
const outputFile = args[1] || `contacts_${dbName}.xlsx`;

if (!dbName) {
    console.log(`
📋 Export Contacts to Excel (UTF-8)

Usage: node export-to-excel.js <db-name> [output-file]

Examples:
  node export-to-excel.js elevator_scraper
  node export-to-excel.js painting_scraper contacts_painting.xlsx
  node export-to-excel.js elevator_scraper contacts_elevator.xlsx
    `);
    process.exit(1);
}

exportToExcel(dbName, outputFile);

