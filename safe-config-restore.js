import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

async function safeConfigRestore() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Safely restoring product configurations...');
    
    // Read CSV data
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').slice(1);
    
    // Prepare bulk updates with proper value validation
    const updates = [];
    let validRecords = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      const productId = parseInt(columns[0]);
      if (!productId) continue;
      
      // Extract and validate values
      const size = (columns[6] || '').replace(/'/g, "''").substring(0, 50); // Limit size
      const casePack = Math.min(parseInt(columns[5]) || 0, 999); // Reasonable limit
      const purchaseCost = Math.min(parseFloat(columns[14]) || 0, 999999.99); // Max 10,2
      const offInvoice = Math.min(parseFloat(columns[15]) || 0, 999999.99); // Max 10,2
      const billBack = Math.min(parseFloat(columns[16]) || 0, 999999.99); // Max 10,2
      const crv = Math.min(parseFloat(columns[17]) || 0, 999999.9999); // Max 10,4
      
      updates.push(`
        UPDATE products 
        SET 
          size = '${size}',
          case_pack = ${casePack},
          purchase_cost = ${purchaseCost},
          off_invoice = ${offInvoice},
          bill_back = ${billBack},
          crv = ${crv}
        WHERE product_id = ${productId};
      `);
      
      validRecords++;
      
      // Execute in batches of 100
      if (updates.length >= 100) {
        await pool.query(updates.join('\n'));
        console.log(`Processed ${validRecords} products...`);
        updates.length = 0; // Clear array
      }
    }
    
    // Execute remaining updates
    if (updates.length > 0) {
      await pool.query(updates.join('\n'));
    }
    
    console.log(`\nCompleted configuration restoration for ${validRecords} products`);
    
    // Test specific products
    const testResults = await pool.query(`
      SELECT 
        product_id,
        product_description,
        size,
        case_pack,
        purchase_cost,
        off_invoice,
        bill_back,
        crv,
        status
      FROM products 
      WHERE product_id IN (54, 1, 100)
      ORDER BY product_id
    `);
    
    console.log('\nTest results for key products:');
    testResults.rows.forEach(product => {
      console.log(`Product ${product.product_id}: ${product.product_description}`);
      console.log(`  Size: ${product.size}, Case Pack: ${product.case_pack}`);
      console.log(`  Cost: $${product.purchase_cost}, Off Invoice: $${product.off_invoice}`);
      console.log(`  Bill Back: $${product.bill_back}, CRV: $${product.crv}`);
      console.log(`  Status: ${product.status}\n`);
    });
    
    // Final summary
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN size IS NOT NULL AND size != '' THEN 1 END) as products_with_size,
        COUNT(CASE WHEN purchase_cost > 0 THEN 1 END) as products_with_cost,
        COUNT(CASE WHEN case_pack > 0 THEN 1 END) as products_with_case_pack,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_products
      FROM products 
      WHERE product_id IS NOT NULL
    `);
    
    const result = summary.rows[0];
    console.log('Final configuration summary:');
    console.log(`Total products: ${result.total_products}`);
    console.log(`Products with size: ${result.products_with_size}`);
    console.log(`Products with purchase cost: ${result.products_with_cost}`);
    console.log(`Products with case pack: ${result.products_with_case_pack}`);
    console.log(`Active products: ${result.active_products}`);
    
  } catch (error) {
    console.error('Error during configuration restoration:', error);
  } finally {
    await pool.end();
  }
}

safeConfigRestore();