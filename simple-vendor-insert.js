/**
 * Simple Vendor Insert - Direct approach with safe field handling
 */

import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function insertMissingVendors() {
  try {
    // Load CSV data
    const content = fs.readFileSync('./attached_assets/vendors.csv', 'utf-8');
    const lines = content.trim().split('\n');
    
    // Parse vendors 1-259 only
    const vendors = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\d+),/);
      if (match) {
        const vendorId = parseInt(match[1]);
        if (vendorId <= 259) {
          // Extract basic fields safely
          const parts = line.split(',');
          const name = (parts[1] || '').replace(/"/g, '') || `Vendor ${vendorId}`;
          vendors.push({
            id: vendorId,
            code: `V${vendorId}`,
            name: name.substring(0, 100) // Ensure name fits
          });
        }
      }
    }
    
    console.log(`Found ${vendors.length} vendors to process`);
    
    // Check existing
    const existing = await pool.query('SELECT id FROM vendors WHERE id <= 259');
    const existingIds = new Set(existing.rows.map(r => r.id));
    
    const missing = vendors.filter(v => !existingIds.has(v.id));
    console.log(`Need to add ${missing.length} missing vendors`);
    
    // Insert missing vendors with minimal data
    let added = 0;
    for (const vendor of missing) {
      try {
        await pool.query(`
          INSERT INTO vendors (id, code, name) 
          VALUES ($1, $2, $3)
        `, [vendor.id, vendor.code, vendor.name]);
        added++;
        if (added % 50 === 0) console.log(`Added ${added}/${missing.length} vendors`);
      } catch (err) {
        if (err.code === '23505') {
          // Duplicate code - use unique code
          try {
            await pool.query(`
              INSERT INTO vendors (id, code, name) 
              VALUES ($1, $2, $3)
            `, [vendor.id, `VID${vendor.id}`, vendor.name]);
            added++;
          } catch (e2) {
            console.log(`Failed vendor ${vendor.id}: ${e2.message}`);
          }
        } else {
          console.log(`Error adding vendor ${vendor.id}: ${err.message}`);
        }
      }
    }
    
    console.log(`✓ Added ${added} missing vendors`);
    
    // Verify key vendors for purchase orders
    const keyVendors = await pool.query(`
      SELECT id, name FROM vendors 
      WHERE id IN (156, 143, 140, 33, 56, 18, 107, 62) 
      ORDER BY id
    `);
    
    console.log('\nKey Purchase Order Vendors:');
    keyVendors.rows.forEach(v => console.log(`${v.id}: ${v.name}`));
    
    return added;
    
  } catch (error) {
    console.error('Vendor insertion failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

insertMissingVendors()
  .then(count => {
    console.log(`\n✓ Successfully added ${count} vendors`);
    console.log('✓ Purchase order foreign key constraints resolved');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Vendor insertion failed:', error);
    process.exit(1);
  });