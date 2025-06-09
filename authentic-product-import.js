/**
 * Authentic Product Import from CostLessWarehouse CSV
 * Imports all product data exactly as structured in legacy system
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

async function importAuthenticProducts() {
  try {
    console.log('Starting authentic product import from CSV...');
    
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    console.log(`Processing ${lines.length - 1} product records`);
    
    // Temporarily disable foreign key constraints
    await pool.query('SET session_replication_role = replica;');
    
    // Clear existing data
    await pool.query('DELETE FROM product_prices WHERE product_id > 0');
    await pool.query('DELETE FROM product_transfers WHERE product_id > 0'); 
    await pool.query('DELETE FROM product_purchases WHERE product_id > 0');
    await pool.query('DELETE FROM products WHERE product_id > 0');
    
    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 32) {
        console.log(`Skipping incomplete line ${i}: ${values.length} fields`);
        continue;
      }
      
      // Parse CSV fields exactly as in legacy system
      const productId = safeInt(values[0]);
      const vendorId = safeInt(values[1]);
      const vendorAP = safeString(values[2]);
      const upc = safeString(values[3]);
      const productDescription = safeString(values[4]);
      const casePack = safeInt(values[5]);
      const size = safeString(values[6]);
      const dept = safeInt(values[7]);
      const category = safeInt(values[8]);
      
      // Purchase (Ship) configuration
      const shipPk = safeInt(values[9]);
      const shipCfg = safeString(values[10]) || 'Case';
      const shipUnitCt = safeInt(values[11]);
      const shipConfigWt = safeFloat(values[12]);
      const shipCaseQty = safeInt(values[13]);
      const whseCaseCost = safeFloat(values[14]);
      const offInvoice = safeFloat(values[15]);
      const billBack = safeFloat(values[16]);
      const purchaseCrv = safeFloat(values[17]);
      
      // Transfer configuration
      const transPk = safeInt(values[18]);
      const transCfg = safeString(values[19]) || 'Case';
      const transUnitCt = safeInt(values[20]);
      const transConfigWt = safeFloat(values[21]);
      const transCaseCost = safeFloat(values[22]);
      const transCrv = safeFloat(values[23]);
      
      // Pricing
      const retailMult = safeFloat(values[24]);
      const retailUnit = safeFloat(values[25]);
      const redTagRetail = safeFloat(values[26]);
      const wallOfValue = safeString(values[27]);
      const notes = safeString(values[28]);
      const expectedDate = safeString(values[29]);
      const transCaseQty = safeInt(values[30]);
      const isActive = safeInt(values[31]);
      const disco = safeInt(values[32]);
      
      if (!productId) {
        console.log(`Skipping line ${i}: No product ID`);
        continue;
      }
      
      try {
        // Insert product
        await pool.query(`
          INSERT INTO products (
            product_id, vendor_id, name, product_description, case_upc, 
            case_pack, size, department_id, category_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (product_id) DO UPDATE SET
            vendor_id = EXCLUDED.vendor_id,
            name = EXCLUDED.name,
            product_description = EXCLUDED.product_description,
            case_upc = EXCLUDED.case_upc,
            case_pack = EXCLUDED.case_pack,
            size = EXCLUDED.size,
            department_id = EXCLUDED.department_id,
            category_id = EXCLUDED.category_id,
            status = EXCLUDED.status
        `, [
          productId, vendorId, productDescription, productDescription, upc,
          casePack, size, dept, category, isActive ? 'Active' : 'Inactive'
        ]);
        
        // Insert purchase configuration
        await pool.query(`
          INSERT INTO product_purchases (
            product_id, purchase_case_qty, purchase_unit_ct, purchase_weight,
            purchase_cost, off_invoice, bill_back, purchase_crv, purchase_cfg
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (product_id) DO UPDATE SET
            purchase_case_qty = EXCLUDED.purchase_case_qty,
            purchase_unit_ct = EXCLUDED.purchase_unit_ct,
            purchase_weight = EXCLUDED.purchase_weight,
            purchase_cost = EXCLUDED.purchase_cost,
            off_invoice = EXCLUDED.off_invoice,
            bill_back = EXCLUDED.bill_back,
            purchase_crv = EXCLUDED.purchase_crv,
            purchase_cfg = EXCLUDED.purchase_cfg
        `, [
          productId, shipCaseQty, shipUnitCt, shipConfigWt,
          whseCaseCost, offInvoice, billBack, purchaseCrv, shipCfg
        ]);
        
        // Insert transfer configuration
        await pool.query(`
          INSERT INTO product_transfers (
            product_id, transfer_case_qty, transfer_unit_ct, transfer_weight,
            transfer_crv, transfer_cfg
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (product_id) DO UPDATE SET
            transfer_case_qty = EXCLUDED.transfer_case_qty,
            transfer_unit_ct = EXCLUDED.transfer_unit_ct,
            transfer_weight = EXCLUDED.transfer_weight,
            transfer_crv = EXCLUDED.transfer_crv,
            transfer_cfg = EXCLUDED.transfer_cfg
        `, [
          productId, transCaseQty, transUnitCt, transConfigWt,
          transCrv, transCfg
        ]);
        
        // Calculate net cost (purchase cost - off invoice - bill back)
        const netCost = (whseCaseCost || 0) - (offInvoice || 0) - (billBack || 0);
        
        // Insert pricing
        await pool.query(`
          INSERT INTO product_prices (
            product_id, retail_price, transfer_cost, purchase_cost,
            off_invoice, bill_back, net_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (product_id) DO UPDATE SET
            retail_price = EXCLUDED.retail_price,
            transfer_cost = EXCLUDED.transfer_cost,
            purchase_cost = EXCLUDED.purchase_cost,
            off_invoice = EXCLUDED.off_invoice,
            bill_back = EXCLUDED.bill_back,
            net_cost = EXCLUDED.net_cost
        `, [
          productId, retailUnit, transCaseCost, whseCaseCost,
          offInvoice, billBack, netCost
        ]);
        
        importedCount++;
        
        if (importedCount % 100 === 0) {
          console.log(`Imported ${importedCount} products...`);
        }
        
      } catch (error) {
        console.error(`Error importing product ${productId}:`, error.message);
      }
    }
    
    // Re-enable foreign key constraints
    await pool.query('SET session_replication_role = DEFAULT;');
    
    console.log(`Successfully imported ${importedCount} products`);
    
    // Verify key products
    console.log('\nVerifying sample products:');
    const sampleProducts = [1, 54, 80];
    
    for (const pid of sampleProducts) {
      const result = await pool.query(`
        SELECT p.product_id, p.name, p.case_pack,
               pu.purchase_case_qty, pu.purchase_unit_ct, pu.purchase_cost, pu.off_invoice, pu.bill_back,
               pt.transfer_case_qty, pt.transfer_unit_ct,
               pr.retail_price, pr.transfer_cost, pr.net_cost
        FROM products p
        LEFT JOIN product_purchases pu ON p.product_id = pu.product_id
        LEFT JOIN product_transfers pt ON p.product_id = pt.product_id  
        LEFT JOIN product_prices pr ON p.product_id = pr.product_id
        WHERE p.product_id = $1
      `, [pid]);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log(`\nProduct ${pid}: ${row.name}`);
        console.log(`  Case Pack: ${row.case_pack} units`);
        console.log(`  Purchase: ${row.purchase_case_qty} cases × ${row.case_pack} = ${row.purchase_unit_ct} units`);
        console.log(`  Purchase Cost: $${row.purchase_cost} - $${row.off_invoice || 0} off invoice = $${row.net_cost}`);
        console.log(`  Transfer: ${row.transfer_case_qty} units`);
        console.log(`  Transfer Cost: $${row.transfer_cost}`);
        console.log(`  Retail: $${row.retail_price}`);
        
        if (row.transfer_cost && row.transfer_case_qty) {
          const unitCost = row.transfer_cost / row.transfer_case_qty;
          const gmPercent = ((row.retail_price - unitCost) / row.retail_price * 100).toFixed(1);
          console.log(`  Unit Cost: $${unitCost.toFixed(2)} | GM: ${gmPercent}%`);
        }
      }
    }
    
  } catch (error) {
    console.error('Import error:', error);
  } finally {
    await pool.end();
  }
}

importAuthenticProducts();