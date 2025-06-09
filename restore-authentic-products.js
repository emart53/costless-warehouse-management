import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreAuthenticProducts() {
  console.log('Restoring authentic product data from CSV...');
  
  try {
    const csvContent = readFileSync('./attached_assets/products.csv', 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    console.log('CSV headers:', headers);
    
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Manual CSV parsing to handle malformed quotes
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' && (j === 0 || line[j-1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (j === line.length - 1 || line[j+1] === ',')) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current.replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.replace(/^"|"$/g, ''));
      
      if (values.length >= 14) {
        const record = {
          product_id: values[0],
          product_description: values[1],
          brand: values[2],
          product_name: values[3],
          case_upc: values[4],
          case_pack: values[5],
          size: values[6],
          discontinued_date: values[7],
          is_active: values[8],
          created_at: values[9],
          updated_at: values[10],
          category_id: values[11],
          department_id: values[12],
          vendor_id: values[13],
          status: values[14] || 'active'
        };
        records.push(record);
      }
    }

    console.log(`Found ${records.length} product records to process`);

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        const productId = parseInt(record.product_id);
        
        await pool.query(`
          INSERT INTO products (
            product_id, product_description, brand, product_name, case_upc,
            case_pack, size, status, category_id, department_id, vendor_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (product_id) DO UPDATE SET
            product_description = EXCLUDED.product_description,
            brand = EXCLUDED.brand,
            product_name = EXCLUDED.product_name,
            case_upc = EXCLUDED.case_upc,
            case_pack = EXCLUDED.case_pack,
            size = EXCLUDED.size,
            status = EXCLUDED.status,
            category_id = EXCLUDED.category_id,
            department_id = EXCLUDED.department_id,
            vendor_id = EXCLUDED.vendor_id
        `, [
          productId,
          record.product_description || '',
          record.brand || null,
          record.product_name || null,
          record.case_upc || null,
          parseInt(record.case_pack) || 1,
          record.size || '',
          record.status || 'active',
          parseInt(record.category_id) || null,
          parseInt(record.department_id) || null,
          parseInt(record.vendor_id) || null
        ]);

        successCount++;
        if (successCount % 100 === 0) {
          console.log(`Processed ${successCount} products...`);
        }

      } catch (error) {
        console.error(`Error processing product ${record.product_id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`Product restoration complete: ${successCount} successful, ${errorCount} errors`);

    // Verify that product 2844 is now present
    const product2844 = await pool.query('SELECT product_id, product_description, brand FROM products WHERE product_id = 2844');
    if (product2844.rows.length > 0) {
      console.log('✓ Product 2844 (Lucela Mesquite Charcoal) successfully restored');
    } else {
      console.log('✗ Product 2844 still missing');
    }

  } catch (error) {
    console.error('Error restoring products:', error);
  } finally {
    await pool.end();
  }
}

restoreAuthenticProducts().catch(console.error);