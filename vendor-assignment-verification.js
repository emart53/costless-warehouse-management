/**
 * Vendor Assignment Verification
 * Compares current system vendor assignments against authentic legacy data
 */

const fs = require('fs').promises;
const { Pool } = require('pg');

// Legacy vendor assignments from your authentic system
const legacyAssignments = {
  54: 40, 55: 40, 56: 40, 59: 218, 61: 13, 62: 33, 70: 218, 71: 33, 72: 33, 80: 10,
  85: 37, 120: 37, 127: 1, 128: 1, 133: 38, 162: 37, 190: 19, 192: 19, 202: 146,
  1619: 33, 1627: 259, 1630: 37, 1638: 13, 1640: 228, 1648: 33, 1679: 157, 266: 33,
  285: 37, 289: 33, 311: 37, 342: 31, 347: 33, 348: 33, 352: 62, 353: 62, 363: 63,
  366: 37, 368: 37, 371: 64, 392: 62, 395: 62, 397: 62, 398: 62, 400: 33, 401: 33,
  405: 9, 417: 33, 418: 33, 426: 62, 480: 36, 486: 33, 487: 33, 488: 33, 489: 33,
  491: 19, 492: 19, 493: 56, 514: 37, 521: 33, 536: 37, 558: 62, 562: 155, 573: 218,
  579: 1, 580: 1, 582: 1, 589: 33, 590: 33, 591: 33, 592: 33, 593: 33, 594: 33,
  613: 9, 623: 19, 625: 58, 632: 33, 644: 126, 648: 9, 659: 79, 660: 79, 661: 79,
  732: 62, 759: 33, 773: 33, 775: 40, 824: 9, 826: 33, 827: 33, 876: 218, 910: 9,
  928: 63, 929: 63, 930: 63, 964: 154, 984: 98, 999: 23, 1050: 235, 1068: 87,
  1124: 35, 1125: 35, 1127: 14, 1144: 9, 1145: 218, 1171: 16, 1181: 9, 1182: 9,
  1199: 87, 1208: 37, 1209: 37, 1221: 10, 1224: 259, 1227: 81, 1243: 2, 1252: 113,
  1267: 33, 1275: 40, 1290: 14, 1303: 115, 1315: 35, 1321: 13, 1359: 37, 1364: 19,
  1367: 218, 1368: 218, 1371: 37, 1374: 33, 1396: 33, 1423: 218, 1456: 62, 1482: 36,
  1483: 134, 1490: 91, 1492: 105, 1499: 51, 1504: 62, 1510: 33, 1554: 27, 1564: 37,
  1570: 62, 1683: 8, 1712: 175, 1714: 118, 1715: 14, 1721: 67, 1722: 67, 1709: 218,
  1710: 218, 1743: 181, 1744: 181, 1750: 4, 1751: 4, 1752: 4, 1788: 31, 1789: 31,
  1796: 31, 1797: 31, 1798: 31, 1799: 39, 1800: 39, 1801: 39, 1804: 185, 1811: 14,
  1821: 37, 1790: 31, 1791: 31, 1793: 31, 1794: 31, 1795: 31, 1830: 14, 1835: 33,
  1861: 156, 1867: 31, 1870: 37, 2113: 178, 2115: 198, 2117: 16, 2125: 129, 2132: 63,
  2175: 201, 2176: 201, 2177: 201, 2178: 201, 2179: 201, 2210: 31, 2213: 235, 2214: 235,
  2217: 14, 2218: 33, 2219: 1, 2230: 51, 2232: 155, 2233: 155, 2234: 8, 1906: 11,
  1910: 9, 1916: 89, 1918: 14, 1920: 14, 1930: 16, 1931: 16, 2261: 37, 2287: 134,
  2308: 228, 2351: 37, 2354: 175, 2359: 46, 2371: 207, 2372: 207, 2373: 207, 2374: 207,
  2375: 207, 2380: 178, 2385: 209, 2404: 79, 2414: 64, 2714: 226, 2405: 79, 2406: 79,
  2482: 37, 2490: 75, 2497: 75, 1944: 105, 1945: 191, 1946: 191, 1963: 155, 2514: 79,
  2525: 33, 2541: 195, 2544: 228, 2545: 156, 2548: 31, 2549: 31, 2558: 218, 2560: 146,
  2573: 155, 2611: 112, 2627: 31, 2642: 175, 2651: 207, 2664: 37, 2665: 37, 2680: 220,
  1971: 218, 1984: 218, 1985: 81, 1986: 81, 1987: 81, 1988: 81, 2718: 51, 2729: 146,
  2736: 37, 2739: 230, 2746: 231, 2747: 231, 2748: 194, 2749: 194, 2752: 218, 2753: 218,
  2754: 218, 2766: 218, 2769: 118, 2771: 218, 2777: 46, 2781: 37, 2784: 221, 2785: 37,
  2788: 236, 2789: 236, 2790: 236, 2794: 49, 2795: 220, 2796: 220, 2797: 237, 2798: 237,
  2799: 237, 2800: 237, 2809: 146, 2810: 240, 2820: 218, 2871: 218, 2801: 237, 2823: 243,
  2824: 243, 2825: 40, 2828: 37, 2830: 37, 2831: 37, 2832: 37, 2833: 37, 2834: 37,
  2835: 37, 2836: 37, 2837: 37, 2838: 37, 2844: 244, 2877: 140, 2878: 140, 2883: 218,
  2885: 40, 2886: 40, 2890: 37, 2891: 37, 2892: 30, 2893: 37, 2894: 37, 2911: 248,
  2912: 75, 2913: 228, 2916: 37, 2932: 195, 2067: 9, 2933: 195, 2934: 195, 2936: 259,
  2939: 181, 2940: 45, 2943: 37, 2944: 259, 2356: 175, 2381: 208, 2382: 208, 2390: 63,
  2397: 178, 2403: 79, 2578: 91, 2581: 214, 2589: 91, 2597: 215, 2711: 221, 2856: 37,
  2857: 37, 2861: 215, 2862: 214, 2864: 245, 2869: 246, 2899: 63, 2900: 257
};

