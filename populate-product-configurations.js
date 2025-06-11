/**
 * Populate Product Configuration IDs from Authentic CostLessWarehouse Data
 * Uses the shipping configuration data to assign proper configuration_id to each product
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

class ConfigurationPopulator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  parseConfigurationData(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const records = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 3) {
        records.push({
          productId: parseInt(parts[0]),
          shipCfg: parts[2] // ShipCfg column
        });
      }
    }
    
    console.log(`Parsed ${records.length} configuration records`);
    return records;
  }

  async getConfigurationMappings() {
    const result = await this.pool.query(
      'SELECT configuration_id, configuration_name FROM configurations ORDER BY configuration_id'
    );
    
    const mappings = {};
    result.rows.forEach(row => {
      mappings[row.configuration_name] = row.configuration_id;
    });
    
    console.log('Available configurations:', Object.keys(mappings));
    return mappings;
  }

  async updateProductConfigurations(configData, configMappings) {
    let updated = 0;
    let notFound = 0;
    const batchSize = 100;
    
    for (let i = 0; i < configData.length; i += batchSize) {
      const batch = configData.slice(i, i + batchSize);
      
      for (const record of batch) {
        const configId = configMappings[record.shipCfg];
        
        if (configId) {
          await this.pool.query(
            'UPDATE products SET configuration_id = $1 WHERE product_id = $2',
            [configId, record.productId]
          );
          updated++;
        } else {
          console.log(`Configuration not found: ${record.shipCfg} for product ${record.productId}`);
          notFound++;
        }
      }
      
      console.log(`Processed batch ${Math.floor(i/batchSize) + 1}, updated: ${updated}, not found: ${notFound}`);
    }
    
    return { updated, notFound };
  }

  async verifyResults() {
    const totalProducts = await this.pool.query('SELECT COUNT(*) FROM products');
    const configuredProducts = await this.pool.query('SELECT COUNT(*) FROM products WHERE configuration_id IS NOT NULL');
    
    console.log(`Total products: ${totalProducts.rows[0].count}`);
    console.log(`Products with configurations: ${configuredProducts.rows[0].count}`);
    
    // Show configuration distribution
    const distribution = await this.pool.query(`
      SELECT c.configuration_name, COUNT(*) as product_count
      FROM products p
      JOIN configurations c ON p.configuration_id = c.configuration_id
      GROUP BY c.configuration_name
      ORDER BY product_count DESC
    `);
    
    console.log('\nConfiguration distribution:');
    distribution.rows.forEach(row => {
      console.log(`  ${row.configuration_name}: ${row.product_count} products`);
    });
  }

  async execute() {
    try {
      console.log('Starting product configuration population...');
      
      // Parse the authentic configuration data
      const configData = this.parseConfigurationData(
        'attached_assets/Pasted-ProductId-ShipPk-ShipCfg-ShipUnitCt-ShipConfigWt-ShipCaseQty-TransPk-TransCfg-TransUnitCt-TransConfi-1749241689604.txt'
      );
      
      // Get configuration mappings from database
      const configMappings = await this.getConfigurationMappings();
      
      // Update products with configuration IDs
      const results = await this.updateProductConfigurations(configData, configMappings);
      
      console.log(`\nConfiguration update completed:`);
      console.log(`  Updated: ${results.updated} products`);
      console.log(`  Not found: ${results.notFound} configurations`);
      
      // Verify results
      await this.verifyResults();
      
    } catch (error) {
      console.error('Error during configuration population:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// Execute the population
const populator = new ConfigurationPopulator();
populator.execute();