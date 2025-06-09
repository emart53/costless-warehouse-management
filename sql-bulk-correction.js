/**
 * SQL Bulk Correction - Update all products using efficient SQL operations
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

async function sqlBulkCorrection() {
  try {
    console.log('Starting SQL bulk correction...');
    
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    console.log(`Processing ${lines.length - 1} CSV records`);
    
    // Prepare bulk update data
    const productUpdates = [];
    const purchaseInserts = [];
    const transferInserts = [];
    const priceInserts = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 32) continue;
      
      const productId = safeValue(values[0], 'int');
      if (!productId) continue;
      
      // Prepare product update
      productUpdates.push({
        productId,
        vendorId: safeValue(values[1], 'int'),
        name: safeValue(values[4]),
        casePack: safeValue(values[5], 'int'),
        size: safeValue(values[6]),
        deptId: safeValue(values[7], 'int'),
        categoryId: safeValue(values[8], 'int'),
        status: safeValue(values[31], 'int') ? 'Active' : 'Inactive'
      });
      
      // Prepare purchase insert
      purchaseInserts.push({
        productId,
        purchaseCaseQty: safeValue(values[13], 'int'),
        purchaseUnitCt: safeValue(values[11], 'int'),
        purchaseWeight: safeValue(values[12], 'float'),
        purchaseCost: safeValue(values[14], 'float'),
        offInvoice: safeValue(values[15], 'float'),
        billBack: safeValue(values[16], 'float'),
        purchaseCrv: safeValue(values[17], 'float')
      });
      
      // Prepare transfer insert
      transferInserts.push({
        productId,
        transferCaseQty: safeValue(values[30], 'int'),
        transferUnitCt: safeValue(values[20], 'int'),
        transferWeight: safeValue(values[21], 'float'),
        transferCrv: safeValue(values[23], 'float')
      });
      
      // Prepare price insert
      const transferCost = safeValue(values[22], 'float');
      const transferUnits = safeValue(values[20], 'int');
      const unitCost = (transferCost && transferUnits) ? transferCost / transferUnits : null;
      
      priceInserts.push({
        productId,
        retailPrice: safeValue(values[25], 'float'),
        transferCost,
        purchaseCost: safeValue(values[14], 'float'),
        offInvoice: safeValue(values[15], 'float'),
        billBack: safeValue(values[16], 'float'),
        unitCost
      });
    }
    
    console.log(`Prepared ${productUpdates.length} product updates`);
    
    // Execute bulk operations
    console.log('Executing bulk product updates...');
    for (const update of productUpdates) {
      await pool.query(`
        UPDATE products 
        SET name = $2, product_description = $2, case_pack = $3, size = $4,
            department_id = $5, category_id = $6, vendor_id = $7, status = $8
        WHERE product_id = $1
      `, [
        update.productId, update.name, update.casePack, update.size,
        update.deptId, update.categoryId, update.vendorId, update.status
      ]);
    }
    
    console.log('Clearing existing purchase data...');
    await pool.query('DELETE FROM product_purchases');
    
    console.log('Bulk inserting purchase data...');
    for (const purchase of purchaseInserts) {
      await pool.query(`
        INSERT INTO product_purchases (
          product_id, purchase_case_qty, purchase_unit_ct, purchase_weight,
          purchase_cost, off_invoice, bill_back, purchase_crv, ship_cfg
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Case')
      `, [
        purchase.productId, purchase.purchaseCaseQty, purchase.purchaseUnitCt,
        purchase.purchaseWeight, purchase.purchaseCost, purchase.offInvoice,
        purchase.billBack, purchase.purchaseCrv
      ]);
    }
    
    console.log('Clearing existing transfer data...');
    await pool.query('DELETE FROM product_transfers');
    
    console.log('Bulk inserting transfer data...');
    for (const transfer of transferInserts) {
      await pool.query(`
        INSERT INTO product_transfers (
          product_id, transfer_case_qty, transfer_unit_ct, transfer_weight,
          transfer_crv, trans_cfg
        ) VALUES ($1, $2, $3, $4, $5, 'Case')
      `, [
        transfer.productId, transfer.transferCaseQty, transfer.transferUnitCt,
        transfer.transferWeight, transfer.transferCrv
      ]);
    }
    
    console.log('Clearing existing price data...');
    await pool.query('DELETE FROM product_prices');
    
    console.log('Bulk inserting price data...');
    for (const price of priceInserts) {
      await pool.query(`
        INSERT INTO product_prices (
          product_id, retail_price, transfer_cost, purchase_cost,
          off_invoice, bill_back, unit_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        price.productId, price.retailPrice, price.transferCost,
        price.purchaseCost, price.offInvoice, price.billBack, price.unitCost
      ]);
    }
    
    console.log('\nBulk correction completed successfully!');
    
    // Verify results
    console.log('\nVerifying sample products:');
    const sampleIds = [1, 2, 3, 54, 80];
    
    for (const pid of sampleIds) {
      const result = await pool.query(`
        SELECT p.product_id, p.name, p.case_pack,
               pu.purchase_case_qty, pu.purchase_unit_ct, pu.purchase_cost, pu.off_invoice,
               pt.transfer_case_qty, pt.transfer_unit_ct,
               pr.retail_price, pr.transfer_cost, pr.unit_cost
        FROM products p
        LEFT JOIN product_purchases pu ON p.product_id = pu.product_id
        LEFT JOIN product_transfers pt ON p.product_id = pt.product_id
        LEFT JOIN product_prices pr ON p.product_id = pr.product_id
        WHERE p.product_id = $1
      `, [pid]);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const unitCost = row.unit_cost || 0;
        const retailPrice = row.retail_price || 0;
        const gmPercent = retailPrice > 0 ? ((retailPrice - unitCost) / retailPrice * 100) : 0;
        
        console.log(`Product ${pid}: ${row.name}`);
        console.log(`  Purchase: ${row.purchase_case_qty} cases × ${row.case_pack} = ${row.purchase_unit_ct} units`);
        console.log(`  Transfer: ${row.transfer_case_qty} units at $${row.transfer_cost || 0}`);
        console.log(`  Unit Cost: $${unitCost.toFixed(4)} | Retail: $${retailPrice} | GM: ${gmPercent.toFixed(1)}%\n`);
      }
    }
    
  } catch (error) {
    console.error('SQL bulk correction error:', error);
  } finally {
    await pool.end();
  }
}

sqlBulkCorrection();