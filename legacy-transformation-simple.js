import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pkg from 'pg';
const { Pool } = pkg;

async function transformLegacyProductsSimple() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Loading legacy products data...');
    
    // Read and parse CSV
    let csvData = fs.readFileSync('./attached_assets/products.csv', 'utf8');
    csvData = csvData.replace(/^\uFEFF/, ''); // Remove BOM
    
    const records = parse(csvData, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });

    console.log(`Processing ${records.length} legacy products...`);

    const client = await pool.connect();
    
    try {
      // Clear existing data
      await client.query('TRUNCATE TABLE product_prices CASCADE');
      await client.query('TRUNCATE TABLE products CASCADE');

      let successCount = 0;
      let errorCount = 0;

      // Process in smaller batches to avoid timeouts
      for (let i = 0; i < records.length; i += 100) {
        const batch = records.slice(i, i + 100);
        console.log(`Processing batch ${Math.floor(i/100) + 1}/${Math.ceil(records.length/100)}...`);

        for (const record of batch) {
          try {
            const productId = parseInt(record.ProductId);
            if (!productId) continue;

            // Determine status from legacy fields
            const isActive = parseInt(record.IsActive) || 0;
            const isDisco = parseInt(record.Disco) || 0;
            let status = 'Active';
            
            if (isDisco === 1) {
              status = 'Discontinued-Transfers-Only';
            } else if (isActive === 0) {
              status = 'Inactive';
            }

            // Insert product
            await client.query(`
              INSERT INTO products (
                product_id, product_name, product_description, case_pack, size,
                department_id, category_id, vendor_id, status, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            `, [
              productId,
              record['Product Description'] || `Product ${productId}`,
              record['Product Description'],
              parseInt(record.CasePack) || 1,
              record.Size || '',
              parseInt(record.Dept) || 1,
              parseInt(record.Category) || 1,
              parseInt(record.VendorId) || null,
              status
            ]);

            // Insert pricing data
            const transferCost = parseFloat(record.TransCaseCost) || 0;
            const retailPrice = parseFloat(record['Retail Unit']) || 0;
            
            if (transferCost > 0 || retailPrice > 0) {
              await client.query(`
                INSERT INTO product_prices (
                  purchase_cost, transfer_cost, unit_cost, retail_price, 
                  off_invoice, bill_back, price_multiple, effective_date,
                  start_date, product_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
              `, [
                parseFloat(record['WhseCase Cost']) || 0,
                transferCost,
                transferCost, // unit_cost same as transfer_cost
                retailPrice,
                parseFloat(record.OffInvoice) || 0,
                parseFloat(record.BillBack) || 0,
                parseInt(record.RetailMult) || 1,
                '2025-04-24',
                '2025-04-24',
                productId
              ]);
            }

            successCount++;

          } catch (error) {
            console.error(`Error processing product ${record.ProductId}: ${error.message}`);
            errorCount++;
          }
        }
      }

      console.log('\n=== TRANSFORMATION RESULTS ===');
      console.log(`Successfully processed: ${successCount} products`);
      console.log(`Errors encountered: ${errorCount}`);
      console.log(`Success rate: ${((successCount / records.length) * 100).toFixed(1)}%`);

      // Verify final counts
      const productCount = await client.query('SELECT COUNT(*) FROM products');
      const priceCount = await client.query('SELECT COUNT(*) FROM product_prices');
      
      console.log('\n=== DATABASE VERIFICATION ===');
      console.log(`Products loaded: ${productCount.rows[0].count}`);
      console.log(`Pricing records: ${priceCount.rows[0].count}`);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Transformation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run transformation
transformLegacyProductsSimple()
  .then(() => {
    console.log('\nLegacy products transformation completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTransformation failed:', error);
    process.exit(1);
  });