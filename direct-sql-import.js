/**
 * Direct SQL Import - Use PostgreSQL COPY for efficient bulk operations
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

function formatValue(value, type = 'string') {
  if (!value || value === 'NULL' || value === '') return '\\N';
  
  if (type === 'int') {
    const num = parseInt(value);
    return isNaN(num) ? '\\N' : num.toString();
  }
  
  if (type === 'float') {
    const num = parseFloat(value);
    return isNaN(num) ? '\\N' : num.toString();
  }
  
  return value.trim().replace(/\t/g, ' ').replace(/\n/g, ' ');
}

async function directSqlImport() {
  try {
    console.log('Starting direct SQL import...');
    
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    console.log(`Processing ${lines.length - 1} CSV records`);
    
    // Create TSV files for PostgreSQL COPY
    const productTsv = [];
    const purchaseTsv = [];
    const transferTsv = [];
    const priceTsv = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 32) continue;
      
      const productId = formatValue(values[0], 'int');
      if (productId === '\\N') continue;
      
      // Product data
      productTsv.push([
        productId,
        formatValue(values[4]), // name
        formatValue(values[4]), // product_description
        formatValue(values[5], 'int'), // case_pack
        formatValue(values[6]), // size
        formatValue(values[7], 'int'), // department_id
        formatValue(values[8], 'int'), // category_id
        formatValue(values[1], 'int'), // vendor_id
        formatValue(values[31], 'int') === '1' ? 'Active' : 'Inactive' // status
      ].join('\t'));
      
      // Purchase data
      purchaseTsv.push([
        productId,
        formatValue(values[13], 'int'), // purchase_case_qty
        formatValue(values[11], 'int'), // purchase_unit_ct
        formatValue(values[12], 'float'), // purchase_weight
        formatValue(values[14], 'float'), // purchase_cost
        formatValue(values[15], 'float'), // off_invoice
        formatValue(values[16], 'float'), // bill_back
        formatValue(values[17], 'float'), // purchase_crv
        'Case' // ship_cfg
      ].join('\t'));
      
      // Transfer data
      transferTsv.push([
        productId,
        formatValue(values[30], 'int'), // transfer_case_qty
        formatValue(values[20], 'int'), // transfer_unit_ct
        formatValue(values[21], 'float'), // transfer_weight
        formatValue(values[23], 'float'), // transfer_crv
        'Case' // trans_cfg
      ].join('\t'));
      
      // Price data with calculated unit cost
      const transferCost = values[22] && values[22] !== 'NULL' ? parseFloat(values[22]) : null;
      const transferUnits = values[20] && values[20] !== 'NULL' ? parseInt(values[20]) : null;
      const unitCost = (transferCost && transferUnits) ? (transferCost / transferUnits).toString() : '\\N';
      
      priceTsv.push([
        productId,
        formatValue(values[25], 'float'), // retail_price
        formatValue(values[22], 'float'), // transfer_cost
        formatValue(values[14], 'float'), // purchase_cost
        formatValue(values[15], 'float'), // off_invoice
        formatValue(values[16], 'float'), // bill_back
        unitCost // unit_cost
      ].join('\t'));
    }
    
    // Write temporary TSV files
    fs.writeFileSync('/tmp/products_update.tsv', productTsv.join('\n'));
    fs.writeFileSync('/tmp/purchases.tsv', purchaseTsv.join('\n'));
    fs.writeFileSync('/tmp/transfers.tsv', transferTsv.join('\n'));
    fs.writeFileSync('/tmp/prices.tsv', priceTsv.join('\n'));
    
    console.log(`Generated TSV files with ${productTsv.length} records each`);
    
    // Execute bulk operations using COPY
    console.log('Updating products...');
    await pool.query(`
      CREATE TEMP TABLE temp_products (
        product_id INT,
        name TEXT,
        product_description TEXT,
        case_pack INT,
        size TEXT,
        department_id INT,
        category_id INT,
        vendor_id INT,
        status TEXT
      )
    `);
    
    await pool.query(`COPY temp_products FROM '/tmp/products_update.tsv'`);
    
    await pool.query(`
      UPDATE products SET
        name = tp.name,
        product_description = tp.product_description,
        case_pack = tp.case_pack,
        size = tp.size,
        department_id = tp.department_id,
        category_id = tp.category_id,
        vendor_id = tp.vendor_id,
        status = tp.status
      FROM temp_products tp
      WHERE products.product_id = tp.product_id
    `);
    
    console.log('Clearing and inserting purchase data...');
    await pool.query('DELETE FROM product_purchases');
    await pool.query(`
      COPY product_purchases (
        product_id, purchase_case_qty, purchase_unit_ct, purchase_weight,
        purchase_cost, off_invoice, bill_back, purchase_crv, ship_cfg
      ) FROM '/tmp/purchases.tsv'
    `);
    
    console.log('Clearing and inserting transfer data...');
    await pool.query('DELETE FROM product_transfers');
    await pool.query(`
      COPY product_transfers (
        product_id, transfer_case_qty, transfer_unit_ct, transfer_weight,
        transfer_crv, trans_cfg
      ) FROM '/tmp/transfers.tsv'
    `);
    
    console.log('Clearing and inserting price data...');
    await pool.query('DELETE FROM product_prices');
    await pool.query(`
      COPY product_prices (
        product_id, retail_price, transfer_cost, purchase_cost,
        off_invoice, bill_back, unit_cost
      ) FROM '/tmp/prices.tsv'
    `);
    
    console.log('\nDirect SQL import completed successfully!');
    
    // Clean up temporary files
    fs.unlinkSync('/tmp/products_update.tsv');
    fs.unlinkSync('/tmp/purchases.tsv');
    fs.unlinkSync('/tmp/transfers.tsv');
    fs.unlinkSync('/tmp/prices.tsv');
    
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
    console.error('Direct SQL import error:', error);
  } finally {
    await pool.end();
  }
}

directSqlImport();