# CostLessWarehouse Database Schema Documentation

## Field Categories

### Original CostLessWarehouse Fields (Your 19-Year Business Data)
These fields contain your authentic legacy data from SQL Server:

- **product_id**: Your original product identifier
- **product_description**: Your authentic product descriptions  
- **vendor_id**: Original vendor assignments (now consolidated)
- **purchase_cost**: Your actual purchase costs
- **off_invoice**: Your off-invoice allowances
- **bill_back**: Your bill-back allowances
- **case_pack**: Original case pack quantities
- **size**: Original product sizes
- **category_id**: Your department/category structure
- **department_id**: Your organizational structure

### Added PostgreSQL Fields for Enhanced Functionality

#### Inventory Management Fields
- **preferred_vendor_id**: Alternative vendor (consolidated back to vendor_id)
- **min_stock_level**: Minimum inventory before reorder alerts
- **max_stock_level**: Maximum inventory for space management
- **reorder_point**: Automatic reorder trigger level

*Purpose*: Enable automated inventory management, low stock alerts, and reorder calculations

#### System Tracking Fields  
- **id**: Auto-increment primary key for database relationships
- **created_at**: Record creation timestamp
- **updated_at**: Last modification timestamp

*Purpose*: Audit trails, data synchronization, and system integrity

#### Modern Commerce Fields
- **sku**: Stock keeping unit for barcode systems
- **upc**: Universal product code for scanning
- **name**: Simplified product name (duplicates product_description)
- **description**: Alternative description field

*Purpose*: E-commerce integration, barcode scanning, online catalog systems

#### Configuration Fields
- **configuration_id**: Links to unit conversion configurations
- **purchase_weight**: Weight data for shipping calculations
- **crv**: California Redemption Value for beverage containers

*Purpose*: Unit conversions, shipping calculations, regulatory compliance

## Data Consolidation Status
- Vendor assignments consolidated from preferred_vendor_id back to vendor_id
- 44 products now have proper vendor assignments (Shasta products, etc.)
- 2,874 products remain without vendor assignments (as in original system)