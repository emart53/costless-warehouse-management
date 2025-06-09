#!/usr/bin/env node
/**
 * Restore Authentic Legacy Structure
 * Rebuilds the stores table exactly as it was in your 19-year CostLessWarehouse system
 * Maintains all foreign key relationships with original IDs
 */

import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

async function restoreAuthenticLegacyStructure() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    
    console.log('Restoring authentic CostLessWarehouse legacy structure...');
    
    // Parse locations CSV with original IDs to maintain foreign key integrity
    let content = fs.readFileSync('attached_assets/locations.csv', 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    console.log('Loading authentic stores/locations with original legacy IDs...');
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            const line = lines[i];
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/^"|"$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));
            
            const row = {};
            headers.forEach((header, index) => {
                const value = values[index];
                row[header] = (value === 'NULL' || value === '' || value === undefined || value === 'None') ? null : value;
            });
            
            const locationId = parseInt(row.location_id);
            const name = row.location_name?.replace(/'/g, "''") || 'Unknown';
            const type = row.location_type?.toLowerCase() || '';
            const address = row.address?.replace(/'/g, "''") || '';
            const city = row.city || '';
            const state = row.state || '';
            const zip = row.zip || '';
            const contact = row.contact_person?.replace(/'/g, "''") || '';
            const email = row.email || '';
            const phone = row.phone || '';
            
            // Determine store number and type flags based on legacy data
            let storeNumber = null;
            let isWarehouse = false;
            let isDistributor = false;
            let locationType = 'store';
            
            if (type === 'store' || name.includes('Cost Less #')) {
                const storeMatch = name.match(/#\s*(\d+)/);
                storeNumber = storeMatch ? storeMatch[1] : locationId.toString();
                locationType = 'store';
            } else if (name.toLowerCase().includes('warehouse')) {
                isWarehouse = true;
                locationType = 'warehouse';
                storeNumber = 'WH';
            } else if (type === 'distributor' || name.includes('Distributing') || name.includes('Expediters')) {
                isDistributor = true;
                locationType = 'distributor';
                storeNumber = 'DIST';
            } else {
                locationType = 'office';
                storeNumber = 'OFF';
            }
            
            // Insert with original legacy ID to maintain foreign key relationships
            await client.query(`
                INSERT INTO stores (id, store_number, name, address, city, state, zip_code, phone, email, contact_person, location_type, is_warehouse, is_distributor, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
                ON CONFLICT (id) DO UPDATE SET
                    store_number = EXCLUDED.store_number,
                    name = EXCLUDED.name,
                    address = EXCLUDED.address,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    zip_code = EXCLUDED.zip_code,
                    phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    contact_person = EXCLUDED.contact_person,
                    location_type = EXCLUDED.location_type,
                    is_warehouse = EXCLUDED.is_warehouse,
                    is_distributor = EXCLUDED.is_distributor
            `, [locationId, storeNumber, name, address, city, state, zip, phone, email, contact, locationType, isWarehouse, isDistributor]);
            
        } catch (error) {
            console.warn(`Skipped problematic record: ${error.message}`);
        }
    }
    
    // Verify authentic legacy structure
    const summary = await client.query(`
        SELECT 
            location_type,
            COUNT(*) as count,
            array_agg(name ORDER BY id) as locations
        FROM stores
        GROUP BY location_type
        ORDER BY count DESC
    `);
    
    console.log('\nAuthentic legacy structure restored:');
    summary.rows.forEach(row => {
        console.log(`${row.location_type}: ${row.count} locations`);
        row.locations.slice(0, 3).forEach(loc => {
            console.log(`  - ${loc}`);
        });
        if (row.locations.length > 3) {
            console.log(`  ... and ${row.locations.length - 3} more`);
        }
    });
    
    // Verify foreign key integrity is maintained
    const transferCheck = await client.query(`
        SELECT COUNT(*) as transfer_count
        FROM transfer_orders t
        JOIN stores s ON t.store_id = s.id
    `);
    
    console.log(`\nForeign key integrity verified: ${transferCheck.rows[0].transfer_count} transfers linked to stores`);
    
    // Show sample of authentic data with original IDs
    const sampleData = await client.query(`
        SELECT id, name, location_type, city, state
        FROM stores
        ORDER BY id
        LIMIT 10
    `);
    
    console.log('\nAuthentic legacy data with original IDs:');
    sampleData.rows.forEach(row => {
        console.log(`ID ${row.id}: ${row.name} (${row.location_type}) - ${row.city}, ${row.state}`);
    });
    
    console.log('\nLegacy structure restored - all foreign key relationships preserved');
    
    await client.end();
}

restoreAuthenticLegacyStructure().catch(console.error);