/**
 * Analyze Inventory CSV Structure for Baseline Strategy
 * Parse the inventory extract to understand data patterns
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';

class InventoryAnalyzer {
  constructor() {
    this.data = [];
  }

  loadInventoryData() {
    const content = fs.readFileSync('./attached_assets/Inventory extract.csv', 'utf-8');
    this.data = parse(content, { 
      columns: true, 
      skip_empty_lines: true 
    });
    console.log(`Loaded ${this.data.length} inventory records`);
  }

  analyzeStructure() {
    console.log('\n=== Inventory Data Structure Analysis ===');
    
    // Analyze key fields
    const uniqueTransNumbers = new Set(this.data.map(r => r.TransNumber));
    const uniqueProducts = new Set(this.data.map(r => r.ProductID));
    const uniqueStoreIn = new Set(this.data.map(r => r.StoreInId));
    const uniqueStoreOut = new Set(this.data.map(r => r.StoreOutId));
    
    console.log(`Transfer Numbers: ${uniqueTransNumbers.size}`);
    console.log(`Unique Products: ${uniqueProducts.size}`);
    console.log(`Store In IDs: ${Array.from(uniqueStoreIn).sort()}`);
    console.log(`Store Out IDs: ${Array.from(uniqueStoreOut).sort()}`);
    
    // Analyze transaction patterns
    const transactionTypes = {};
    this.data.forEach(record => {
      const pattern = `${record.StoreInId}->${record.StoreOutId}`;
      transactionTypes[pattern] = (transactionTypes[pattern] || 0) + 1;
    });
    
    console.log('\n=== Transaction Flow Patterns ===');
    Object.entries(transactionTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([pattern, count]) => {
        console.log(`${pattern}: ${count} movements`);
      });

    // Analyze quantity and cost data
    const quantityStats = this.data.map(r => parseInt(r.TransQty) || 0);
    const costStats = this.data.map(r => parseFloat(r.TransCost) || 0);
    
    console.log('\n=== Quantity & Cost Analysis ===');
    console.log(`Quantity range: ${Math.min(...quantityStats)} to ${Math.max(...quantityStats)}`);
    console.log(`Cost range: $${Math.min(...costStats).toFixed(2)} to $${Math.max(...costStats).toFixed(2)}`);
    
    // Check for adjustment records
    const adjustments = this.data.filter(r => r.AdjId && r.AdjId !== '0');
    console.log(`Adjustment records: ${adjustments.length}`);
    
    return {
      totalRecords: this.data.length,
      uniqueTransfers: uniqueTransNumbers.size,
      uniqueProducts: uniqueProducts.size,
      storeInIds: Array.from(uniqueStoreIn).sort(),
      storeOutIds: Array.from(uniqueStoreOut).sort(),
      hasAdjustments: adjustments.length > 0
    };
  }

  // Calculate inventory impact by product for baseline strategy
  calculateProductActivity() {
    console.log('\n=== Product Activity Analysis ===');
    
    const productActivity = {};
    
    this.data.forEach(record => {
      const productId = record.ProductID;
      const quantity = parseInt(record.TransQty) || 0;
      const cost = parseFloat(record.TransCost) || 0;
      
      if (!productActivity[productId]) {
        productActivity[productId] = {
          totalMovements: 0,
          totalQuantity: 0,
          totalValue: 0,
          stores: new Set()
        };
      }
      
      productActivity[productId].totalMovements++;
      productActivity[productId].totalQuantity += quantity;
      productActivity[productId].totalValue += cost;
      productActivity[productId].stores.add(record.StoreInId);
      productActivity[productId].stores.add(record.StoreOutId);
    });
    
    // Convert sets to counts
    Object.keys(productActivity).forEach(productId => {
      productActivity[productId].storeCount = productActivity[productId].stores.size;
      delete productActivity[productId].stores;
    });
    
    // Show top active products
    const sortedProducts = Object.entries(productActivity)
      .sort(([,a], [,b]) => b.totalMovements - a.totalMovements)
      .slice(0, 10);
    
    console.log('Top 10 Most Active Products:');
    sortedProducts.forEach(([productId, stats]) => {
      console.log(`Product ${productId}: ${stats.totalMovements} movements, ${stats.totalQuantity} qty, $${stats.totalValue.toFixed(2)}, ${stats.storeCount} stores`);
    });
    
    return productActivity;
  }

  // Analyze store-to-store flow patterns for baseline calculation
  analyzeStoreFlows() {
    console.log('\n=== Store Flow Analysis for Baseline ===');
    
    const flows = {};
    
    this.data.forEach(record => {
      const storeIn = record.StoreInId;
      const storeOut = record.StoreOutId;
      const productId = record.ProductID;
      const quantity = parseInt(record.TransQty) || 0;
      
      const flowKey = `${storeIn}_${storeOut}_${productId}`;
      
      if (!flows[flowKey]) {
        flows[flowKey] = {
          storeIn,
          storeOut,
          productId,
          totalQuantity: 0,
          movements: 0
        };
      }
      
      flows[flowKey].totalQuantity += quantity;
      flows[flowKey].movements++;
    });
    
    // Analyze patterns
    const warehouseToStore = Object.values(flows).filter(f => f.storeIn === '1' && f.storeOut !== '1');
    const storeToWarehouse = Object.values(flows).filter(f => f.storeOut === '1' && f.storeIn !== '1');
    
    console.log(`Warehouse (1) to Stores: ${warehouseToStore.length} product flows`);
    console.log(`Stores to Warehouse (1): ${storeToWarehouse.length} product flows`);
    
    return flows;
  }

  run() {
    this.loadInventoryData();
    const structure = this.analyzeStructure();
    const productActivity = this.calculateProductActivity();
    const storeFlows = this.analyzeStoreFlows();
    
    console.log('\n=== Baseline Strategy Recommendations ===');
    console.log('1. This is a transaction-based inventory system');
    console.log('2. Store ID 1 appears to be the warehouse/distribution center');
    console.log('3. Movement patterns show store-to-store transfers via warehouse');
    console.log('4. To create 12/31/2021 baseline: calculate net position per product per location');
    console.log('5. Current data shows recent transfer movements only');
    console.log('\nNext step: Need complete inventory transaction history from SQL Server');
    
    return { structure, productActivity, storeFlows };
  }
}

const analyzer = new InventoryAnalyzer();
analyzer.run();