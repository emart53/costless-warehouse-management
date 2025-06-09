/**
 * Systematic Product Data Completion
 * Process remaining products in efficient batches to achieve 100% data accuracy
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function safeValue(value, type = 'string') {
  if (!value || value === 'NULL' || value === '') return null;
  
  if (type === 'int') {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  }
  
  if (type === 'float') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  
  return value.trim();
}

async function systematicCompletion() {
  try {
    console.log('Starting systematic completion of all product data...');
    
    // Identify products still needing purchase configuration
    const incompleteResult = await pool.query(`
      SELECT p.product_id 
      FROM products p 
      LEFT JOIN product_purchases pu ON p.product_id = pu.product_id
      WHERE pu.product_id IS NULL
      ORDER BY p.product_id
      LIMIT 500
    `);
    
    const incompleteIds = incompleteResult.rows.map(row => row.product_id);
    console.log(`Processing ${incompleteIds.length} products without purchase data`);
    
    if (incompleteIds.length === 0) {
      console.log('All products have purchase configuration data!');
      return;
    }
    
    // Load CSV data for these specific products
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    const csvProductMap = {};
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 32) continue;
      
      const productId = safeValue(values[0], 'int');
      if (!productId || !incompleteIds.includes(productId)) continue;
      
      csvProductMap[productId] = values;
    }
    
    console.log(`Found CSV data for ${Object.keys(csvProductMap).length} products`);
    
    // Process in small batches for efficiency
    let processedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < incompleteIds.length; i += batchSize) {
      const batch = incompleteIds.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} products)`);
      
      for (const productId of batch) {
        const csvValues = csvProductMap[productId];
        if (!csvValues) continue;
        
        try {
          // Extract authentic CSV data
          const productName = safeValue(csvValues[4]);
          const casePack = safeValue(csvValues[5], 'int');
          const size = safeValue(csvValues[6]);
          const deptId = safeValue(csvValues[7], 'int');
          const categoryId = safeValue(csvValues[8], 'int');
          const vendorId = safeValue(csvValues[1], 'int');
          const isActive = safeValue(csvValues[31], 'int');
          
          // Purchase configuration (Ship data)
          const purchaseCaseQty = safeValue(csvValues[13], 'int');
          const purchaseUnitCt = safeValue(csvValues[11], 'int');
          const purchaseWeight = safeValue(csvValues[12], 'float');
          const purchaseCost = safeValue(csvValues[14], 'float');
          const offInvoice = safeValue(csvValues[15], 'float');
          const billBack = safeValue(csvValues[16], 'float');
          const purchaseCrv = safeValue(csvValues[17], 'float');
          
          // Transfer configuration
          const transferCaseQty = safeValue(csvValues[30], 'int');
          const transferUnitCt = safeValue(csvValues[20], 'int');
          const transferWeight = safeValue(csvValues[21], 'float');
          const transferCost = safeValue(csvValues[22], 'float');
          const transferCrv = safeValue(csvValues[23], 'float');
          
          // Pricing
          const retailPrice = safeValue(csvValues[25], 'float');
          
          // Update main product
          await pool.query(`
            UPDATE products 
            SET name = $2,
                product_description = $2,
                case_pack = $3,
                size = $4,
                department_id = $5,
                category_id = $6,
                vendor_id = $7,
                status = $8
            WHERE product_id = $1
          `, [
            productId, productName, casePack, size,
            deptId, categoryId, vendorId,
            isActive ? 'Active' : 'Inactive'
          ]);
          
          // Insert purchase configuration
          await pool.query(`
            INSERT INTO product_purchases (
              product_id, purchase_case_qty, purchase_unit_ct, purchase_weight,
              purchase_cost, off_invoice, bill_back, purchase_crv, ship_cfg
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Case')
          `, [
            productId, purchaseCaseQty, purchaseUnitCt, purchaseWeight,
            purchaseCost, offInvoice, billBack, purchaseCrv
          ]);
          
          // Insert transfer configuration
          await pool.query(`
            INSERT INTO product_transfers (
              product_id, transfer_case_qty, transfer_unit_ct, transfer_weight,
              transfer_crv, trans_cfg
            ) VALUES ($1, $2, $3, $4, $5, 'Case')
          `, [
            productId, transferCaseQty, transferUnitCt, transferWeight, transferCrv
          ]);
          
          // Calculate unit cost and insert pricing
          const unitCost = (transferCost && transferUnitCt) 
            ? transferCost / transferUnitCt 
            : null;
          
          await pool.query(`
            INSERT INTO product_prices (
              product_id, retail_price, transfer_cost, purchase_cost,
              off_invoice, bill_back, unit_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            productId, retailPrice, transferCost, purchaseCost,
            offInvoice, billBack, unitCost
          ]);
          
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing product ${productId}:`, error.message);
        }
      }
      
      console.log(`Completed batch. Processed: ${processedCount}/${incompleteIds.length}`);
    }
    
    console.log(`\nCompleted systematic processing: ${processedCount} products updated`);
    
    // Progress verification
    const progressResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE pu.product_id IS NOT NULL) as with_purchase_data,
        COUNT(*) FILTER (WHERE pt.product_id IS NOT NULL) as with_transfer_data,
        COUNT(*) FILTER (WHERE pr.product_id IS NOT NULL) as with_price_data,
        COUNT(*) as total_products
      FROM products p
      LEFT JOIN product_purchases pu ON p.product_id = pu.product_id
      LEFT JOIN product_transfers pt ON p.product_id = pt.product_id
      LEFT JOIN product_prices pr ON p.product_id = pr.product_id
    `);
    
    const stats = progressResult.rows[0];
    const completionRate = ((stats.with_purchase_data / stats.total_products) * 100).toFixed(1);
    
    console.log('\nCurrent Progress:');
    console.log(`Products with Purchase Data: ${stats.with_purchase_data}/${stats.total_products} (${completionRate}%)`);
    console.log(`Products with Transfer Data: ${stats.with_transfer_data}/${stats.total_products}`);
    console.log(`Products with Price Data: ${stats.with_price_data}/${stats.total_products}`);
    
    // Sample verification
    console.log('\nSample of newly corrected products:');
    const sampleResult = await pool.query(`
      SELECT p.product_id, p.name, p.case_pack,
             pu.purchase_case_qty, pu.purchase_unit_ct, pu.purchase_cost, pu.off_invoice,
             pt.transfer_case_qty, pt.transfer_unit_ct,
             pr.retail_price, pr.transfer_cost, pr.unit_cost
      FROM products p
      JOIN product_purchases pu ON p.product_id = pu.product_id
      JOIN product_transfers pt ON p.product_id = pt.product_id
      JOIN product_prices pr ON p.product_id = pr.product_id
      WHERE p.product_id = ANY($1)
      ORDER BY p.product_id
      LIMIT 3
    `, [incompleteIds.slice(0, 10)]);
    
    sampleResult.rows.forEach(row => {
      const unitCost = row.unit_cost || 0;
      const retailPrice = row.retail_price || 0;
      const gmPercent = retailPrice > 0 ? ((retailPrice - unitCost) / retailPrice * 100) : 0;
      const netCost = (row.purchase_cost || 0) - (row.off_invoice || 0);
      
      console.log(`\nProduct ${row.product_id}: ${row.name}`);
      console.log(`  Case Pack: ${row.case_pack} units per case`);
      console.log(`  Purchase: ${row.purchase_case_qty} cases × ${row.case_pack} = ${row.purchase_unit_ct} units`);
      console.log(`  Cost: $${row.purchase_cost} - $${row.off_invoice} off-invoice = $${netCost.toFixed(2)} net`);
      console.log(`  Transfer: ${row.transfer_case_qty} units at $${row.transfer_cost}`);
      console.log(`  Unit Cost: $${unitCost.toFixed(4)} | Retail: $${retailPrice} | GM: ${gmPercent.toFixed(1)}%`);
    });
    
    if (stats.with_purchase_data < stats.total_products) {
      console.log(`\nContinuing with remaining ${stats.total_products - stats.with_purchase_data} products...`);
    } else {
      console.log('\n=== MIGRATION COMPLETE ===');
      console.log('All products now have complete configuration data from your authentic CostLessWarehouse system!');
    }
    
  } catch (error) {
    console.error('Systematic completion error:', error);
  } finally {
    await pool.end();
  }
}

systematicCompletion();