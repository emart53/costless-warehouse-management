/**
 * Batch Correct All Products with Authentic CSV Data
 * Systematically updates all products to match CSV exactly
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

function safeInt(value) {
  if (!value || value === 'NULL' || value === '') return null;
  const num = parseInt(value);
  return isNaN(num) ? null : num;
}

function safeFloat(value) {
  if (!value || value === 'NULL' || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function safeString(value) {
  if (!value || value === 'NULL') return null;
  return value.trim();
}

async function batchCorrectAllProducts() {
  try {
    console.log('Starting batch correction of all products...');
    
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    console.log(`Processing ${lines.length - 1} CSV records in batches`);
    
    let correctedCount = 0;
    let createdPurchaseRecords = 0;
    let createdTransferRecords = 0;
    let createdPriceRecords = 0;
    
    const batchSize = 100;
    const totalBatches = Math.ceil((lines.length - 1) / batchSize);
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const startIndex = batchNum * batchSize + 1;
      const endIndex = Math.min(startIndex + batchSize, lines.length);
      
      console.log(`Processing batch ${batchNum + 1}/${totalBatches} (records ${startIndex}-${endIndex - 1})`);
      
        for (let i = startIndex; i < endIndex; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length < 32) continue;
      
      // Parse CSV fields exactly as in legacy system
      const productId = safeInt(values[0]);
      const vendorId = safeInt(values[1]);
      const productDescription = safeString(values[4]);
      const casePack = safeInt(values[5]);
      const size = safeString(values[6]);
      const dept = safeInt(values[7]);
      const category = safeInt(values[8]);
      
      // Purchase (Ship) configuration - CORRECT interpretation
      const shipCaseQty = safeInt(values[13]); // Number of cases purchased
      const shipUnitCt = safeInt(values[11]);  // Total units (should equal casePack × shipCaseQty)
      const shipConfigWt = safeFloat(values[12]);
      const whseCaseCost = safeFloat(values[14]);
      const offInvoice = safeFloat(values[15]);
      const billBack = safeFloat(values[16]);
      const purchaseCrv = safeFloat(values[17]);
      
      // Transfer configuration
      const transCaseQty = safeInt(values[30]);
      const transUnitCt = safeInt(values[20]);
      const transConfigWt = safeFloat(values[21]);
      const transCaseCost = safeFloat(values[22]);
      const transCrv = safeFloat(values[23]);
      
      // Pricing
      const retailUnit = safeFloat(values[25]);
      const isActive = safeInt(values[31]);
      
      if (!productId) continue;
      
      try {
        // Update main product record
        await pool.query(`
          UPDATE products 
          SET name = $2,
              product_description = $3,
              case_pack = $4,
              size = $5,
              department_id = $6,
              category_id = $7,
              vendor_id = $8,
              status = $9
          WHERE product_id = $1
        `, [
          productId, productDescription, productDescription, casePack, size,
          dept, category, vendorId, isActive ? 'Active' : 'Inactive'
        ]);
        
        // Upsert purchase configuration
        await pool.query(`
          INSERT INTO product_purchases (
            product_id, purchase_case_qty, purchase_unit_ct, purchase_weight,
            purchase_cost, off_invoice, bill_back, purchase_crv, ship_cfg
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (product_id) DO UPDATE SET
            purchase_case_qty = EXCLUDED.purchase_case_qty,
            purchase_unit_ct = EXCLUDED.purchase_unit_ct,
            purchase_weight = EXCLUDED.purchase_weight,
            purchase_cost = EXCLUDED.purchase_cost,
            off_invoice = EXCLUDED.off_invoice,
            bill_back = EXCLUDED.bill_back,
            purchase_crv = EXCLUDED.purchase_crv,
            ship_cfg = EXCLUDED.ship_cfg
        `, [
          productId, shipCaseQty, shipUnitCt, shipConfigWt,
          whseCaseCost, offInvoice, billBack, purchaseCrv, 'Case'
        ]);
        
        // Check if purchase record was created
        const purchaseExists = await pool.query('SELECT 1 FROM product_purchases WHERE product_id = $1', [productId]);
        if (purchaseExists.rows.length === 0) createdPurchaseRecords++;
        
        // Upsert transfer configuration
        await pool.query(`
          INSERT INTO product_transfers (
            product_id, transfer_case_qty, transfer_unit_ct, transfer_weight,
            transfer_crv, trans_cfg
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (product_id) DO UPDATE SET
            transfer_case_qty = EXCLUDED.transfer_case_qty,
            transfer_unit_ct = EXCLUDED.transfer_unit_ct,
            transfer_weight = EXCLUDED.transfer_weight,
            transfer_crv = EXCLUDED.transfer_crv,
            trans_cfg = EXCLUDED.trans_cfg
        `, [
          productId, transCaseQty, transUnitCt, transConfigWt,
          transCrv, 'Case'
        ]);
        
        // Check if transfer record was created
        const transferExists = await pool.query('SELECT 1 FROM product_transfers WHERE product_id = $1', [productId]);
        if (transferExists.rows.length === 0) createdTransferRecords++;
        
        // Calculate unit cost
        const unitCost = (transCaseCost && transUnitCt) ? transCaseCost / transUnitCt : null;
        
        // Upsert pricing
        await pool.query(`
          INSERT INTO product_prices (
            product_id, retail_price, transfer_cost, purchase_cost,
            off_invoice, bill_back, unit_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (product_id) DO UPDATE SET
            retail_price = EXCLUDED.retail_price,
            transfer_cost = EXCLUDED.transfer_cost,
            purchase_cost = EXCLUDED.purchase_cost,
            off_invoice = EXCLUDED.off_invoice,
            bill_back = EXCLUDED.bill_back,
            unit_cost = EXCLUDED.unit_cost
        `, [
          productId, retailUnit, transCaseCost, whseCaseCost,
          offInvoice, billBack, unitCost
        ]);
        
        // Check if price record was created
        const priceExists = await pool.query('SELECT 1 FROM product_prices WHERE product_id = $1', [productId]);
        if (priceExists.rows.length === 0) createdPriceRecords++;
        
        correctedCount++;
        
        if (correctedCount % 250 === 0) {
          console.log(`Corrected ${correctedCount} products...`);
        }
        
      } catch (error) {
        console.error(`Error correcting product ${productId}:`, error.message);
      }
    }
    
    console.log(`\nBatch correction completed:`);
    console.log(`✓ ${correctedCount} products corrected`);
    console.log(`✓ ${createdPurchaseRecords} purchase records created`);
    console.log(`✓ ${createdTransferRecords} transfer records created`);
    console.log(`✓ ${createdPriceRecords} price records created`);
    
    // Verify key products after correction
    console.log('\nVerifying corrected products:');
    const sampleProducts = [1, 54, 80, 100, 200];
    
    for (const pid of sampleProducts) {
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
        console.log(`  Transfer: ${row.transfer_case_qty} units at $${row.transfer_cost}`);
        console.log(`  Unit Cost: $${unitCost.toFixed(4)} | Retail: $${retailPrice} | GM: ${gmPercent.toFixed(1)}%`);
      }
    }
    
  } catch (error) {
    console.error('Batch correction error:', error);
  } finally {
    await pool.end();
  }
}

batchCorrectAllProducts();