async function verifyVendorAssignments() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Verifying vendor assignments against authentic legacy data...\n');

    // Get current system assignments for products in legacy list
    const productIds = Object.keys(legacyAssignments).join(',');
    const result = await pool.query(`
      SELECT product_id, vendor_id, name, product_description
      FROM products 
      WHERE product_id IN (${productIds})
      ORDER BY product_id
    `);

    const currentAssignments = {};
    result.rows.forEach(row => {
      currentAssignments[row.product_id] = row.vendor_id;
    });

    // Compare assignments
    const mismatches = [];
    const matches = [];
    const missing = [];

    for (const [productId, expectedVendorId] of Object.entries(legacyAssignments)) {
      const pid = parseInt(productId);
      const expectedVid = parseInt(expectedVendorId);
      const currentVid = currentAssignments[pid];

      if (currentVid === undefined) {
        missing.push({ productId: pid, expectedVendorId: expectedVid });
      } else if (currentVid !== expectedVid) {
        mismatches.push({ 
          productId: pid, 
          expectedVendorId: expectedVid, 
          currentVendorId: currentVid 
        });
      } else {
        matches.push({ productId: pid, vendorId: expectedVid });
      }
    }

    // Summary Report
    console.log('📊 VENDOR ASSIGNMENT VERIFICATION REPORT');
    console.log('=========================================');
    console.log(`✅ Correct Assignments: ${matches.length}`);
    console.log(`❌ Incorrect Assignments: ${mismatches.length}`);
    console.log(`🚫 Missing Products: ${missing.length}`);
    console.log(`📋 Total Products Checked: ${Object.keys(legacyAssignments).length}\n`);

    // Detailed Mismatches
    if (mismatches.length > 0) {
      console.log('❌ INCORRECT VENDOR ASSIGNMENTS:');
      console.log('Product ID | Expected Vendor | Current Vendor');
      console.log('-----------|-----------------|---------------');
      mismatches.forEach(item => {
        console.log(`${item.productId.toString().padEnd(10)} | ${item.expectedVendorId.toString().padEnd(15)} | ${item.currentVendorId}`);
      });
      console.log('');
    }

    // Missing Products
    if (missing.length > 0) {
      console.log('🚫 MISSING PRODUCTS:');
      console.log('Product ID | Expected Vendor');
      console.log('-----------|----------------');
      missing.forEach(item => {
        console.log(`${item.productId.toString().padEnd(10)} | ${item.expectedVendorId}`);
      });
      console.log('');
    }

    // Generate correction SQL
    if (mismatches.length > 0) {
      console.log('🔧 CORRECTION SQL STATEMENTS:');
      console.log('-- Run these statements to fix vendor assignments');
      mismatches.forEach(item => {
        console.log(`UPDATE products SET vendor_id = ${item.expectedVendorId} WHERE product_id = ${item.productId}; -- Currently: ${item.currentVendorId}`);
      });
      console.log('');
    }

    // Vendor frequency analysis
    const vendorCounts = {};
    Object.values(legacyAssignments).forEach(vendorId => {
      vendorCounts[vendorId] = (vendorCounts[vendorId] || 0) + 1;
    });

    console.log('📈 TOP VENDORS BY PRODUCT COUNT (Legacy System):');
    console.log('Vendor ID | Product Count');
    console.log('----------|-------------');
    Object.entries(vendorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([vendorId, count]) => {
        console.log(`${vendorId.toString().padEnd(9)} | ${count}`);
      });

    return { matches, mismatches, missing };

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  verifyVendorAssignments();
}

module.exports = { verifyVendorAssignments };