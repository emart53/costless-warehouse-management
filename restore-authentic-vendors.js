import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreAuthenticVendors() {
  console.log('Restoring authentic vendor data from CSV...');
  
  try {
    const csvContent = readFileSync('./attached_assets/vendors.csv', 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Found ${records.length} vendor records to process`);

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        const vendorId = parseInt(record.vendor_id);
        const vendorCode = record.vendor_ap || `VENDOR_${record.vendor_id}`;
        const vendorName = record.vendor_name || 'Unknown Vendor';
        
        // Use INSERT ... ON CONFLICT to handle both new vendors and updates
        await pool.query(`
          INSERT INTO vendors (
            id, code, name, contact_name, email, phone, address, city, state, zip_code,
            discount_percent, ep_days, net_days, lead_time, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            contact_name = EXCLUDED.contact_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip_code = EXCLUDED.zip_code,
            discount_percent = EXCLUDED.discount_percent,
            ep_days = EXCLUDED.ep_days,
            net_days = EXCLUDED.net_days,
            lead_time = EXCLUDED.lead_time,
            is_active = EXCLUDED.is_active
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
          record.is_active === '1' || record.is_active === 'true'
        ]);

        successCount++;
        if (successCount % 50 === 0) {
          console.log(`Processed ${successCount} vendors...`);
        }

      } catch (error) {
        console.error(`Error processing vendor ${record.vendor_name} (ID: ${record.vendor_id}):`, error.message);
        errorCount++;
      }
    }

    console.log(`Vendor restoration complete: ${successCount} successful, ${errorCount} errors`);

    // Verify that vendor 244 is now present
    const vendor244 = await pool.query('SELECT id, code, name FROM vendors WHERE id = 244');
    if (vendor244.rows.length > 0) {
      console.log('✓ Vendor 244 (Lucela Inc) successfully restored');
    } else {
      console.log('✗ Vendor 244 still missing');
    }

  } catch (error) {
    console.error('Error restoring vendors:', error);
  } finally {
    await pool.end();
  }
}

restoreAuthenticVendors().catch(console.error);