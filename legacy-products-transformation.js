import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pkg from 'pg';
const { Pool } = pkg;

// Clean column headers to handle BOM and whitespace
function cleanColumnHeader(header) {
  return header.replace(/^\uFEFF/, '').trim();
}

// Legacy to modern field mapping - exact column names from CSV
const FIELD_MAPPING = {
  // Core product fields
  productId: 'ProductId',
  vendorId: 'VendorId',
  upc: 'UPC',
  productDescription: 'Product Description',
  casePack: 'CasePack',
  size: 'Size',
  department: 'Dept',
  category: 'Category',
  notes: 'Notes',
  expectedDate: 'ExpectedDate',
  isActive: 'IsActive',
  discontinued: 'Disco',

  // Purchase data (for purchase orders)
  purchasePack: 'ShipPk',
  purchaseConfig: 'ShipCfg',
  purchaseUnitCount: 'ShipUnitCt',
  purchaseConfigWeight: 'ShipConfigWt',
  purchaseCaseQty: 'ShipCaseQty',
  warehouseCaseCost: 'WhseCase Cost',
  offInvoice: 'OffInvoice',
  billBack: 'BillBack',
  purchaseCRV: 'CRV',

  // Transfer data (for store transfers)
  transferPack: 'TransPk',
  transferConfig: 'TransCfg',
  transferUnitCount: 'TransUnitCt',
  transferConfigWeight: 'TransConfigWt',
  transferCaseCost: 'TransCaseCost',
  transferCRV: 'TransCRV',
  transferCaseQty: 'TransCaseQty',

  // Retail pricing
  retailMultiplier: 'RetailMult',
  retailUnit: 'Retail Unit',
  redTagRetail: 'RedTag Retail',
  wallOfValue: 'Wall Of Value'
};

// Status mapping from legacy boolean + disco to modern granular status
function determineStatus(isActive, disco, expectedDate) {
  // Convert string values to numbers for comparison
  const active = parseInt(isActive) || 0;
  const discontinued = parseInt(disco) || 0;
  
  if (discontinued === 1) {
    return 'Discontinued-Transfers-Only'; // Can still transfer existing inventory
  }
  
  if (active === 0) {
    return 'Inactive'; // Completely inactive
  }
  
  if (expectedDate && expectedDate.trim()) {
    return 'Expected'; // New item with expected delivery date
  }
  
  return 'Active'; // Normal active status
}

// Clean and validate numeric values
function cleanNumeric(value, defaultValue = 0) {
  if (!value || value === 'NULL' || value === '') return defaultValue;
  const cleaned = parseFloat(value);
  return isNaN(cleaned) ? defaultValue : cleaned;
}

// Clean and validate text values
function cleanText(value) {
  if (!value || value === 'NULL' || value === '0') return null;
  return value.trim();
}

