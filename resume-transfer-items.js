/**
 * Resume Transfer Order Items Migration
 * Complete loading remaining transfer items with optimized batch processing
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

class ResumeTransferItemsLoader {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.batchSize = 2000; // Larger batches for faster loading
  }

  parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, { 
      columns: true, 
      skip_empty_lines: true 
    });
  }

  async getCurrentItemCount() {
    const result = await this.pool.query('SELECT COUNT(*) FROM transfer_order_items');
    return parseInt(result.rows[0].count);
  }

  async loadRemainingItems() {
    console.log('Resuming transfer order items migration...');
    
    const itemsPath = path.join(process.cwd(), 'attached_assets', 'transfer_items_1749144612951.csv');
    const records = this.parseCSV(itemsPath);
    
    const currentCount = await this.getCurrentItemCount();
    console.log(`Current items in database: ${currentCount}`);
    console.log(`Total items to process: ${records.length}`);
    
    if (currentCount >= records.length) {
      console.log('All items already loaded!');
      return currentCount;
    }

    const remaining = records.slice(currentCount);
    console.log(`Loading remaining ${remaining.length} items...`);
    
    let processed = 0;
    let successful = 0;
    
    for (let i = 0; i < remaining.length; i += this.batchSize) {
      const batch = remaining.slice(i, i + this.batchSize);
      
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const record of batch) {
        // Clean and validate data
        const transferId = parseInt(record.transfer_id);
        const productId = parseInt(record.product_id);
        const quantityOrdered = parseInt(record.quantity_ordered || 0);
        const quantityShipped = parseInt(record.quantity_shipped || 0);
        const quantityReceived = parseInt(record.quantity_received || 0);
        const unitCost = parseFloat(record.unit_cost || 0);
        const lineTotal = parseFloat(record.line_total || 0);
        const notes = record.notes || '';

        // Skip invalid records
        if (isNaN(transferId) || isNaN(productId)) {
          continue;
        }
        
        const itemData = [
          transferId, productId, quantityOrdered, quantityShipped, 
          quantityReceived, unitCost, lineTotal, notes
        ];
        
        values.push(...itemData);
        placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
        paramIndex += 8;
      }
      
      if (values.length === 0) continue;
      
      try {
        await this.pool.query(`
          INSERT INTO transfer_order_items (
            transfer_id, product_id, quantity_ordered, quantity_shipped, 
            quantity_received, unit_cost, line_total, notes
          ) VALUES ${placeholders.join(', ')}
        `, values);
        
        successful += batch.length;
        processed += batch.length;
        
        if (processed % 10000 === 0) {
          console.log(`Loaded ${currentCount + processed}/${records.length} total items...`);
        }
        
      } catch (error) {
        console.error(`Batch failed at ${currentCount + i}:`, error.message);
      }
    }
    
    const finalCount = await this.getCurrentItemCount();
    console.log(`Transfer items complete: ${finalCount} total records loaded`);
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
      console.log('=== Resuming Transfer Order Items Migration ===');
      
      const itemsLoaded = await this.loadRemainingItems();
      await this.updateTransferTotals();
      
      // Final verification
      const headerCount = await this.pool.query('SELECT COUNT(*) FROM transfer_orders');
      const itemCount = await this.pool.query('SELECT COUNT(*) FROM transfer_order_items');
      
      console.log('=== Migration Status ===');
      console.log(`Transfer Orders: ${headerCount.rows[0].count}`);
      console.log(`Transfer Items: ${itemCount.rows[0].count}`);
      
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      await this.pool.end();
    }
  }
}

const loader = new ResumeTransferItemsLoader();
loader.complete();