# Complete ETL Migration Configuration Guide
## SQL Server to PostgreSQL Migration for Grocery Warehouse System

### Phase 1: Schema Discovery & Field Mapping

#### Step 1: Extract Complete Schema from SQL Server Management Studio

Run this query in SSMS to get your complete table structure:

```sql
-- Complete Schema Analysis Query
SELECT 
    t.TABLE_SCHEMA,
    t.TABLE_NAME,
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.NUMERIC_PRECISION,
    c.NUMERIC_SCALE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT,
    c.ORDINAL_POSITION,
    -- Get row counts
    (SELECT COUNT(*) 
     FROM INFORMATION_SCHEMA.TABLES t2 
     WHERE t2.TABLE_NAME = t.TABLE_NAME 
     AND t2.TABLE_SCHEMA = t.TABLE_SCHEMA) as ROW_COUNT_ESTIMATE
FROM INFORMATION_SCHEMA.TABLES t
INNER JOIN INFORMATION_SCHEMA.COLUMNS c 
    ON t.TABLE_NAME = c.TABLE_NAME 
    AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
WHERE t.TABLE_TYPE = 'BASE TABLE'
    AND t.TABLE_NAME IN (
        'Products', 'Vendors', 'Departments', 'Categories',
        'PurchaseOrders', 'PurchaseOrderItems',
        'TransferOrders', 'TransferOrderItems', 
        'Stores', 'Locations', 'ProductPricing',
        'Inventory', 'Transactions'
    )
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;
```

#### Step 2: Get Data Volume Analysis

```sql
-- Data Volume Analysis for Migration Planning
SELECT 
    TABLE_NAME,
    COUNT(*) as RECORD_COUNT,
    MIN(CreatedDate) as EARLIEST_RECORD,
    MAX(CreatedDate) as LATEST_RECORD
FROM (
    SELECT 'Products' as TABLE_NAME, CreatedDate FROM Products
    UNION ALL
    SELECT 'Vendors', CreatedDate FROM Vendors
    UNION ALL  
    SELECT 'PurchaseOrders', CreatedDate FROM PurchaseOrders
    UNION ALL
    SELECT 'TransferOrders', CreatedDate FROM TransferOrders
    UNION ALL
    SELECT 'PurchaseOrderItems', CreatedDate FROM PurchaseOrderItems
    UNION ALL
    SELECT 'TransferOrderItems', CreatedDate FROM TransferOrderItems
) data_analysis
GROUP BY TABLE_NAME
ORDER BY RECORD_COUNT DESC;
```

### Phase 2: Critical Field Mappings

#### Products Table Transformation
```sql
-- Legacy Products to PostgreSQL Products
-- Run this in SSMS to verify field availability
SELECT TOP 5
    ProductId,                    -- maps to: product_id
    ProductName,                  -- maps to: product_name  
    ProductDescription,           -- maps to: product_description
    Brand,                        -- maps to: brand
    CaseUPC,                      -- maps to: case_upc
    CasePack,                     -- maps to: case_pack
    Size,                         -- maps to: size
    Status,                       -- maps to: status
    SKU,                          -- maps to: sku
    UPC,                          -- maps to: upc
    DepartmentId,                 -- maps to: department_id
    CategoryId,                   -- maps to: category_id
    PreferredVendorId,            -- maps to: vendor_id
    DiscontinuedDate,             -- maps to: discontinued_date
    LastCost,                     -- maps to: last_cost
    PurchaseCost,                 -- maps to: purchase_cost
    OffInvoice,                   -- maps to: off_invoice
    BillBack,                     -- maps to: bill_back
    CRV,                          -- maps to: crv
    CreatedDate,                  -- maps to: created_at
    UpdatedDate                   -- maps to: updated_at
FROM Products
WHERE IsActive = 1
ORDER BY ProductId;
```

#### Transfer Orders with Joins
```sql
-- Transfer Orders with Store Information
SELECT TOP 5
    to_table.TransferOrderId,     -- maps to: id (auto-generated in PostgreSQL)
    to_table.TransferNumber,      -- maps to: transfer_number
    to_table.StoreId,             -- maps to: store_id
    s.StoreName,                  -- for validation only
    s.StoreNumber,                -- for validation only
    to_table.OrderDate,           -- maps to: order_date
    to_table.ShipDate,            -- maps to: ship_date
    to_table.DeliveryDate,        -- maps to: delivery_date
    to_table.Status,              -- maps to: status
    to_table.TotalItems,          -- maps to: total_items
    to_table.TotalCases,          -- maps to: total_cases
    to_table.Notes,               -- maps to: notes
    to_table.CreatedBy,           -- maps to: created_by
    to_table.CreatedDate          -- maps to: created_at
FROM TransferOrders to_table
LEFT JOIN Stores s ON to_table.StoreId = s.StoreId
ORDER BY to_table.OrderDate DESC;
```

