/**
 * Final Transfer Order Items Migration
 * Complete remaining items with better error handling and validation
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

class FinalTransferItemsLoader {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.batchSize = 1500;
  }

  parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, { 
      columns: true, 
      skip_empty_lines: true 
    });
  }

  async getValidTransferIds() {
    const result = await this.pool.query('SELECT id FROM transfer_orders');
    return new Set(result.rows.map(row => row.id));
  }

  async getCurrentItemCount() {
    const result = await this.pool.query('SELECT COUNT(*) FROM transfer_order_items');
    return parseInt(result.rows[0].count);
  }

  async loadRemainingItems() {
    console.log('Loading final batch of transfer order items...');
    
    const itemsPath = path.join(process.cwd(), 'attached_assets', 'transfer_items_1749144612951.csv');
    const records = this.parseCSV(itemsPath);
    
    const currentCount = await this.getCurrentItemCount();
    const validTransferIds = await this.getValidTransferIds();
    
    console.log(`Current items: ${currentCount}`);
    console.log(`Total CSV records: ${records.length}`);
    console.log(`Valid transfer IDs: ${validTransferIds.size}`);
    
    if (currentCount >= records.length) {
      console.log('Migration already complete!');
      return currentCount;
    }

    // Process from where we left off
    const remaining = records.slice(currentCount);
    console.log(`Processing remaining ${remaining.length} items...`);
    
    let processed = 0;
    let successful = 0;
    let skipped = 0;
    
    for (let i = 0; i < remaining.length; i += this.batchSize) {
      const batch = remaining.slice(i, i + this.batchSize);
      
      const validItems = [];
      
      for (const record of batch) {
        const transferId = parseInt(record.transfer_id);
        const productId = parseInt(record.product_id);
        
        // Validate required fields
        if (isNaN(transferId) || isNaN(productId)) {
          skipped++;
          continue;
        }
        
        // Check if transfer exists
        if (!validTransferIds.has(transferId)) {
          skipped++;
          continue;
        }
        
        validItems.push({
          transferId,
          productId,
          quantityOrdered: parseInt(record.quantity_ordered || 0),
          quantityShipped: parseInt(record.quantity_shipped || 0),
          quantityReceived: parseInt(record.quantity_received || 0),
          unitCost: parseFloat(record.unit_cost || 0),
          lineTotal: parseFloat(record.line_total || 0),
          notes: record.notes || ''
        });
      }
      
      if (validItems.length === 0) {
        processed += batch.length;
        continue;
      }
      
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const item of validItems) {
        values.push(
          item.transferId, item.productId, item.quantityOrdered, 
          item.quantityShipped, item.quantityReceived, item.unitCost, 
          item.lineTotal, item.notes
        );
        placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
        paramIndex += 8;
      }
      
      try {
        await this.pool.query(`
          INSERT INTO transfer_order_items (
            transfer_id, product_id, quantity_ordered, quantity_shipped, 
            quantity_received, unit_cost, line_total, notes
          ) VALUES ${placeholders.join(', ')}
        `, values);
        
        successful += validItems.length;
        
      } catch (error) {
        console.error(`Batch failed:`, error.message);
        skipped += validItems.length;
      }
      
      processed += batch.length;
      
      if (processed % 20000 === 0) {
        console.log(`Progress: ${currentCount + processed}/${records.length} (${successful} loaded, ${skipped} skipped)`);
      }
    }
    
    const finalCount = await this.getCurrentItemCount();
    console.log(`Final result: ${finalCount} items loaded (${successful} new, ${skipped} skipped)`);
    return finalCount;
  }

  async updateTransferTotals() {
    console.log('Updating transfer order totals...');
    
    await this.pool.query(`
      UPDATE transfer_orders 
      SET 
        total_items = (
          SELECT COALESCE(SUM(quantity_ordered), 0) 
          FROM transfer_order_items 
          WHERE transfer_id = transfer_orders.id
        ),
        total_cases = (
          SELECT COALESCE(COUNT(*), 0) 
          FROM transfer_order_items 
          WHERE transfer_id = transfer_orders.id
        )
    `);
    
    console.log('Transfer order totals updated');
  }

  async complete() {
    try {
      console.log('=== Final Transfer Items Migration ===');
      
      await this.loadRemainingItems();
      await this.updateTransferTotals();
      
      // Final status
      const headerCount = await this.pool.query('SELECT COUNT(*) FROM transfer_orders');
      const itemCount = await this.pool.query('SELECT COUNT(*) FROM transfer_order_items');
      
      // Sample recent transfers with items
      const recentWithItems = await this.pool.query(`
        SELECT t.id, t.transfer_number, t.order_date, COUNT(ti.id) as items
        FROM transfer_orders t
        LEFT JOIN transfer_order_items ti ON t.id = ti.transfer_id
        WHERE t.id >= 48620
        GROUP BY t.id, t.transfer_number, t.order_date
        ORDER BY t.id DESC
        LIMIT 5
      `);
      
      console.log('=== Migration Complete ===');
      console.log(`Transfer Orders: ${headerCount.rows[0].count}`);
      console.log(`Transfer Items: ${itemCount.rows[0].count}`);
      console.log('Recent transfers with items:');
      recentWithItems.rows.forEach(row => {
        console.log(`  ${row.transfer_number}: ${row.items} items`);
      });
      
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      await this.pool.end();
    }
  }
}

const loader = new FinalTransferItemsLoader();
loader.complete();