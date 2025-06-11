/**
 * Validate and Update Vendor Address Data
 * Cross-reference database vendors with CSV data to identify missing information
 */

import { readFileSync } from 'fs';
import { Client } from 'pg';

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

async function validateVendorData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('Connected to database');
  
  try {
    // Get all active vendors from database
    const dbResult = await client.query(`
      SELECT id, code, name, address, city, state, zip_code, phone, contact_name, is_active 
      FROM vendors 
      WHERE is_active = true 
      ORDER BY id
    `);
    
    // Read CSV file
    const csvContent = readFileSync('attached_assets/vendors.csv', 'utf-8');
    const csvLines = csvContent.split('\n');
    const headers = parseCSVLine(csvLines[0]);
    
    console.log('CSV Headers:', headers);
    console.log('Found', csvLines.length - 1, 'vendor records in CSV');
    
    // Parse CSV data
    const csvVendors = {};
    for (let i = 1; i < csvLines.length; i++) {
      if (!csvLines[i].trim()) continue;
      
      const values = parseCSVLine(csvLines[i]);
      const vendorId = parseInt(values[0]);
      
      if (!isNaN(vendorId)) {
        csvVendors[vendorId] = {
          id: vendorId,
          name: values[1] || '',
          code: values[2] || '',
          contactPerson: values[3] || '',
          email: values[4] || '',
          phone: values[5] || '',
          fax: values[6] || '',
          address: values[7] || '',
          address2: values[8] || '',
          city: values[9] || '',
          state: values[10] || '',
          zip: values[11] || '',
          discount: parseFloat(values[12]) || 0,
          epDays: parseInt(values[13]) || null,
          netDays: parseInt(values[14]) || null,
          leadTime: parseInt(values[15]) || null,
          notes: values[16] || '',
          isActive: values[17] === '1'
        };
      }
    }
    
    console.log('Parsed', Object.keys(csvVendors).length, 'vendors from CSV');
    
    // Compare database vs CSV data
    const missingDataVendors = [];
    const updateNeeded = [];
    
    for (const dbVendor of dbResult.rows) {
      const csvVendor = csvVendors[dbVendor.id];
      
      if (csvVendor) {
        const needsUpdate = [];
        
        // Check address fields
        if (!dbVendor.address && csvVendor.address) {
          needsUpdate.push(`address: '${csvVendor.address}'`);
        }
        if (!dbVendor.city && csvVendor.city) {
          needsUpdate.push(`city: '${csvVendor.city}'`);
        }
        if (!dbVendor.state && csvVendor.state) {
          needsUpdate.push(`state: '${csvVendor.state}'`);
        }
        if (!dbVendor.zip_code && csvVendor.zip) {
          needsUpdate.push(`zip: '${csvVendor.zip}'`);
        }
        if (!dbVendor.contact_name && csvVendor.contactPerson) {
          needsUpdate.push(`contact: '${csvVendor.contactPerson}'`);
        }
        if (!dbVendor.phone && csvVendor.phone) {
          needsUpdate.push(`phone: '${csvVendor.phone}'`);
        }
        
        if (needsUpdate.length > 0) {
          updateNeeded.push({
            id: dbVendor.id,
            code: dbVendor.code,
            name: dbVendor.name,
            missing: needsUpdate,
            csvData: csvVendor
          });
        }
      } else {
        missingDataVendors.push({
          id: dbVendor.id,
          code: dbVendor.code,
          name: dbVendor.name,
          status: 'No CSV data found'
        });
      }
    }
    
    console.log('\n=== VENDOR DATA VALIDATION RESULTS ===\n');
    
    if (updateNeeded.length > 0) {
      console.log(`Found ${updateNeeded.length} vendors with missing data that exists in CSV:\n`);
      
      for (const vendor of updateNeeded) {
        console.log(`${vendor.code} - ${vendor.name} (ID: ${vendor.id})`);
        console.log(`  Missing: ${vendor.missing.join(', ')}`);
        console.log('');
      }
      
      // Generate update statements
      console.log('\n=== UPDATE STATEMENTS ===\n');
      
      for (const vendor of updateNeeded) {
        const updates = [];
        const csvData = vendor.csvData;
        
        if (!vendor.missing.some(m => m.includes('address')) && csvData.address) {
          updates.push(`address = '${csvData.address.replace(/'/g, "''")}'`);
        }
        if (!vendor.missing.some(m => m.includes('city')) && csvData.city) {
          updates.push(`city = '${csvData.city.replace(/'/g, "''")}'`);
        }
        if (!vendor.missing.some(m => m.includes('state')) && csvData.state) {
          updates.push(`state = '${csvData.state.replace(/'/g, "''")}'`);
        }
        if (!vendor.missing.some(m => m.includes('zip')) && csvData.zip) {
          updates.push(`zip_code = '${csvData.zip.replace(/'/g, "''")}'`);
        }
        if (!vendor.missing.some(m => m.includes('contact')) && csvData.contactPerson) {
          updates.push(`contact_name = '${csvData.contactPerson.replace(/'/g, "''")}'`);
        }
        if (!vendor.missing.some(m => m.includes('phone')) && csvData.phone) {
          updates.push(`phone = '${csvData.phone.replace(/'/g, "''")}'`);
        }
        
        if (updates.length > 0) {
          console.log(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ${vendor.id};`);
        }
      }
    }
    
    if (missingDataVendors.length > 0) {
      console.log(`\n${missingDataVendors.length} vendors not found in CSV:`);
      for (const vendor of missingDataVendors) {
        console.log(`  ${vendor.code} - ${vendor.name} (ID: ${vendor.id})`);
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total active vendors in DB: ${dbResult.rows.length}`);
    console.log(`Vendors needing updates: ${updateNeeded.length}`);
    console.log(`Vendors missing from CSV: ${missingDataVendors.length}`);
    
  } catch (error) {
    console.error('Error validating vendor data:', error);
  } finally {
    await client.end();
  }
}

await validateVendorData();