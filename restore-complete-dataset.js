import fs from 'fs';
import { parse } from 'csv-parse';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to parse CSV with proper field handling
function parseCSVFile(filename) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filename)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        cast: (value, context) => {
          if (value === '' || value === 'NULL') return null;
          return value;
        }
      }))
      .on('data', (record) => records.push(record))
      .on('end', () => resolve(records))
      .on('error', (err) => reject(err));
  });
}

// Load products using correct schema
async function loadProducts(client) {
  console.log('Loading products with correct schema...');
  const records = await parseCSVFile('attached_assets/products.csv');
  
  let loadedCount = 0;
  for (const record of records) {
    try {
      await client.query(`
        INSERT INTO products (
          product_id, product_name, product_description, case_pack, size, 
          department_id, category_id, vendor_id, purchase_cost, off_invoice,
          crv, purchase_weight, bill_back, status, discontinued_date,
          updated_at, configuration_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (product_id) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          product_description = EXCLUDED.product_description,
          case_pack = EXCLUDED.case_pack,
          size = EXCLUDED.size,
          department_id = EXCLUDED.department_id,
          category_id = EXCLUDED.category_id,
          vendor_id = EXCLUDED.vendor_id,
          purchase_cost = EXCLUDED.purchase_cost,
          off_invoice = EXCLUDED.off_invoice,
          crv = EXCLUDED.crv,
          purchase_weight = EXCLUDED.purchase_weight,
          bill_back = EXCLUDED.bill_back,
          status = EXCLUDED.status,
          discontinued_date = EXCLUDED.discontinued_date,
          updated_at = EXCLUDED.updated_at,
          configuration_id = EXCLUDED.configuration_id
      `, [
        parseInt(record.product_id),
        record.product_name,
        record.product_description,
        parseInt(record.case_pack) || null,
        record.size,
        parseInt(record.department_id) || null,
        parseInt(record.category_id) || null,
        parseInt(record.vendor_id) || null,
        parseFloat(record.cost_unit) || parseFloat(record.purchase_cost) || null,
        parseFloat(record.off_invoice) || null,
        parseFloat(record.crv) || null,
        parseFloat(record.purchase_weight) || null,
        parseFloat(record.bill_back) || null,
        record.status || 'Active',
        record.discontinued_date,
        new Date(),
        parseInt(record.configuration_id) || null
      ]);
      loadedCount++;
      
      if (loadedCount % 500 === 0) {
        console.log(`Loaded ${loadedCount} products...`);
      }
    } catch (err) {
      console.error(`Error loading product ${record.product_id}:`, err.message);
    }
  }
  
  console.log(`Successfully loaded ${loadedCount} products`);
}

// Load vendors using correct schema
async function loadVendors(client) {
  console.log('Loading vendors with correct schema...');
  const records = await parseCSVFile('attached_assets/vendors.csv');
  
  let loadedCount = 0;
  for (const record of records) {
    try {
      await client.query(`
        INSERT INTO vendors (
          id, code, name, contact_name, email, phone, address, city, state, 
          zip_code, payment_terms, is_active, created_at, discount_percent, 
          ep_days, net_days, lead_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          contact_name = EXCLUDED.contact_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          zip_code = EXCLUDED.zip_code,
          payment_terms = EXCLUDED.payment_terms,
          is_active = EXCLUDED.is_active,
          discount_percent = EXCLUDED.discount_percent,
          ep_days = EXCLUDED.ep_days,
          net_days = EXCLUDED.net_days,
          lead_time = EXCLUDED.lead_time
      `, [
        parseInt(record.vendor_id),
        record.vendor_ap || `VEN${record.vendor_id}`,
        record.vendor_name,
        record.contact_person,
        record.email,
        record.phone,
        record.address,
        record.city,
        record.state,
        record.zip,
        record.payment_terms,
        record.is_active === '1',
        new Date(),
        Math.min(parseFloat(record.discount) || 0, 1), // Cap at 100%
        parseInt(record.ep_days) || 0,
        parseInt(record.net_days) || 30,
        parseInt(record.lead_time) || 0
      ]);
      loadedCount++;
      
      if (loadedCount % 50 === 0) {
        console.log(`Loaded ${loadedCount} vendors...`);
      }
    } catch (err) {
      console.error(`Error loading vendor ${record.vendor_id}:`, err.message);
    }
  }
  
  console.log(`Successfully loaded ${loadedCount} vendors`);
}

