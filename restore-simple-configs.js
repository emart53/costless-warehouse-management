import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

async function restoreSimpleConfigurations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Restoring product configurations with simple approach...');
    
    // Read CSV data
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').slice(1);
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      const productId = parseInt(columns[0]);
      
      if (!productId) continue;
      
      // Extract key data from CSV
      const size = columns[6] || '';
      const casePack = parseInt(columns[5]) || 0;
      const shipCfg = columns[10] || 'Case';
      const shipUnitCt = parseFloat(columns[11]) || 0;
      const shipCaseQty = parseFloat(columns[13]) || 0;
      const whseCaseCost = parseFloat(columns[14]) || 0;
      const offInvoice = parseFloat(columns[15]) || 0;
      const billBack = parseFloat(columns[16]) || 0;
      const crv = parseFloat(columns[17]) || 0;
      const transCfg = columns[19] || 'Case';
      const transUnitCt = parseFloat(columns[20]) || 0;
      const transCaseCost = parseFloat(columns[22]) || 0;
      const retailUnit = parseFloat(columns[25]) || 0;
      
      // Update main products table with essential configuration data
      await pool.query(`
        UPDATE products 
        SET 
          size = $1,
          case_pack = $2,
          purchase_cost = $3,
          off_invoice = $4,
          bill_back = $5,
          crv = $6
        WHERE product_id = $7
      `, [size, casePack, whseCaseCost, offInvoice, billBack, crv, productId]);
      
      // Insert or update purchase configuration
      await pool.query(`
        INSERT INTO product_purchases (product_id, ship_cfg, ship_unit_ct, ship_case_qty, purchase_cost, off_invoice, bill_back, purchase_crv)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (product_id) DO UPDATE SET
          ship_cfg = EXCLUDED.ship_cfg,
          ship_unit_ct = EXCLUDED.ship_unit_ct,
          ship_case_qty = EXCLUDED.ship_case_qty,
          purchase_cost = EXCLUDED.purchase_cost,
          off_invoice = EXCLUDED.off_invoice,
          bill_back = EXCLUDED.bill_back,
          purchase_crv = EXCLUDED.purchase_crv
      `, [productId, shipCfg, shipUnitCt, shipCaseQty, whseCaseCost, offInvoice, billBack, crv]);
      
      // Insert or update transfer configuration
      await pool.query(`
        INSERT INTO product_transfers (product_id, trans_cfg, trans_unit_ct, trans_case_cost, trans_crv)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (product_id) DO UPDATE SET
          trans_cfg = EXCLUDED.trans_cfg,
          trans_unit_ct = EXCLUDED.trans_unit_ct,
          trans_case_cost = EXCLUDED.trans_case_cost,
          trans_crv = EXCLUDED.trans_crv
      `, [productId, transCfg, transUnitCt, transCaseCost, crv]);
      
      // Insert or update pricing
      if (retailUnit > 0) {
        await pool.query(`
          INSERT INTO product_prices (product_id, purchase_cost, retail_price)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id) DO UPDATE SET
            purchase_cost = EXCLUDED.purchase_cost,
            retail_price = EXCLUDED.retail_price
        `, [productId, whseCaseCost, retailUnit]);
      }
    }
    
    // Test configuration data for Product 54
    const testResult = await pool.query(`
      SELECT 
        p.product_id,
        p.product_description,
        p.size,
        p.case_pack,
        p.purchase_cost,
        p.off_invoice,
        p.bill_back,
        p.crv,
        pp.ship_cfg,
        pp.ship_unit_ct,
        pt.trans_cfg,
        pt.trans_unit_ct,
        pr.retail_price
      FROM products p
      LEFT JOIN product_purchases pp ON p.product_id = pp.product_id
      LEFT JOIN product_transfers pt ON p.product_id = pt.product_id  
      LEFT JOIN product_prices pr ON p.product_id = pr.product_id
      WHERE p.product_id = 54
    `);
    
    console.log('\nConfiguration test for Product 54:');
    if (testResult.rows.length > 0) {
      const product = testResult.rows[0];
      console.log(`Product: ${product.product_description}`);
      console.log(`Size: ${product.size}, Case Pack: ${product.case_pack}`);
      console.log(`Purchase Cost: $${product.purchase_cost}, Off Invoice: $${product.off_invoice}`);
      console.log(`Purchase Config: ${product.ship_cfg}, Units: ${product.ship_unit_ct}`);
      console.log(`Transfer Config: ${product.trans_cfg}, Units: ${product.trans_unit_ct}`);
      console.log(`Retail Price: $${product.retail_price}`);
    }
    
    // Summary
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE size IS NOT NULL AND size != '') as products_with_size,
        (SELECT COUNT(*) FROM product_purchases) as purchase_configs,
        (SELECT COUNT(*) FROM product_transfers) as transfer_configs,
        (SELECT COUNT(*) FROM product_prices) as pricing_configs
    `);
    
    console.log('\nConfiguration restoration summary:');
    console.log(`Products with size: ${summary.rows[0].products_with_size}`);
    console.log(`Purchase configurations: ${summary.rows[0].purchase_configs}`);
    console.log(`Transfer configurations: ${summary.rows[0].transfer_configs}`);
    console.log(`Pricing configurations: ${summary.rows[0].pricing_configs}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

restoreSimpleConfigurations();