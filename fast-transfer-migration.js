/**
 * Fast Transfer Order Migration - Efficient batch processing
 * Continues loading your authentic transfer order data
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

class FastTransferMigration {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.batchSize = 500; // Smaller batches for reliability
  }

  parseCSV(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, { 
      columns: true, 
      skip_empty_lines: true 
    });
  }

  parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const parts = dateStr.split(' ');
    const datePart = parts[0];
    const [month, day, year] = datePart.split('/');
    
    if (!month || !day || !year) return null;
    
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  async loadTransferHeadersBatch() {
    console.log('Loading remaining transfer order headers...');
    
    const headerPath = path.join(process.cwd(), 'attached_assets', 'transfer_header_1749144612951.csv');
    const records = this.parseCSV(headerPath);
    
    // Get already loaded transfer IDs
    const existingResult = await this.pool.query('SELECT id FROM transfer_orders');
    const existingIds = new Set(existingResult.rows.map(row => row.id));
    
    // Filter out already loaded records
    const newRecords = records.filter(record => 
      record.transfer_id && !existingIds.has(parseInt(record.transfer_id))
    );
    
    console.log(`Processing ${newRecords.length} new transfer headers in batches of ${this.batchSize}`);
    
    let processed = 0;
    let successful = 0;
    
    for (let i = 0; i < newRecords.length; i += this.batchSize) {
      const batch = newRecords.slice(i, i + this.batchSize);
      
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const record of batch) {
        const transferData = [
          parseInt(record.transfer_id),
          record.transfer_id,
          parseInt(record.destination_location_id || 1),
          this.parseDate(record.transfer_date),
          this.parseDate(record.transfer_date),
          this.parseDate(record.expected_delivery_date),
          record.status || 'Received',
          0, // total_items - will update later
          0, // total_cases - will update later
          record.special_instructions || '',
          1, // created_by
          new Date().toISOString()
        ];
        
        values.push(...transferData);
        placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10}, $${paramIndex+11})`);
        paramIndex += 12;
      }
      
      if (placeholders.length > 0) {
        try {
          await this.pool.query(`
            INSERT INTO transfer_orders (
              id, transfer_number, store_id, order_date, ship_date, 
              delivery_date, status, total_items, total_cases, notes, 
              created_by, created_at
            ) VALUES ${placeholders.join(', ')}
            ON CONFLICT (id) DO NOTHING
          `, values);
          
          successful += batch.length;
          processed += batch.length;
          
          if (processed % 2000 === 0) {
            console.log(`Processed ${processed}/${newRecords.length} transfer headers...`);
          }
          
        } catch (error) {
          console.error(`Batch failed at index ${i}:`, error.message);
        }
      }
    }
    
    console.log(`Transfer headers complete: ${successful} new records loaded`);
  }

  async loadTransferItemsBatch() {
    console.log('Loading transfer order items...');
    
    const itemsPath = path.join(process.cwd(), 'attached_assets', 'transfer_items_1749144612951.csv');
    const records = this.parseCSV(itemsPath);
    
    console.log(`Processing ${records.length} transfer items in batches of ${this.batchSize}`);
    
    // Clear existing items first
    await this.pool.query('DELETE FROM transfer_order_items');
    
    let processed = 0;
    let successful = 0;
    
    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const record of batch) {
        const itemData = [
          parseInt(record.transfer_id),
          parseInt(record.product_id),
          parseInt(record.quantity_ordered || 0),
          parseInt(record.quantity_shipped || 0),
          parseInt(record.quantity_received || 0),
          parseFloat(record.unit_cost || 0),
          parseFloat(record.line_total || 0),
          record.notes || ''
        ];
        
        values.push(...itemData);
        placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
        paramIndex += 8;
      }
      
      if (placeholders.length > 0) {
        try {
          await this.pool.query(`
            INSERT INTO transfer_order_items (
              transfer_id, product_id, quantity_ordered, quantity_shipped, 
              quantity_received, unit_cost, line_total, notes
            ) VALUES ${placeholders.join(', ')}
          `, values);
          
          successful += batch.length;
          processed += batch.length;
          
          if (processed % 5000 === 0) {
            console.log(`Processed ${processed}/${records.length} transfer items...`);
          }
          
        } catch (error) {
          console.error(`Items batch failed at index ${i}:`, error.message);
        }
      }
    }
    
    console.log(`Transfer items complete: ${successful} records loaded`);
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

  async executeMigration() {
    try {
      console.log('=== Fast Transfer Order Migration ===');
      
      await this.loadTransferHeadersBatch();
      await this.loadTransferItemsBatch();
      await this.updateTransferTotals();
      
      // Final verification
      const headerCount = await this.pool.query('SELECT COUNT(*) FROM transfer_orders');
      const itemCount = await this.pool.query('SELECT COUNT(*) FROM transfer_order_items');
      
      console.log('=== Migration Complete ===');
      console.log(`Transfer Orders: ${headerCount.rows[0].count}`);
      console.log(`Transfer Items: ${itemCount.rows[0].count}`);
      
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      await this.pool.end();
    }
  }
}

const migration = new FastTransferMigration();
migration.executeMigration();