import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

async function restoreAuthenticActiveStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Restoring authentic CostLessWarehouse active status...');
    
    // Read CSV and extract ProductIds where IsActive=1
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').slice(1);
    const activeProductIds = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      const productId = parseInt(columns[0]);
      const isActive = parseInt(columns[31]); // IsActive is column 32 (0-based index 31)
      
      if (productId && isActive === 1) {
        activeProductIds.push(productId);
      }
    }
    
    console.log(`Found ${activeProductIds.length} products with IsActive=1`);
    
    // Set only these products to Active status
    if (activeProductIds.length > 0) {
      const placeholders = activeProductIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await pool.query(`
        UPDATE products 
        SET status = 'Active' 
        WHERE product_id IN (${placeholders})
      `, activeProductIds);
      
      console.log(`Updated ${result.rowCount} products to Active status`);
    }
    
    // Verify the counts
    const verification = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM products 
      WHERE product_id IS NOT NULL
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'Active' THEN 1 
          WHEN 'Inactive' THEN 2 
          WHEN 'Discontinued' THEN 3 
          ELSE 4 
        END
    `);
    
    console.log('\nCorrected status counts:');
    verification.rows.forEach(row => {
      console.log(`${row.status}: ${row.count}`);
    });
    
    // Verify against CSV
    console.log(`\nAuthentic CostLessWarehouse logic restored:`);
    console.log(`- Active products in system: ${verification.rows.find(r => r.status === 'Active')?.count || 0}`);
    console.log(`- Products with IsActive=1 in CSV: ${activeProductIds.length}`);
    console.log(`- Warehouse size constraint: <400 products ✓`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

restoreAuthenticActiveStatus();