// Load product prices
async function loadProductPrices(client) {
  console.log('Loading product prices...');
  const records = await parseCSVFile('attached_assets/product_prices.csv');
  
  let loadedCount = 0;
  for (const record of records) {
    try {
      await client.query(`
        INSERT INTO product_prices (
          product_price_id, purchase_cost, off_invoice, bill_back, 
          effective_date, transfer_cost, unit_cost, price_multiple, 
          retail_price, start_date, end_date, notes, created_at, updated_at, product_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (product_price_id) DO UPDATE SET
          purchase_cost = EXCLUDED.purchase_cost,
          off_invoice = EXCLUDED.off_invoice,
          bill_back = EXCLUDED.bill_back,
          effective_date = EXCLUDED.effective_date,
          transfer_cost = EXCLUDED.transfer_cost,
          unit_cost = EXCLUDED.unit_cost,
          price_multiple = EXCLUDED.price_multiple,
          retail_price = EXCLUDED.retail_price,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          notes = EXCLUDED.notes,
          updated_at = EXCLUDED.updated_at,
          product_id = EXCLUDED.product_id
      `, [
        parseInt(record.product_price_id),
        parseFloat(record.purchase_cost) || 0,
        parseFloat(record.off_invoice) || 0,
        parseFloat(record.bill_back) || 0,
        record.effective_date || '2025-04-24',
        parseFloat(record.transfer_cost) || 0,
        parseFloat(record.unit_cost) || 0,
        parseInt(record.price_multiple) || 1,
        parseFloat(record.retail_price) || 0,
        record.start_date || '2025-04-24',
        record.end_date === 'NULL' ? null : record.end_date,
        record.notes,
        new Date(),
        new Date(),
        parseInt(record.product_id)
      ]);
      loadedCount++;
      
      if (loadedCount % 500 === 0) {
        console.log(`Loaded ${loadedCount} pricing records...`);
      }
    } catch (err) {
      // Skip pricing records for products that don't exist
      if (!err.message.includes('foreign key constraint')) {
        console.error(`Error loading pricing record ${record.product_price_id}:`, err.message);
      }
    }
  }
  
  console.log(`Successfully loaded ${loadedCount} pricing records`);
}

// Restore transfer order items
async function restoreTransferItems(client) {
  console.log('Restoring transfer order items...');
  const records = await parseCSVFile('attached_assets/transfer_items_1749144612951.csv');
  
  // First, ensure transfer order exists
  await client.query(`
    INSERT INTO transfer_orders (id, transfer_number, store_id, status, order_date, created_at)
    VALUES (2, 'TR48563', 3, 'Pending', '2025-05-26', NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  
  let loadedCount = 0;
  for (const record of records) {
    try {
      await client.query(`
        INSERT INTO transfer_order_items (
          transfer_id, product_id, quantity_ordered, unit_cost, 
          transfer_weight, transfer_case_qty, csv_product_transfer_id, 
          crv_per_unit, total_crv, transfer_cfg
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (transfer_id, product_id) DO UPDATE SET
          quantity_ordered = EXCLUDED.quantity_ordered,
          unit_cost = EXCLUDED.unit_cost,
          transfer_weight = EXCLUDED.transfer_weight,
          transfer_case_qty = EXCLUDED.transfer_case_qty,
          csv_product_transfer_id = EXCLUDED.csv_product_transfer_id,
          crv_per_unit = EXCLUDED.crv_per_unit,
          total_crv = EXCLUDED.total_crv,
          transfer_cfg = EXCLUDED.transfer_cfg
      `, [
        2, // transfer_id
        parseInt(record.product_id),
        parseInt(record.quantity) || 1,
        parseFloat(record.transfer_cost) || 0,
        parseFloat(record.transfer_weight) || 0,
        parseInt(record.transfer_case_qty) || 0,
        parseInt(record.transfer_item_id),
        parseFloat(record.transfer_crv) || 0,
        parseFloat(record.transfer_crv) || 0,
        record.transfer_cfg
      ]);
      loadedCount++;
    } catch (err) {
      console.error(`Error loading transfer item ${record.transfer_item_id}:`, err.message);
    }
  }
  
  console.log(`Successfully restored ${loadedCount} transfer order items`);
}

async function restoreCompleteDataset() {
  console.log('Starting complete dataset restoration...');
  
  try {
    const client = await pool.connect();
    
    // Load in dependency order - don't truncate existing data
    await loadVendors(client);
    await loadProducts(client);
    await loadProductPrices(client);
    await restoreTransferItems(client);
    
    client.release();
    
    // Final verification
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM vendors) as vendors,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM product_prices) as product_prices,
        (SELECT COUNT(*) FROM transfer_order_items WHERE transfer_id = 2) as transfer_items
    `);
    
    console.log('\n=== RESTORATION RESULTS ===');
    console.log(`Vendors: ${counts.rows[0].vendors}`);
    console.log(`Products: ${counts.rows[0].products}`);
    console.log(`Product Prices: ${counts.rows[0].product_prices}`);
    console.log(`Transfer Order Items: ${counts.rows[0].transfer_items}`);
    
    // Check transfer order pricing coverage
    const pricingCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(pp.retail_price) as items_with_pricing
      FROM transfer_order_items toi
      LEFT JOIN products p ON toi.product_id = p.id  
      LEFT JOIN product_prices pp ON p.product_id = pp.product_id
      WHERE toi.transfer_id = 2
    `);
    
    console.log(`Transfer items with pricing: ${pricingCheck.rows[0].items_with_pricing}/${pricingCheck.rows[0].total_items}`);
    
  } catch (err) {
    console.error('Restoration failed:', err);
    throw err;
  }
}

restoreCompleteDataset()
  .then(() => {
    console.log('Complete dataset restoration finished successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to restore complete dataset:', err);
    process.exit(1);
  });