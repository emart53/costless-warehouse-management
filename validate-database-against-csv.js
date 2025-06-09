/**
 * Validate Database Against Authentic CSV Data
 * Compares all products in database with CSV to identify discrepancies
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

async function validateDatabaseAgainstCSV() {
  try {
    console.log('Validating database against authentic CSV data...');
    
    // Load CSV data
    const csvData = fs.readFileSync('attached_assets/products.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    console.log(`Found ${lines.length - 1} CSV records to validate`);
    
    // Load database products
    const dbResult = await pool.query(`
      SELECT p.product_id, p.name, p.case_pack, p.size, p.vendor_id,
             pu.purchase_case_qty, pu.purchase_unit_ct, pu.purchase_cost, pu.off_invoice, pu.bill_back,
             pt.transfer_case_qty, pt.transfer_unit_ct, pt.transfer_weight,
             pr.retail_price, pr.transfer_cost, pr.unit_cost
      FROM products p
      LEFT JOIN product_purchases pu ON p.product_id = pu.product_id
      LEFT JOIN product_transfers pt ON p.product_id = pt.product_id
      LEFT JOIN product_prices pr ON p.product_id = pr.product_id
      WHERE p.product_id IS NOT NULL
      ORDER BY p.product_id
    `);
    
    const dbProducts = {};
    dbResult.rows.forEach(row => {
      dbProducts[row.product_id] = row;
    });
    
    console.log(`Found ${Object.keys(dbProducts).length} database products`);
    
    const discrepancies = [];
    let validatedCount = 0;
    let missingCount = 0;
    
    // Validate each CSV record against database
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 32) continue;
      
      const csvProduct = {
        productId: safeInt(values[0]),
        vendorId: safeInt(values[1]),
        name: safeString(values[4]),
        casePack: safeInt(values[5]),
        size: safeString(values[6]),
        // Purchase (Ship) data
        shipCaseQty: safeInt(values[13]),
        shipUnitCt: safeInt(values[11]),
        shipWeight: safeFloat(values[12]),
        purchaseCost: safeFloat(values[14]),
        offInvoice: safeFloat(values[15]),
        billBack: safeFloat(values[16]),
        purchaseCrv: safeFloat(values[17]),
        // Transfer data
        transCaseQty: safeInt(values[30]),
        transUnitCt: safeInt(values[20]),
        transWeight: safeFloat(values[21]),
        transferCost: safeFloat(values[22]),
        transferCrv: safeFloat(values[23]),
        // Pricing
        retailPrice: safeFloat(values[25])
      };
      
      if (!csvProduct.productId) continue;
      
      const dbProduct = dbProducts[csvProduct.productId];
      
      if (!dbProduct) {
        missingCount++;
        discrepancies.push({
          productId: csvProduct.productId,
          type: 'MISSING_FROM_DB',
          csvName: csvProduct.name,
          details: 'Product exists in CSV but not in database'
        });
        continue;
      }
      
      // Validate basic product info
      const issues = [];
      
      if (dbProduct.name !== csvProduct.name) {
        issues.push(`Name: DB="${dbProduct.name}" vs CSV="${csvProduct.name}"`);
      }
      
      if (dbProduct.case_pack !== csvProduct.casePack) {
        issues.push(`Case Pack: DB=${dbProduct.case_pack} vs CSV=${csvProduct.casePack}`);
      }
      
      if (dbProduct.vendor_id !== csvProduct.vendorId) {
        issues.push(`Vendor: DB=${dbProduct.vendor_id} vs CSV=${csvProduct.vendorId}`);
      }
      
      // Validate purchase configuration
      if (dbProduct.purchase_case_qty !== csvProduct.shipCaseQty) {
        issues.push(`Purchase Cases: DB=${dbProduct.purchase_case_qty} vs CSV=${csvProduct.shipCaseQty}`);
      }
      
      if (dbProduct.purchase_unit_ct !== csvProduct.shipUnitCt) {
        issues.push(`Purchase Units: DB=${dbProduct.purchase_unit_ct} vs CSV=${csvProduct.shipUnitCt}`);
      }
      
      if (Math.abs((dbProduct.purchase_cost || 0) - (csvProduct.purchaseCost || 0)) > 0.01) {
        issues.push(`Purchase Cost: DB=$${dbProduct.purchase_cost} vs CSV=$${csvProduct.purchaseCost}`);
      }
      
      if (Math.abs((dbProduct.off_invoice || 0) - (csvProduct.offInvoice || 0)) > 0.01) {
        issues.push(`Off Invoice: DB=$${dbProduct.off_invoice} vs CSV=$${csvProduct.offInvoice}`);
      }
      
      // Validate transfer configuration
      if (dbProduct.transfer_case_qty !== csvProduct.transCaseQty) {
        issues.push(`Transfer Cases: DB=${dbProduct.transfer_case_qty} vs CSV=${csvProduct.transCaseQty}`);
      }
      
      if (dbProduct.transfer_unit_ct !== csvProduct.transUnitCt) {
        issues.push(`Transfer Units: DB=${dbProduct.transfer_unit_ct} vs CSV=${csvProduct.transUnitCt}`);
      }
      
      if (Math.abs((dbProduct.retail_price || 0) - (csvProduct.retailPrice || 0)) > 0.01) {
        issues.push(`Retail Price: DB=$${dbProduct.retail_price} vs CSV=$${csvProduct.retailPrice}`);
      }
      
      if (Math.abs((dbProduct.transfer_cost || 0) - (csvProduct.transferCost || 0)) > 0.01) {
        issues.push(`Transfer Cost: DB=$${dbProduct.transfer_cost} vs CSV=$${csvProduct.transferCost}`);
      }
      
      if (issues.length > 0) {
        discrepancies.push({
          productId: csvProduct.productId,
          type: 'DATA_MISMATCH',
          csvName: csvProduct.name,
          dbName: dbProduct.name,
          issues: issues
        });
      } else {
        validatedCount++;
      }
    }
    
    // Summary report
    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(`✓ Validated: ${validatedCount} products match CSV exactly`);
    console.log(`✗ Missing: ${missingCount} products in CSV but not in database`);
    console.log(`⚠ Mismatched: ${discrepancies.filter(d => d.type === 'DATA_MISMATCH').length} products with data discrepancies`);
    
    // Show sample discrepancies
    if (discrepancies.length > 0) {
      console.log('\n=== SAMPLE DISCREPANCIES ===');
      discrepancies.slice(0, 10).forEach(disc => {
        console.log(`\nProduct ${disc.productId}: ${disc.csvName}`);
        if (disc.type === 'MISSING_FROM_DB') {
          console.log('  STATUS: Missing from database');
        } else {
          console.log(`  STATUS: Data mismatch (${disc.issues.length} issues)`);
          disc.issues.slice(0, 3).forEach(issue => {
            console.log(`    • ${issue}`);
          });
          if (disc.issues.length > 3) {
            console.log(`    ... and ${disc.issues.length - 3} more issues`);
          }
        }
      });
      
      if (discrepancies.length > 10) {
        console.log(`\n... and ${discrepancies.length - 10} more discrepancies`);
      }
    }
    
    // Show products that need the most corrections
    const priorityFixes = discrepancies
      .filter(d => d.type === 'DATA_MISMATCH')
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 5);
    
    if (priorityFixes.length > 0) {
      console.log('\n=== PRIORITY FIXES NEEDED ===');
      priorityFixes.forEach(fix => {
        console.log(`Product ${fix.productId}: ${fix.csvName} (${fix.issues.length} issues)`);
      });
    }
    
    return {
      total: lines.length - 1,
      validated: validatedCount,
      missing: missingCount,
      mismatched: discrepancies.filter(d => d.type === 'DATA_MISMATCH').length,
      discrepancies
    };
    
  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    await pool.end();
  }
}

validateDatabaseAgainstCSV();