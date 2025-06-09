import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreVendorIntegrity() {
  console.log('Restoring vendor data integrity from authentic CSV...');
  
  try {
    const csvContent = readFileSync('./attached_assets/vendors.csv', 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Processing ${records.length} authentic vendor records`);

    let correctedCount = 0;
    let insertedCount = 0;

    for (const record of records) {
      const vendorId = parseInt(record.vendor_id);
      const vendorCode = record.vendor_ap;
      const vendorName = record.vendor_name;
      
      // Check if vendor exists and has correct data
      const existingResult = await pool.query('SELECT id, code, name FROM vendors WHERE id = $1', [vendorId]);
      
      if (existingResult.rows.length === 0) {
        // Insert missing vendor
        await pool.query(`
          INSERT INTO vendors (
            id, code, name, contact_name, email, phone, address, city, state, zip_code,
            discount_percent, ep_days, net_days, lead_time, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          vendorId,
          vendorCode,
          vendorName,
          record.contact_person || null,
          record.email || null,
          record.phone || null,
          record.address || null,
          record.city || null,
          record.state || null,
          record.zip || null,
          parseFloat(record.discount) || 0,
          parseInt(record.ep_days) || null,
          parseInt(record.net_days) || null,
          parseInt(record.lead_time) || null,
          record.is_active === '1'
        ]);
        insertedCount++;
        console.log(`Inserted missing vendor ID ${vendorId}: ${vendorCode} - ${vendorName}`);
      } else {
        const existing = existingResult.rows[0];
        
        // Check if data needs correction
        if (existing.code !== vendorCode || existing.name !== vendorName) {
          await pool.query(`
            UPDATE vendors SET 
              code = $1,
              name = $2,
              contact_name = $3,
              email = $4,
              phone = $5,
              address = $6,
              city = $7,
              state = $8,
              zip_code = $9,
              discount_percent = $10,
              ep_days = $11,
              net_days = $12,
              lead_time = $13,
              is_active = $14
            WHERE id = $15
          `, [
            vendorCode,
            vendorName,
            record.contact_person || null,
            record.email || null,
            record.phone || null,
            record.address || null,
            record.city || null,
            record.state || null,
            record.zip || null,
            parseFloat(record.discount) || 0,
            parseInt(record.ep_days) || null,
            parseInt(record.net_days) || null,
            parseInt(record.lead_time) || null,
            record.is_active === '1',
            vendorId
          ]);
          correctedCount++;
          console.log(`Corrected vendor ID ${vendorId}: ${existing.code} -> ${vendorCode}, ${existing.name} -> ${vendorName}`);
        }
      }
    }

    console.log(`\nVendor integrity restoration complete:`);
    console.log(`- Corrected: ${correctedCount} vendors`);
    console.log(`- Inserted: ${insertedCount} vendors`);
    
    // Verify critical vendors
    const testVendors = [33, 1, 10];
    for (const vendorId of testVendors) {
      const result = await pool.query('SELECT id, code, name FROM vendors WHERE id = $1', [vendorId]);
      if (result.rows.length > 0) {
        const vendor = result.rows[0];
        console.log(`Verified vendor ID ${vendor.id}: ${vendor.code} - ${vendor.name}`);
      }
    }

  } catch (error) {
    console.error('Error restoring vendor integrity:', error);
  } finally {
    await pool.end();
  }
}

restoreVendorIntegrity().catch(console.error);