// Clean and validate dates
function cleanDate(value) {
  if (!value || value === 'NULL' || value === '') return null;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

async function transformLegacyProducts() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Reading legacy products CSV...');
    let csvData = fs.readFileSync('./attached_assets/products.csv', 'utf8');
    
    // Remove BOM if present
    csvData = csvData.replace(/^\uFEFF/, '');
    
    const records = parse(csvData, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });
    
    // Debug: Show first record and column headers
    console.log('Column headers:', Object.keys(records[0] || {}));
    console.log('First record sample:', records[0]);

    console.log(`Found ${records.length} legacy product records`);

    // Clear existing data
    console.log('Clearing existing product data...');
    await pool.query('TRUNCATE TABLE product_prices CASCADE');
    await pool.query('TRUNCATE TABLE products CASCADE');

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let productCount = 0;
      let priceCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          const productId = parseInt(record[FIELD_MAPPING.productId]);
          if (!productId) {
            console.log(`Skipping record with invalid product ID: ${record[FIELD_MAPPING.productId]}`);
            errorCount++;
            continue;
          }

          // Transform core product data
          const productData = {
            product_id: productId,
            product_name: cleanText(record[FIELD_MAPPING.productDescription]) || `Product ${productId}`,
            product_description: cleanText(record[FIELD_MAPPING.productDescription]),
            case_pack: cleanNumeric(record[FIELD_MAPPING.casePack], 1),
            size: cleanText(record[FIELD_MAPPING.size]),
            department_id: cleanNumeric(record[FIELD_MAPPING.department], 1),
            category_id: cleanNumeric(record[FIELD_MAPPING.category], 1),
            vendor_id: cleanNumeric(record[FIELD_MAPPING.vendorId]),
            status: determineStatus(
              record[FIELD_MAPPING.isActive], 
              record[FIELD_MAPPING.discontinued],
              record[FIELD_MAPPING.expectedDate]
            ),
            discontinued_date: cleanDate(record[FIELD_MAPPING.expectedDate]),
            updated_at: new Date().toISOString()
          };

          // Insert product
          await client.query(`
            INSERT INTO products (
              product_id, product_name, product_description, case_pack, size,
              department_id, category_id, vendor_id, status, discontinued_date, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (product_id) DO UPDATE SET
              product_name = EXCLUDED.product_name,
              product_description = EXCLUDED.product_description,
              case_pack = EXCLUDED.case_pack,
              size = EXCLUDED.size,
              department_id = EXCLUDED.department_id,
              category_id = EXCLUDED.category_id,
              vendor_id = EXCLUDED.vendor_id,
              status = EXCLUDED.status,
              discontinued_date = EXCLUDED.discontinued_date,
              updated_at = EXCLUDED.updated_at
          `, [
            productData.product_id,
            productData.product_name,
            productData.product_description,
            productData.case_pack,
            productData.size,
            productData.department_id,
            productData.category_id,
            productData.vendor_id,
            productData.status,
            productData.discontinued_date,
            productData.updated_at
          ]);

          productCount++;

          // Transform pricing data - Create separate records for purchase and transfer costs
          const warehouseCost = cleanNumeric(record[FIELD_MAPPING.warehouseCaseCost]);
          const transferCost = cleanNumeric(record[FIELD_MAPPING.transferCaseCost]);
          const retailPrice = cleanNumeric(record[FIELD_MAPPING.retailUnit]);
          const offInvoice = cleanNumeric(record[FIELD_MAPPING.offInvoice]);
          const billBack = cleanNumeric(record[FIELD_MAPPING.billBack]);

          // Create current pricing record (for transfers and display)
          if (transferCost > 0 || retailPrice > 0) {
            await client.query(`
              INSERT INTO product_prices (
                purchase_cost, off_invoice, bill_back, effective_date,
                transfer_cost, unit_cost, price_multiple, retail_price,
                start_date, end_date, notes, created_at, updated_at, product_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              ON CONFLICT (product_id, effective_date) DO UPDATE SET
                purchase_cost = EXCLUDED.purchase_cost,
                transfer_cost = EXCLUDED.transfer_cost,
                retail_price = EXCLUDED.retail_price,
                off_invoice = EXCLUDED.off_invoice,
                bill_back = EXCLUDED.bill_back,
                updated_at = EXCLUDED.updated_at
            `, [
              warehouseCost, // purchase_cost
              offInvoice, // off_invoice
              billBack, // bill_back
              '2025-04-24', // effective_date (current pricing)
              transferCost, // transfer_cost
              transferCost, // unit_cost (same as transfer for now)
              cleanNumeric(record[FIELD_MAPPING.retailMultiplier], 1), // price_multiple
              retailPrice, // retail_price
              '2025-04-24', // start_date
              null, // end_date (current pricing)
              cleanText(record[FIELD_MAPPING.notes]), // notes
              new Date().toISOString(), // created_at
              new Date().toISOString(), // updated_at
              productId // product_id
            ]);

            priceCount++;
          }

        } catch (error) {
          console.error(`Error processing product ${record[FIELD_MAPPING.productId]}:`, error.message);
          errorCount++;
          continue;
        }
      }

      await client.query('COMMIT');
      
      console.log('\n=== TRANSFORMATION COMPLETE ===');
      console.log(`Products processed: ${productCount}`);
      console.log(`Pricing records created: ${priceCount}`);
      console.log(`Errors encountered: ${errorCount}`);
      console.log(`Success rate: ${((productCount / records.length) * 100).toFixed(1)}%`);
      
      // Verify data integrity
      const productCheck = await client.query('SELECT COUNT(*) as count FROM products');
      const priceCheck = await client.query('SELECT COUNT(*) as count FROM product_prices');
      
      console.log('\n=== DATA VERIFICATION ===');
      console.log(`Products in database: ${productCheck.rows[0].count}`);
      console.log(`Pricing records in database: ${priceCheck.rows[0].count}`);
      
      // Show status distribution
      const statusCheck = await client.query(`
        SELECT status, COUNT(*) as count 
        FROM products 
        GROUP BY status 
        ORDER BY count DESC
      `);
      
      console.log('\n=== STATUS DISTRIBUTION ===');
      statusCheck.rows.forEach(row => {
        console.log(`${row.status}: ${row.count} products`);
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Transformation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run transformation
transformLegacyProducts()
  .then(() => {
    console.log('\nLegacy products transformation completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTransformation failed:', error);
    process.exit(1);
  });