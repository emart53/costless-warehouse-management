/**
 * Reconcile Vendor Discount Data with Legacy System
 * Ensures all vendor discount information matches authentic CostLessWarehouse data
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

function safeFloat(value) {
  if (!value || value === 'NULL' || value === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function safeInt(value) {
  if (!value || value === 'NULL' || value === '') return null;
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}

function safeString(value) {
  if (!value || value === 'NULL' || value === 'None') return null;
  return value.toString().trim();
}

async function reconcileVendorDiscounts() {
  console.log('Reconciling vendor discount data with legacy system...');
  
  const data = fs.readFileSync('./attached_assets/vendors.csv', 'utf-8');
  const lines = data.split('\n');
  
  console.log(`Processing ${lines.length - 1} vendor records...`);

  let updated = 0;
  let reconciled = 0;
  let discrepancies = [];

  // Process each vendor (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line);
    if (columns.length < 20) continue;

    // CSV: vendor_id,vendor_name,vendor_ap,contact_person,email,phone,fax,address,address2,city,state,zip,discount,ep_days,net_days,lead_time,notes,is_active,created_at,updated_at
    const vendorId = safeInt(columns[0]);
    const vendorName = safeString(columns[1]);
    const discount = safeFloat(columns[12]);
    const epDays = safeInt(columns[13]);
    const netDays = safeInt(columns[14]);
    const leadTime = safeInt(columns[15]);
    const contactPerson = safeString(columns[3]);
    const email = safeString(columns[4]);
    const phone = safeString(columns[5]);

    if (!vendorId || !vendorName) continue;

    try {
      // Check current database values
      const currentVendor = await pool.query(
        'SELECT id, name, discount_percent, ep_days, net_days, lead_time, contact_name, email, phone FROM vendors WHERE id = $1',
        [vendorId]
      );

      if (currentVendor.rows.length === 0) {
        console.log(`Vendor ${vendorId} (${vendorName}) not found in database`);
        continue;
      }

      const current = currentVendor.rows[0];
      const currentDiscount = parseFloat(current.discount_percent) || 0;
      const legacyDiscount = discount || 0;

      // Check for discrepancies
      let needsUpdate = false;
      let changes = [];

      if (Math.abs(currentDiscount - legacyDiscount) > 0.001) {
        needsUpdate = true;
        changes.push(`discount: ${currentDiscount} → ${legacyDiscount}`);
        discrepancies.push({
          vendorId,
          vendorName,
          field: 'discount',
          current: currentDiscount,
          legacy: legacyDiscount
        });
      }

      if (current.ep_days !== epDays) {
        needsUpdate = true;
        changes.push(`EP days: ${current.ep_days} → ${epDays}`);
      }

      if (current.net_days !== netDays) {
        needsUpdate = true;
        changes.push(`Net days: ${current.net_days} → ${netDays}`);
      }

      if (current.lead_time !== leadTime) {
        needsUpdate = true;
        changes.push(`Lead time: ${current.lead_time} → ${leadTime}`);
      }

      if (needsUpdate) {
        // Build payment terms based on discount and days
        let paymentTerms = `Net ${netDays || 30}`;
        if (discount > 0 && epDays > 0) {
          paymentTerms = `Net ${netDays || 30}, ${(discount * 100).toFixed(1)}% ${epDays} days`;
        }

        await pool.query(`
          UPDATE vendors 
          SET 
            discount_percent = $1,
            ep_days = $2,
            net_days = $3,
            lead_time = $4,
            payment_terms = $5,
            contact_name = COALESCE($6, contact_name),
            email = COALESCE($7, email),
            phone = COALESCE($8, phone)
          WHERE id = $9
        `, [
          discount, epDays, netDays, leadTime, paymentTerms,
          contactPerson, email, phone, vendorId
        ]);

        updated++;
        console.log(`Updated ${vendorName} (${vendorId}): ${changes.join(', ')}`);
      }

      reconciled++;
    } catch (error) {
      console.log(`Error processing vendor ${vendorId}: ${error.message}`);
    }
  }

  console.log(`\nReconciliation completed: ${updated}/${reconciled} vendors updated`);

  // Generate discrepancy report
  if (discrepancies.length > 0) {
    console.log(`\n=== DISCOUNT DISCREPANCIES FOUND ===`);
    discrepancies.forEach(disc => {
      console.log(`${disc.vendorName} (${disc.vendorId}): ${disc.current}% → ${disc.legacy}%`);
    });
  }

  return { updated, reconciled, discrepancies };
}

async function verifyPurchaseOrderCalculations() {
  console.log('\nVerifying purchase order discount calculations...');
  
  // Check recent POs with vendor discounts
  const poCheck = await pool.query(`
    SELECT 
      po.po_number,
      v.name as vendor_name,
      v.discount_percent,
      v.payment_terms,
      COUNT(poi.id) as item_count,
      SUM(poi.line_total) as subtotal,
      po.total_amount,
      ROUND(SUM(poi.line_total) * (1 - COALESCE(v.discount_percent, 0))::numeric, 2) as calculated_total
    FROM purchase_orders po
    JOIN vendors v ON po.vendor_id = v.id
    LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
    WHERE v.discount_percent > 0 AND po.order_date >= '2025-05-01'
    GROUP BY po.id, po.po_number, v.name, v.discount_percent, v.payment_terms, po.total_amount
    ORDER BY po.order_date DESC
    LIMIT 10
  `);

  console.log('\n=== PURCHASE ORDER DISCOUNT VERIFICATION ===');
  poCheck.rows.forEach(row => {
    const discountAmount = (parseFloat(row.subtotal) * parseFloat(row.discount_percent)).toFixed(2);
    console.log(`${row.po_number} (${row.vendor_name}): $${row.subtotal} - $${discountAmount} discount = $${row.calculated_total}`);
  });

  return poCheck.rows;
}

async function execute() {
  try {
    const reconciliation = await reconcileVendorDiscounts();
    const verification = await verifyPurchaseOrderCalculations();
    
    console.log(`\n=== VENDOR RECONCILIATION SUMMARY ===`);
    console.log(`Vendors processed: ${reconciliation.reconciled}`);
    console.log(`Vendors updated: ${reconciliation.updated}`);
    console.log(`Discount discrepancies found: ${reconciliation.discrepancies.length}`);
    console.log(`Purchase orders verified: ${verification.length}`);
    
    // Check specific Quaker PO 20996
    const quakerCheck = await pool.query(`
      SELECT 
        po.po_number,
        v.name as vendor_name,
        v.discount_percent,
        v.payment_terms,
        SUM(poi.line_total) as subtotal,
        ROUND(SUM(poi.line_total) * (1 - COALESCE(v.discount_percent, 0))::numeric, 2) as net_total
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
      WHERE po.id = 20996
      GROUP BY po.id, po.po_number, v.name, v.discount_percent, v.payment_terms
    `);

    if (quakerCheck.rows.length > 0) {
      const quaker = quakerCheck.rows[0];
      console.log(`\n=== QUAKER PO-20996 VERIFICATION ===`);
      console.log(`Vendor: ${quaker.vendor_name}`);
      console.log(`Discount: ${(parseFloat(quaker.discount_percent) * 100).toFixed(1)}%`);
      console.log(`Payment Terms: ${quaker.payment_terms}`);
      console.log(`Subtotal: $${quaker.subtotal}`);
      console.log(`Net Total (after discount): $${quaker.net_total}`);
    }
    
  } catch (error) {
    console.error('Vendor reconciliation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

execute()
  .then(() => {
    console.log('\nVendor discount reconciliation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Vendor discount reconciliation failed:', error);
    process.exit(1);
  });