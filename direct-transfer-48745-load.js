/**
 * Direct Transfer 48745 Items Load - Target specific transfer
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

async function loadTransfer48745Items() {
  console.log('Loading transfer 48745 items directly...');
  
  const data = fs.readFileSync('./attached_assets/transfer_items_06-06-25.csv', 'utf-8');
  const lines = data.split('\n').slice(1); // Skip header
  
  // Get transfer 48745 internal ID
  const transferResult = await pool.query(
    'SELECT id FROM transfer_orders WHERE transfer_number = $1',
    ['48745']
  );

  if (transferResult.rows.length === 0) {
    console.log('Transfer 48745 not found');
    return 0;
  }

  const transferId = transferResult.rows[0].id;
  console.log(`Transfer 48745 internal ID: ${transferId}`);

  // Clear existing items for 48745
  await pool.query('DELETE FROM transfer_order_items WHERE transfer_id = $1', [transferId]);

  let loaded = 0;
  let found48745Items = [];

  // Find all lines for transfer 48745
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line);
    if (columns.length < 9) continue;

    const transId = columns[1];
    if (transId === '48745') {
      found48745Items.push(columns);
    }
  }

  console.log(`Found ${found48745Items.length} items for transfer 48745`);

  // Load each item for transfer 48745
  for (const columns of found48745Items) {
    const productId = parseInt(columns[2]) || 0;
    const transQty = parseInt(columns[3]) || 0;
    const transCfg = columns[4] || '';
    const transCost = parseFloat(columns[5]) || 0;
    const transCrv = parseFloat(columns[6]) || 0;
    const transConfigWt = parseFloat(columns[7]) || 0;
    const transCaseQty = parseInt(columns[8]) || 0;

    if (!productId) continue;

    const lineTotal = transQty * transCost;

    try {
      await pool.query(`
        INSERT INTO transfer_order_items (
          transfer_id, product_id, quantity_ordered, quantity_shipped, quantity_received,
          unit_cost, crv_per_unit, total_crv, transfer_cfg, transfer_weight,
          transfer_case_qty, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        transferId, productId, transQty, transQty, transQty,
        transCost, transCrv, transCrv * transQty, transCfg,
        transConfigWt, transCaseQty, lineTotal
      ]);

      loaded++;
    } catch (error) {
      console.log(`Error loading item ${productId}: ${error.message}`);
    }
  }

  // Update transfer totals
  await pool.query(`
    UPDATE transfer_orders 
    SET total_items = $1
    WHERE id = $2
  `, [loaded, transferId]);

  console.log(`Transfer 48745: ${loaded} items loaded`);

  // Verify the load
  const verification = await pool.query(`
    SELECT 
      t.transfer_number,
      t.department_id,
      d.department_name,
      s.name as store_name,
      COUNT(toi.id) as items,
      SUM(toi.quantity_shipped) as total_qty,
      ROUND(SUM(toi.line_total)::numeric, 2) as total_value
    FROM transfer_orders t
    LEFT JOIN transfer_order_items toi ON t.id = toi.transfer_id
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN stores s ON t.store_id = s.id
    WHERE t.transfer_number = '48745'
    GROUP BY t.id, t.transfer_number, t.department_id, d.department_name, s.name
  `);

  if (verification.rows.length > 0) {
    const row = verification.rows[0];
    console.log(`\nTransfer 48745 Verification:`);
    console.log(`Department: ${row.department_name}`);
    console.log(`Store: ${row.store_name}`);
    console.log(`Items: ${row.items}`);
    console.log(`Total Quantity: ${row.total_qty}`);
    console.log(`Total Value: $${row.total_value}`);
  }

  return loaded;
}

loadTransfer48745Items()
  .then(async (count) => {
    console.log(`Transfer 48745 loading complete: ${count} items`);
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Transfer 48745 loading failed:', error);
    await pool.end();
    process.exit(1);
  });