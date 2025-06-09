import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

/**
 * Implement Authentic Unit Conversion Logic
 * Based on original CostLessWarehouse business rules from architect
 */
async function implementUnitConversions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Implementing authentic unit conversion logic...');
    
    // Read configuration data from CSV
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').slice(1);
    
    // Process each product with proper unit calculations
    let processedCount = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      const productId = parseInt(columns[0]);
      if (!productId) continue;
      
      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`Processed ${processedCount} products...`);
      }
      
      // Extract configuration data
      const casePack = parseInt(columns[5]) || 1;
      
      // Purchase configuration
      const shipCfg = columns[10] || 'Case';
      const shipUnitCt = parseFloat(columns[11]) || 0;
      const shipCaseQty = parseFloat(columns[13]) || 1;
      const purchaseCost = parseFloat(columns[14]) || 0;
      const crv = parseFloat(columns[17]) || 0;
      
      // Transfer configuration  
      const transCfg = columns[19] || 'Case';
      const transUnitCt = parseFloat(columns[20]) || 0;
      const transCaseQty = parseFloat(columns[22]) || 1;
      
      // Calculate purchase_unit_ct using casePack
      const purchaseUnitCt = shipCaseQty * casePack;
      
      // Calculate purchase_crv (CRV per case × number of cases)
      const purchaseCrv = Math.min(crv * shipCaseQty, 9999.99);
      
      // Calculate transfer_unit_ct using casePack  
      const transferUnitCt = transCaseQty * casePack;
      
      // Convert case quantities to integers for database storage
      const shipCaseQtyInt = Math.round(shipCaseQty);
      const transCaseQtyInt = Math.round(transCaseQty);
      
      // Calculate transfer_crv (CRV per case × number of transfer cases)
      const transferCrv = Math.min(crv * transCaseQty, 9999.99);
      
      // Calculate transfer cost using ratio logic
      const transferCost = shipCaseQty > 0 && transCaseQty > 0 ? 
        purchaseCost * (transCaseQty / shipCaseQty) : purchaseCost;
      
      // Calculate unit costs for pricing strategy
      const purchaseUnitCost = purchaseUnitCt > 0 ? purchaseCost / purchaseUnitCt : 0;
      const transferUnitCost = transferUnitCt > 0 ? purchaseCost / transferUnitCt : 0;
      
      // Update product purchases table with calculated values
      await pool.query(`
        INSERT INTO product_purchases (
          product_id, 
          ship_cfg, 
          ship_unit_ct, 
          ship_case_qty, 
          purchase_cost, 
          purchase_crv,
          off_invoice,
          bill_back
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (product_id) DO UPDATE SET
          ship_cfg = EXCLUDED.ship_cfg,
          ship_unit_ct = EXCLUDED.ship_unit_ct,
          ship_case_qty = EXCLUDED.ship_case_qty,
          purchase_cost = EXCLUDED.purchase_cost,
          purchase_crv = EXCLUDED.purchase_crv,
          off_invoice = EXCLUDED.off_invoice,
          bill_back = EXCLUDED.bill_back
      `, [
        productId, 
        shipCfg, 
        purchaseUnitCt, 
        shipCaseQtyInt, 
        purchaseCost, 
        purchaseCrv,
        parseFloat(columns[15]) || 0, // off_invoice
        parseFloat(columns[16]) || 0  // bill_back
      ]);
      
      // Update product transfers table with calculated values
      await pool.query(`
        INSERT INTO product_transfers (
          product_id,
          trans_cfg,
          trans_unit_ct,
          transfer_case_qty,
          trans_case_cost,
          trans_crv
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (product_id) DO UPDATE SET
          trans_cfg = EXCLUDED.trans_cfg,
          trans_unit_ct = EXCLUDED.trans_unit_ct,
          transfer_case_qty = EXCLUDED.transfer_case_qty,
          trans_case_cost = EXCLUDED.trans_case_cost,
          trans_crv = EXCLUDED.trans_crv
      `, [
        productId,
        transCfg,
        transferUnitCt,
        transCaseQtyInt,
        transferCost, // Calculated transfer cost using ratio
        transferCrv
      ]);
    }
    
    // Test calculations for Product 54 (Jose Cuervo)
    const testResult = await pool.query(`
      SELECT 
        p.product_id,
        p.product_description,
        p.case_pack,
        pp.ship_cfg,
        pp.ship_case_qty,
        pp.ship_unit_ct as purchase_unit_ct,
        pp.purchase_cost,
        pp.purchase_crv,
        pt.trans_cfg,
        pt.transfer_case_qty,
        pt.trans_unit_ct as transfer_unit_ct,
        pt.trans_crv,
        -- Calculate unit costs for pricing strategy
        CASE WHEN pp.ship_unit_ct > 0 THEN pp.purchase_cost / pp.ship_unit_ct ELSE 0 END as purchase_unit_cost,
        CASE WHEN pt.trans_unit_ct > 0 THEN pp.purchase_cost / pt.trans_unit_ct ELSE 0 END as transfer_unit_cost
      FROM products p
      LEFT JOIN product_purchases pp ON p.product_id = pp.product_id
      LEFT JOIN product_transfers pt ON p.product_id = pt.product_id
      WHERE p.product_id = 54
    `);
    
    console.log('\nUnit conversion test for Product 54 (Jose Cuervo):');
    if (testResult.rows.length > 0) {
      const product = testResult.rows[0];
      console.log(`Product: ${product.product_description}`);
      console.log(`Case Pack: ${product.case_pack} units per case`);
      console.log(`\nPurchase Configuration:`);
      console.log(`  Config: ${product.ship_cfg}`);
      console.log(`  Case Qty: ${product.ship_case_qty} cases`);
      console.log(`  Unit Count: ${product.purchase_unit_ct} units (${product.ship_case_qty} × ${product.case_pack})`);
      console.log(`  Purchase Cost: $${product.purchase_cost}`);
      console.log(`  Purchase CRV: $${product.purchase_crv} (${product.purchase_unit_ct} units × CRV)`);
      console.log(`  Unit Cost: $${parseFloat(product.purchase_unit_cost).toFixed(4)} per unit`);
      console.log(`\nTransfer Configuration:`);
      console.log(`  Config: ${product.trans_cfg}`);
      console.log(`  Case Qty: ${product.trans_case_qty} cases`);
      console.log(`  Unit Count: ${product.transfer_unit_ct} units (${product.trans_case_qty} × ${product.case_pack})`);
      console.log(`  Transfer CRV: $${product.trans_crv}`);
      console.log(`  Transfer Unit Cost: $${parseFloat(product.transfer_unit_cost).toFixed(4)} per unit`);
    }
    
    // Summary of implementation
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(pp.product_id) as products_with_purchase_config,
        COUNT(pt.product_id) as products_with_transfer_config,
        AVG(pp.ship_case_qty) as avg_purchase_case_qty,
        AVG(pt.trans_case_qty) as avg_transfer_case_qty
      FROM products p
      LEFT JOIN product_purchases pp ON p.product_id = pp.product_id
      LEFT JOIN product_transfers pt ON p.product_id = pt.product_id
      WHERE p.product_id IS NOT NULL
    `);
    
    console.log('\nUnit conversion implementation summary:');
    const result = summary.rows[0];
    console.log(`Total products: ${result.total_products}`);
    console.log(`Products with purchase config: ${result.products_with_purchase_config}`);
    console.log(`Products with transfer config: ${result.products_with_transfer_config}`);
    console.log(`Average purchase case qty: ${parseFloat(result.avg_purchase_case_qty).toFixed(1)}`);
    console.log(`Average transfer case qty: ${parseFloat(result.avg_transfer_case_qty).toFixed(1)}`);
    
  } catch (error) {
    console.error('Error implementing unit conversions:', error);
  } finally {
    await pool.end();
  }
}

implementUnitConversions();