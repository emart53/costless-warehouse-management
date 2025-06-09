// Simple test to verify your product data is accessible
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function testProductSearch() {
    try {
        console.log('Testing product search with your real data...');
        
        // Test search for product ID 54 (Jose Cuervo)
        const result = await pool.query(`
            SELECT 
                product_id as id,
                COALESCE(product_name, product_description, 'Product ' || product_id) as name,
                brand,
                size as unit_size,
                case_pack,
                status,
                case_upc as sku
            FROM products 
            WHERE product_id = $1
        `, [54]);
        
        console.log('Product 54 found:', result.rows[0]);
        
        // Test search for all active products
        const allProducts = await pool.query(`
            SELECT 
                product_id as id,
                COALESCE(product_name, product_description, 'Product ' || product_id) as name,
                brand,
                case_pack,
                status
            FROM products 
            WHERE is_active = true AND product_id IS NOT NULL
            ORDER BY product_id
            LIMIT 5
        `);
        
        console.log('First 5 active products:');
        allProducts.rows.forEach(p => {
            console.log(`  ${p.id}: ${p.name} (${p.brand}) - ${p.status}`);
        });
        
    } catch (error) {
        console.error('Database connection error:', error.message);
    } finally {
        pool.end();
    }
}

testProductSearch();