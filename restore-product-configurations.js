import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

async function restoreProductConfigurations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Restoring product configuration relationships from CSV...');
    
    // Read CSV data
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').slice(1);
    
    let purchaseInserts = [];
    let transferInserts = [];
    let pricingInserts = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      const productId = parseInt(columns[0]);
      
      if (!productId) continue;
      
      // Extract purchase configuration data
      const shipPk = columns[9];
      const shipCfg = columns[10];
      const shipUnitCt = parseFloat(columns[11]) || 0;
      const shipConfigWt = parseFloat(columns[12]) || 0;
      const shipCaseQty = parseFloat(columns[13]) || 0;
      const whseCaseCost = parseFloat(columns[14]) || 0;
      const offInvoice = parseFloat(columns[15]) || 0;
      const billBack = parseFloat(columns[16]) || 0;
      const crv = parseFloat(columns[17]) || 0;
      
      // Extract transfer configuration data
      const transPk = columns[18];
      const transCfg = columns[19];
      const transUnitCt = parseFloat(columns[20]) || 0;
      const transConfigWt = parseFloat(columns[21]) || 0;
      const transCaseCost = parseFloat(columns[22]) || 0;
      const transCrv = parseFloat(columns[23]) || 0;
      
      // Extract pricing data
      const retailMult = parseFloat(columns[24]) || 0;
      const retailUnit = parseFloat(columns[25]) || 0;
      const redTagRetail = parseFloat(columns[26]) || 0;
      
      // Size from main product data
      const size = columns[6];
      const casePack = parseInt(columns[5]) || 0;
      
      // Prepare purchase configuration insert
      if (whseCaseCost > 0 || shipCfg) {
        purchaseInserts.push(`(${productId}, ${shipCaseQty || 'NULL'}, ${shipUnitCt || 'NULL'}, ${shipConfigWt || 'NULL'}, ${crv || 'NULL'}, NULL, '${shipPk || 'Case'}', '${shipCfg || 'Case'}', ${shipUnitCt || 'NULL'}, ${shipConfigWt || 'NULL'}, ${shipCaseQty || 'NULL'}, ${whseCaseCost || 'NULL'}, ${offInvoice || 'NULL'}, ${billBack || 'NULL'})`);
      }
      
      // Prepare transfer configuration insert
      if (transCaseCost > 0 || transCfg) {
        transferInserts.push(`(${productId}, '${transPk || 'Case'}', '${transCfg || 'Case'}', ${transUnitCt}, ${transConfigWt}, ${transCaseCost}, ${transCrv})`);
      }
      
      // Prepare pricing insert
      if (retailUnit > 0) {
        pricingInserts.push(`(${productId}, ${whseCaseCost}, ${retailUnit}, ${redTagRetail}, ${retailMult})`);
      }
    }
    
    // Clear existing configuration data
    await pool.query('DELETE FROM product_purchases');
    await pool.query('DELETE FROM product_transfers');
    await pool.query('DELETE FROM product_prices');
    
    console.log(`Inserting ${purchaseInserts.length} purchase configurations...`);
    if (purchaseInserts.length > 0) {
      await pool.query(`
        INSERT INTO product_purchases 
        (product_id, ship_pk, ship_cfg, ship_unit_ct, ship_config_wt, ship_case_qty, purchase_cost, off_invoice, bill_back, purchase_crv)
        VALUES ${purchaseInserts.join(',')}
      `);
    }
    
    console.log(`Inserting ${transferInserts.length} transfer configurations...`);
    if (transferInserts.length > 0) {
      await pool.query(`
        INSERT INTO product_transfers 
        (product_id, trans_pk, trans_cfg, trans_unit_ct, trans_config_wt, trans_case_cost, trans_crv)
        VALUES ${transferInserts.join(',')}
      `);
    }
    
    console.log(`Inserting ${pricingInserts.length} pricing records...`);
    if (pricingInserts.length > 0) {
      await pool.query(`
        INSERT INTO product_prices 
        (product_id, purchase_cost, retail_price, red_tag_price, retail_multiplier)
        VALUES ${pricingInserts.join(',')}
      `);
    }
    
    // Update main products table with size and case_pack
    console.log('Updating product size and case pack data...');
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      const productId = parseInt(columns[0]);
      const size = columns[6];
      const casePack = parseInt(columns[5]) || 0;
      
      if (productId && size) {
        await pool.query(`
          UPDATE products 
          SET size = $1, case_pack = $2
          WHERE product_id = $3
        `, [size, casePack, productId]);
      }
    }
    
    // Verify restoration
    const verification = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM product_purchases) as purchase_configs,
        (SELECT COUNT(*) FROM product_transfers) as transfer_configs,
        (SELECT COUNT(*) FROM product_prices) as pricing_records,
        (SELECT COUNT(*) FROM products WHERE size IS NOT NULL) as products_with_size
    `);
    
    console.log('\nConfiguration restoration complete:');
    console.log(`Purchase configurations: ${verification.rows[0].purchase_configs}`);
    console.log(`Transfer configurations: ${verification.rows[0].transfer_configs}`);
    console.log(`Pricing records: ${verification.rows[0].pricing_records}`);
    console.log(`Products with size: ${verification.rows[0].products_with_size}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

restoreProductConfigurations();