/**
 * Verify Product Pricing Against Authentic Legacy Data
 * Compares current system pricing with Cost Less warehouse legacy pricing
 */

const { Pool } = require('pg');

// Legacy pricing data from your authentic system
const legacyPricing = {
  54: { listCost: 207.00, offInvoice: 72.3243, billBack: 0.00, crv: 1.20, retail: 20.98 },
  55: { listCost: 198.00, offInvoice: 45.6004, billBack: 0.00, crv: 0.60, retail: 34.98 },
  56: { listCost: 78.00, offInvoice: 10.3832, billBack: 0.00, crv: 0.00, retail: 20.98 },
  59: { listCost: 83.98, offInvoice: 20.96, billBack: 0.00, crv: 0.60, retail: 15.98 },
  61: { listCost: 113.90, offInvoice: 30.00, billBack: 0.00, crv: 1.20, retail: 10.98 },
  62: { listCost: 112.20, offInvoice: 31.20, billBack: 0.00, crv: 1.20, retail: 10.48 },
  70: { listCost: 96.58, offInvoice: 16.22, billBack: 0.00, crv: 0.60, retail: 19.48 },
  71: { listCost: 140.40, offInvoice: 30.00, billBack: 0.00, crv: 1.20, retail: 14.98 },
  72: { listCost: 140.40, offInvoice: 30.00, billBack: 0.00, crv: 1.20, retail: 14.98 },
  80: { listCost: 2.95, offInvoice: 0.00, billBack: 0.00, crv: 1.20, retail: 3.98 },
  562: { listCost: 56.40, offInvoice: 0.00, billBack: 6.60, crv: 0.00, retail: 4.98 },
  1963: { listCost: 63.16, offInvoice: 0.00, billBack: 0.00, crv: 0.00, retail: 1.98 },
  2232: { listCost: 42.78, offInvoice: 0.00, billBack: 6.72, crv: 0.00, retail: 7.98 },
  2233: { listCost: 76.24, offInvoice: 0.00, billBack: 10.60, crv: 0.00, retail: 10.98 },
  2573: { listCost: 16.32, offInvoice: 0.00, billBack: 2.88, crv: 0.00, retail: 1.58 }
};

async function verifyPricingData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Verifying product pricing against authentic legacy data...\n');

    // Get current pricing for sample products
    const productIds = Object.keys(legacyPricing).join(',');
    const result = await pool.query(`
      SELECT 
        p.product_id,
        p.name,
        COALESCE(p.purchase_cost, p.last_cost, 0) as current_list_cost,
        COALESCE(p.off_invoice, 0) as current_off_invoice,
        COALESCE(p.bill_back, 0) as current_bill_back,
        COALESCE(p.crv, 0) as current_crv,
        COALESCE(p.retail_price, 0) as current_retail
      FROM products p
      WHERE p.product_id IN (${productIds})
      ORDER BY p.product_id
    `);

    console.log('📊 PRICING VERIFICATION REPORT');
    console.log('==============================');

    let correctCount = 0;
    let incorrectCount = 0;
    const mismatches = [];

    for (const row of result.rows) {
      const productId = row.product_id;
      const legacy = legacyPricing[productId];
      const current = {
        listCost: parseFloat(row.current_list_cost),
        offInvoice: parseFloat(row.current_off_invoice),
        billBack: parseFloat(row.current_bill_back),
        crv: parseFloat(row.current_crv),
        retail: parseFloat(row.current_retail)
      };

      const listMatch = Math.abs(current.listCost - legacy.listCost) < 0.01;
      const offInvoiceMatch = Math.abs(current.offInvoice - legacy.offInvoice) < 0.01;
      const billBackMatch = Math.abs(current.billBack - legacy.billBack) < 0.01;
      const crvMatch = Math.abs(current.crv - legacy.crv) < 0.01;
      const retailMatch = Math.abs(current.retail - legacy.retail) < 0.01;

      const allMatch = listMatch && offInvoiceMatch && billBackMatch && crvMatch && retailMatch;

      if (allMatch) {
        correctCount++;
        console.log(`✅ Product ${productId}: All pricing matches`);
      } else {
        incorrectCount++;
        console.log(`❌ Product ${productId} (${row.name}):`);
        
        if (!listMatch) {
          console.log(`   List Cost: Expected $${legacy.listCost}, Got $${current.listCost}`);
        }
        if (!offInvoiceMatch) {
          console.log(`   Off Invoice: Expected $${legacy.offInvoice}, Got $${current.offInvoice}`);
        }
        if (!billBackMatch) {
          console.log(`   Bill Back: Expected $${legacy.billBack}, Got $${current.billBack}`);
        }
        if (!crvMatch) {
          console.log(`   CRV: Expected $${legacy.crv}, Got $${current.crv}`);
        }
        if (!retailMatch) {
          console.log(`   Retail: Expected $${legacy.retail}, Got $${current.retail}`);
        }

        mismatches.push({
          productId,
          name: row.name,
          legacy,
          current,
          issues: {
            listCost: !listMatch,
            offInvoice: !offInvoiceMatch,
            billBack: !billBackMatch,
            crv: !crvMatch,
            retail: !retailMatch
          }
        });
      }
    }

    console.log(`\n📈 SUMMARY:`);
    console.log(`✅ Correct: ${correctCount}`);
    console.log(`❌ Incorrect: ${incorrectCount}`);
    console.log(`📋 Total Checked: ${result.rows.length}\n`);

    // Generate correction SQL for mismatched items
    if (mismatches.length > 0) {
      console.log('🔧 CORRECTION SQL STATEMENTS:');
      console.log('-- Run these to fix pricing discrepancies\n');
      
      for (const mismatch of mismatches) {
        const { productId, legacy } = mismatch;
        console.log(`-- Product ${productId}: ${mismatch.name}`);
        console.log(`UPDATE products SET`);
        console.log(`  purchase_cost = ${legacy.listCost},`);
        console.log(`  last_cost = ${legacy.listCost},`);
        console.log(`  off_invoice = ${legacy.offInvoice},`);
        console.log(`  bill_back = ${legacy.billBack},`);
        console.log(`  crv = ${legacy.crv},`);
        console.log(`  retail_price = ${legacy.retail}`);
        console.log(`WHERE product_id = ${productId};\n`);
      }
    }

    return { correctCount, incorrectCount, mismatches };

  } catch (error) {
    console.error('Error during pricing verification:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  verifyPricingData();
}

module.exports = { verifyPricingData };