#### Transfer Order Items with Product Details
```sql
-- Transfer Order Items with Product Information
SELECT TOP 5
    toi.TransferOrderItemId,      -- maps to: id (auto-generated)
    toi.TransferOrderId,          -- maps to: transfer_id
    toi.ProductId,                -- maps to: product_id
    p.ProductName,                -- for validation
    toi.QuantityOrdered,          -- maps to: quantity_ordered
    toi.QuantityShipped,          -- maps to: quantity_shipped
    toi.UnitCost,                 -- maps to: unit_cost
    toi.TransProductID,           -- maps to: csv_product_transfer_id
    toi.CRVPerUnit,               -- maps to: crv_per_unit
    toi.TotalCRV,                 -- maps to: total_crv
    toi.TransCfg,                 -- maps to: transfer_cfg
    toi.TransConfigWt,            -- maps to: transfer_weight
    toi.TransCaseQty,             -- maps to: transfer_case_qty
    toi.RetailPrice,              -- maps to: retail_price
    toi.GMPercentage,             -- maps to: gm_percentage
    toi.Notes                     -- maps to: notes
FROM TransferOrderItems toi
LEFT JOIN Products p ON toi.ProductId = p.ProductId
ORDER BY toi.TransferOrderId, toi.TransferOrderItemId;
```

### Phase 3: ETL Execution Strategy

#### Migration Order (Critical for Foreign Keys)
1. **Foundation Tables** (No dependencies):
   - Departments
   - Categories  
   - Vendors
   - Stores
   - Users

2. **Product Tables** (Depends on departments, categories, vendors):
   - Products
   - Product_Prices (historical pricing)

3. **Transaction Tables** (Depends on products, stores, users):
   - Purchase_Orders
   - Purchase_Order_Items
   - Transfer_Orders
   - Transfer_Order_Items

#### Batch Processing Configuration
```python
# Recommended batch sizes based on table complexity
BATCH_SIZES = {
    'vendors': 500,           # Simple reference data
    'departments': 100,       # Small reference table
    'categories': 200,        # Small reference table  
    'products': 1000,         # Large but critical
    'product_prices': 2000,   # High volume pricing history
    'transfer_orders': 500,   # Medium complexity
    'transfer_order_items': 2000,  # High volume line items
    'purchase_orders': 500,   # Medium complexity
    'purchase_order_items': 2000   # High volume line items
}
```

### Phase 4: Data Validation Queries

#### Post-Migration Validation
```sql
-- Run these in PostgreSQL after migration
-- Verify record counts match
SELECT 'products' as table_name, COUNT(*) as postgres_count FROM products
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors  
UNION ALL
SELECT 'transfer_orders', COUNT(*) FROM transfer_orders
UNION ALL
SELECT 'transfer_order_items', COUNT(*) FROM transfer_order_items
ORDER BY table_name;

-- Verify data integrity
SELECT 
    COUNT(*) as total_transfer_items,
    COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as items_with_products,
    COUNT(CASE WHEN retail_price IS NOT NULL THEN 1 END) as items_with_retail_price,
    COUNT(CASE WHEN gm_percentage IS NOT NULL THEN 1 END) as items_with_gm
FROM transfer_order_items;

-- Verify foreign key relationships
SELECT 
    'Missing Products' as issue_type,
    COUNT(*) as count
FROM transfer_order_items toi
LEFT JOIN products p ON toi.product_id = p.product_id
WHERE p.product_id IS NULL
UNION ALL
SELECT 
    'Missing Stores',
    COUNT(*)
FROM transfer_orders to_table
LEFT JOIN stores s ON to_table.store_id = s.id  
WHERE s.id IS NULL;
```

### Phase 5: Production Cutover Plan

#### Weekend Migration Window
```bash
# Friday 6 PM: Begin migration
1. Export final legacy data
2. Run complete ETL migration  
3. Validate data integrity
4. Test critical workflows

# Saturday: Full system testing
5. Test transfer order creation
6. Test pricing calculations
7. Test inventory movements
8. Performance testing

# Sunday: Final preparation  
9. Update sequences to prevent conflicts
10. Configure real-time sync
11. Train users on new system

# Monday 6 AM: Go live
12. Switch DNS/application routing
13. Monitor system performance
14. Provide user support
```

### Phase 6: Connection Configuration

Update your SQL Server connection details in the ETL scripts:

```python
# SQL Server Connection (Update with your details)
SQL_SERVER_CONN = {
    'server': 'YOUR_SQL_SERVER_NAME',
    'database': 'YOUR_DATABASE_NAME', 
    'username': 'YOUR_USERNAME',      # Or use Windows Auth
    'password': 'YOUR_PASSWORD',      # Or use Windows Auth
    'driver': '{ODBC Driver 17 for SQL Server}'
}

# For Windows Authentication:
# 'trusted_connection': 'yes'
```

### Next Steps

1. **Run Schema Analysis**: Execute the schema discovery queries in SSMS
2. **Verify Field Mappings**: Confirm all critical fields exist in your legacy system
3. **Update Connection Details**: Configure the ETL scripts with your SQL Server details
4. **Test Small Dataset**: Start with a single transfer order for validation
5. **Execute Full Migration**: Run complete ETL during planned maintenance window

This configuration ensures we migrate your authentic 19-year dataset with complete data integrity and proper field transformations.