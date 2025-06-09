/**
 * Restore Vendor Assignments from Original CostLessWarehouse CSV
 * Your authentic data shows every product has a vendor - migration lost these assignments
 */

import fs from 'fs';
import { Pool } from 'pg';

async function restoreVendorAssignments() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Reading original CostLessWarehouse vendor assignments...');
    
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').slice(1); // Skip header
    
    let updatedCount = 0;
    let batchCount = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      const productId = parseInt(columns[0]);
      const vendorId = parseInt(columns[1]);
      
      if (productId && vendorId) {
        await pool.query(`
          UPDATE products 
          SET vendor_id = $1
          WHERE product_id = $2 AND vendor_id IS NULL
        `, [vendorId, productId]);
        
        updatedCount++;
        
        if (++batchCount % 100 === 0) {
          console.log(`Restored ${batchCount} vendor assignments...`);
        }
      }
    }
    
    // Verify restoration
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(vendor_id) as with_vendor,
        COUNT(CASE WHEN vendor_id IS NULL THEN 1 END) as without_vendor
      FROM products 
      WHERE product_id IS NOT NULL
    `);
    
    console.log('Vendor assignment restoration complete:');
    console.log(`Total products: ${result.rows[0].total}`);
    console.log(`With vendor: ${result.rows[0].with_vendor}`);
    console.log(`Without vendor: ${result.rows[0].without_vendor}`);
    console.log(`Updated: ${updatedCount} products`);
    
  } catch (error) {
    console.error('Error restoring vendor assignments:', error);
  } finally {
    await pool.end();
  }
}

restoreVendorAssignments();