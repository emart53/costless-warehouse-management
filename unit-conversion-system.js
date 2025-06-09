/**
 * Unit Conversion System for CostLessWarehouse
 * Handles conversion between purchase and transfer configurations
 * Resolves inventory calculation discrepancies caused by unit mismatches
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class UnitConversionSystem {
  constructor() {
    this.pool = pool;
  }

  async createConversionMappingTable() {
    console.log('Creating unit conversion mapping table...');
    
    await this.pool.query(`
      DROP TABLE IF EXISTS unit_conversion_factors CASCADE;
      
      CREATE TABLE unit_conversion_factors (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        purchase_config_id INTEGER,
        purchase_config_name VARCHAR(50),
        purchase_case_qty INTEGER,
        transfer_config_id INTEGER,
        transfer_config_name VARCHAR(50),
        transfer_case_qty INTEGER,
        conversion_factor DECIMAL(10,4) NOT NULL DEFAULT 1.0,
        conversion_direction VARCHAR(20) DEFAULT 'purchase_to_transfer',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_id, purchase_config_id, transfer_config_id)
      );
      
      CREATE INDEX idx_unit_conversion_product ON unit_conversion_factors(product_id);
      CREATE INDEX idx_unit_conversion_purchase_config ON unit_conversion_factors(purchase_config_id);
      CREATE INDEX idx_unit_conversion_transfer_config ON unit_conversion_factors(transfer_config_id);
    `);
    
    console.log('✓ Unit conversion mapping table created');
  }

  async createStandardConversionMatrix() {
    console.log('Creating standard warehouse conversion matrix...');
    
    // Standard warehouse unit conversions based on typical grocery operations
    const conversions = [
      { from: 'Pallet', to: 'Case', factor: 80, description: 'Standard pallet = 80 cases' },
      { from: 'Pallet', to: 'Layer', factor: 10, description: 'Standard pallet = 10 layers' },
      { from: 'Layer', to: 'Case', factor: 8, description: 'Standard layer = 8 cases' },
      { from: '1/2 Pallet', to: 'Case', factor: 40, description: 'Half pallet = 40 cases' },
      { from: '1/2 Pallet', to: 'Layer', factor: 5, description: 'Half pallet = 5 layers' },
      { from: '1/4 Pallet', to: 'Case', factor: 20, description: 'Quarter pallet = 20 cases' },
      { from: '2Layers', to: 'Case', factor: 16, description: '2 layers = 16 cases' },
      { from: '3Layers', to: 'Case', factor: 24, description: '3 layers = 24 cases' },
      { from: 'Case', to: 'Unit', factor: 12, description: 'Standard case = 12 units' },
      { from: 'Shipper', to: 'Case', factor: 6, description: 'Standard shipper = 6 cases' },
      { from: 'Module', to: 'Case', factor: 4, description: 'Standard module = 4 cases' }
    ];
    
    await this.pool.query(`
      DROP TABLE IF EXISTS standard_conversion_matrix CASCADE;
      
      CREATE TABLE standard_conversion_matrix (
        id SERIAL PRIMARY KEY,
        from_unit VARCHAR(50) NOT NULL,
        to_unit VARCHAR(50) NOT NULL,
        conversion_factor DECIMAL(10,4) NOT NULL,
        description TEXT,
        is_standard BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(from_unit, to_unit)
      );
    `);
    
    for (const conv of conversions) {
      await this.pool.query(`
        INSERT INTO standard_conversion_matrix (from_unit, to_unit, conversion_factor, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (from_unit, to_unit) DO UPDATE SET
          conversion_factor = EXCLUDED.conversion_factor,
          description = EXCLUDED.description
      `, [conv.from, conv.to, conv.factor, conv.description]);
      
      // Also create reverse conversion
      await this.pool.query(`
        INSERT INTO standard_conversion_matrix (from_unit, to_unit, conversion_factor, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (from_unit, to_unit) DO UPDATE SET
          conversion_factor = EXCLUDED.conversion_factor,
          description = EXCLUDED.description
      `, [conv.to, conv.from, (1.0 / conv.factor).toFixed(4), `Reverse: ${conv.description}`]);
    }
    
    console.log(`✓ Created ${conversions.length * 2} standard conversion mappings`);
  }

  async analyzeProductConversionPatterns() {
    console.log('Analyzing product-specific conversion patterns from authentic data...');
    
    // Analyze purchase order case quantities to infer product-specific conversions
    const purchasePatterns = await this.pool.query(`
      SELECT 
        poi.product_id,
        poi.purchase_cfg,
        c.configuration_name as purchase_unit,
        poi.purchase_case_qty,
        COUNT(*) as occurrences,
        AVG(poi.quantity_ordered) as avg_quantity,
        STRING_AGG(DISTINCT poi.quantity_ordered::text, ', ') as typical_quantities
      FROM purchase_order_items poi
      LEFT JOIN configurations c ON c.configuration_id = poi.purchase_cfg
      WHERE poi.purchase_case_qty IS NOT NULL 
        AND poi.purchase_case_qty > 0
        AND poi.quantity_ordered > 0
      GROUP BY poi.product_id, poi.purchase_cfg, c.configuration_name, poi.purchase_case_qty
      ORDER BY poi.product_id, occurrences DESC
    `);
    
    console.log(`Found ${purchasePatterns.rows.length} product-specific purchase patterns`);
    
    // Analyze implied conversion factors from case quantities
    const conversions = [];
    for (const pattern of purchasePatterns.rows) {
      const { product_id, purchase_unit, purchase_case_qty, avg_quantity } = pattern;
      
      if (purchase_unit && purchase_case_qty) {
        conversions.push({
          product_id,
          purchase_unit,
          purchase_case_qty,
          implied_conversion: purchase_case_qty,
          confidence: pattern.occurrences > 5 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
    
    console.log(`Identified ${conversions.length} product-specific conversion patterns`);
    return conversions;
  }

  async createInventoryEquivalentView() {
    console.log('Creating inventory equivalent view with unit conversions...');
    
    await this.pool.query(`
      DROP VIEW IF EXISTS inventory_movements_equivalent CASCADE;
      
      CREATE VIEW inventory_movements_equivalent AS
      WITH purchase_movements AS (
        SELECT 
          poi.product_id,
          'purchase' as movement_type,
          EXTRACT(YEAR FROM po.order_date) as movement_year,
          po.order_date as movement_date,
          
          -- Convert purchase quantities to equivalent cases
          CASE 
            WHEN poi.purchase_cfg = 2 AND poi.purchase_case_qty IS NOT NULL THEN 
              poi.quantity_ordered * poi.purchase_case_qty  -- Pallet to cases
            WHEN poi.purchase_cfg = 3 AND poi.purchase_case_qty IS NOT NULL THEN 
              poi.quantity_ordered * (poi.purchase_case_qty / 8.0)  -- Layer to cases (assuming 8 cases per layer)
            WHEN poi.purchase_cfg = 7 AND poi.purchase_case_qty IS NOT NULL THEN 
              poi.quantity_ordered * (poi.purchase_case_qty / 2.0)  -- Half pallet
            WHEN poi.purchase_cfg = 5 AND poi.purchase_case_qty IS NOT NULL THEN 
              poi.quantity_ordered * (poi.purchase_case_qty / 16.0)  -- 2 layers
            ELSE poi.quantity_ordered  -- Default: already in cases
          END as equivalent_cases,
          
          poi.quantity_ordered as original_quantity,
          poi.purchase_cfg::text as original_config,
          c.configuration_name as original_unit,
          poi.purchase_case_qty,
          poi.net_cost as unit_cost
        FROM purchase_order_items poi
        JOIN purchase_orders po ON po.id = poi.po_id
        LEFT JOIN configurations c ON c.configuration_id = poi.purchase_cfg
        WHERE poi.quantity_ordered > 0
      ),
      
      transfer_movements AS (
        SELECT 
          toi.product_id,
          'transfer_out' as movement_type,
          EXTRACT(YEAR FROM tor.order_date) as movement_year,
          tor.order_date as movement_date,
          
          -- Convert transfer quantities to equivalent cases  
          CASE 
            WHEN toi.transfer_cfg = 'Pallet' AND toi.transfer_case_qty IS NOT NULL THEN 
              toi.quantity_ordered * toi.transfer_case_qty
            WHEN toi.transfer_cfg = 'Layer' AND toi.transfer_case_qty IS NOT NULL THEN 
              toi.quantity_ordered * (toi.transfer_case_qty / 8.0)
            WHEN toi.transfer_cfg = '1/2 Pallet' AND toi.transfer_case_qty IS NOT NULL THEN 
              toi.quantity_ordered * (toi.transfer_case_qty / 2.0)
            ELSE toi.quantity_ordered  -- Default: already in cases
          END as equivalent_cases,
          
          toi.quantity_ordered as original_quantity,
          toi.transfer_cfg as original_config,
          toi.transfer_cfg as original_unit,
          toi.transfer_case_qty,
          toi.unit_cost
        FROM transfer_order_items toi
        JOIN transfer_orders tor ON tor.id = toi.transfer_id
        WHERE toi.quantity_ordered > 0
      )
      
      SELECT * FROM purchase_movements
      UNION ALL
      SELECT * FROM transfer_movements
      ORDER BY product_id, movement_year, movement_date;
    `);
    
    console.log('✓ Created inventory equivalent view with unit conversions');
  }

  async generateInventoryReconciliationReport() {
    console.log('Generating inventory reconciliation report with unit conversions...');
    
    const reconciliation = await this.pool.query(`
      WITH inventory_summary AS (
        SELECT 
          product_id,
          movement_year,
          SUM(CASE WHEN movement_type = 'purchase' THEN equivalent_cases ELSE 0 END) as total_purchased_cases,
          SUM(CASE WHEN movement_type = 'transfer_out' THEN equivalent_cases ELSE 0 END) as total_transferred_cases,
          SUM(CASE WHEN movement_type = 'purchase' THEN equivalent_cases ELSE -equivalent_cases END) as net_inventory_cases,
          COUNT(CASE WHEN movement_type = 'purchase' THEN 1 END) as purchase_transactions,
          COUNT(CASE WHEN movement_type = 'transfer_out' THEN 1 END) as transfer_transactions
        FROM inventory_movements_equivalent
        GROUP BY product_id, movement_year
      )
      SELECT 
        product_id,
        movement_year,
        total_purchased_cases,
        total_transferred_cases,
        net_inventory_cases,
        purchase_transactions,
        transfer_transactions,
        CASE 
          WHEN net_inventory_cases < 0 THEN 'NEGATIVE_INVENTORY'
          WHEN ABS(net_inventory_cases) < 1.0 THEN 'BALANCED'
          ELSE 'POSITIVE_INVENTORY'
        END as inventory_status
      FROM inventory_summary
      WHERE total_purchased_cases > 0 OR total_transferred_cases > 0
      ORDER BY ABS(net_inventory_cases) DESC, product_id
      LIMIT 50
    `);
    
    console.log('\n=== Inventory Reconciliation Report (Top 50 Products) ===');
    console.log('Product ID | Year | Purchased | Transferred | Net Cases | Status');
    console.log('-----------|------|-----------|-------------|-----------|--------');
    
    reconciliation.rows.forEach(row => {
      const purchased = Number(row.total_purchased_cases || 0).toFixed(1);
      const transferred = Number(row.total_transferred_cases || 0).toFixed(1);
      const net = Number(row.net_inventory_cases || 0).toFixed(1);
      
      console.log(`${row.product_id.toString().padEnd(10)} | ${row.movement_year} | ${purchased.padStart(9)} | ${transferred.padStart(11)} | ${net.padStart(9)} | ${row.inventory_status}`);
    });
    
    return reconciliation.rows;
  }

  async createConversionValidationReport() {
    console.log('\nGenerating conversion validation report...');
    
    const validation = await this.pool.query(`
      SELECT 
        movement_year,
        original_unit,
        COUNT(*) as transactions,
        AVG(equivalent_cases / NULLIF(original_quantity, 0)) as avg_conversion_factor,
        MIN(equivalent_cases / NULLIF(original_quantity, 0)) as min_conversion_factor,
        MAX(equivalent_cases / NULLIF(original_quantity, 0)) as max_conversion_factor
      FROM inventory_movements_equivalent
      WHERE original_quantity > 0 AND equivalent_cases > 0
      GROUP BY movement_year, original_unit
      ORDER BY movement_year DESC, original_unit
    `);
    
    console.log('\n=== Unit Conversion Validation ===');
    console.log('Year | Unit | Transactions | Avg Factor | Min Factor | Max Factor');
    console.log('-----|------|--------------|------------|------------|------------');
    
    validation.rows.forEach(row => {
      const avgFactor = Number(row.avg_conversion_factor || 0).toFixed(2);
      const minFactor = Number(row.min_conversion_factor || 0).toFixed(2);
      const maxFactor = Number(row.max_conversion_factor || 0).toFixed(2);
      
      console.log(`${row.movement_year} | ${(row.original_unit || 'Case').padEnd(8)} | ${row.transactions.toString().padStart(12)} | ${avgFactor.padStart(10)} | ${minFactor.padStart(10)} | ${maxFactor.padStart(10)}`);
    });
    
    return validation.rows;
  }

  async execute() {
    try {
      console.log('=== Unit Conversion System Implementation ===');
      console.log('Resolving purchase vs transfer unit mismatches for accurate inventory calculations');
      
      await this.createConversionMappingTable();
      await this.createStandardConversionMatrix();
      
      const productPatterns = await this.analyzeProductConversionPatterns();
      
      await this.createInventoryEquivalentView();
      
      const reconciliation = await this.generateInventoryReconciliationReport();
      const validation = await this.createConversionValidationReport();
      
      console.log('\n=== Unit Conversion System Summary ===');
      console.log(`✓ Standard conversion matrix created with common warehouse units`);
      console.log(`✓ Analyzed ${productPatterns.length} product-specific conversion patterns`);
      console.log(`✓ Created inventory equivalent view with unit conversions`);
      console.log(`✓ Generated reconciliation report for ${reconciliation.length} product-year combinations`);
      console.log(`✓ Unit conversion system ready for accurate inventory rollup calculations`);
      
      return {
        conversions_created: productPatterns.length,
        products_analyzed: reconciliation.length,
        validation_results: validation.length
      };
      
    } catch (error) {
      console.error('Unit conversion system implementation failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

const conversionSystem = new UnitConversionSystem();
conversionSystem.execute()
  .then(results => {
    console.log(`\n✓ Unit conversion system implemented successfully`);
    console.log(`✓ Resolved unit mismatches between purchase and transfer configurations`);
    console.log(`✓ Ready for accurate inventory rollup with equivalent unit calculations`);
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Unit conversion system failed:', error);
    process.exit(1);
  });