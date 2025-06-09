# Migration Plan: 9 Years Historical Data (2016-2025)

## Overview
This plan covers the complete migration of 9 years of grocery warehouse data from the legacy SQL Server system to the new PostgreSQL system, ensuring business continuity during the transition.

## Data Scope
- **Time Period**: 2016 - Present (9 years)
- **Expected Volume**: ~25,000 Purchase Orders, ~15,000 Transfer Orders
- **Critical Tables**: Products, Vendors, Purchase Orders, Transfer Orders, Inventory Transactions
- **Business Rule**: Maintain sequential PO numbering starting from historical sequence

## Migration Phases

### Phase 1: Schema Preparation & Numbering Safety
- [x] Updated PO sequence to start at 30000 (5000 buffer above estimated max)
- [x] Created ETL sync functions for ongoing production data
- [ ] Map legacy SQL Server schema to PostgreSQL schema
- [ ] Validate data types and constraints

### Phase 2: Historical Data Import
```sql
-- Step 1: Import Vendors (foundational data)
COPY vendors FROM 'legacy_vendors.csv' WITH CSV HEADER;

-- Step 2: Import Products with all historical pricing
COPY products FROM 'legacy_products.csv' WITH CSV HEADER;

-- Step 3: Import Purchase Orders (maintaining sequential numbering)
COPY purchase_orders FROM 'legacy_purchase_orders.csv' WITH CSV HEADER;

-- Step 4: Import Purchase Order Items
COPY purchase_order_items FROM 'legacy_purchase_order_items.csv' WITH CSV HEADER;

-- Step 5: Import Transfer Orders
COPY transfer_orders FROM 'legacy_transfer_orders.csv' WITH CSV HEADER;

-- Step 6: Import Transfer Order Items
COPY transfer_order_items FROM 'legacy_transfer_order_items.csv' WITH CSV HEADER;

-- Step 7: Import Historical Inventory Transactions
COPY transactions FROM 'legacy_transactions.csv' WITH CSV HEADER;
```

### Phase 3: Data Validation & Reconciliation
```sql
-- Validate Purchase Order totals
SELECT 
    COUNT(*) as total_pos,
    MIN(CAST(po_number AS INTEGER)) as min_po,
    MAX(CAST(po_number AS INTEGER)) as max_po,
    SUM(CAST(subtotal AS NUMERIC)) as total_value
FROM purchase_orders;

-- Validate Product counts
SELECT 
    COUNT(*) as total_products,
    COUNT(DISTINCT product_id) as unique_product_ids,
    COUNT(*) FILTER (WHERE discontinued_date IS NOT NULL) as discontinued_count
FROM products;

-- Validate Vendor relationships
SELECT 
    v.name,
    COUNT(po.id) as purchase_order_count,
    SUM(CAST(po.subtotal AS NUMERIC)) as total_spent
FROM vendors v
LEFT JOIN purchase_orders po ON v.id = po.vendor_id
GROUP BY v.id, v.name
ORDER BY total_spent DESC;
```

### Phase 4: Cutover Strategy

#### Pre-Cutover (1 week before)
1. **Final Data Sync**: Run complete ETL sync to capture all recent transactions
2. **User Training**: Train staff on new system interface (especially 10-key entry)
3. **Parallel Testing**: Run both systems in parallel for critical operations

#### Cutover Day
1. **6:00 AM**: Stop all new entries in legacy system
2. **6:15 AM**: Run final ETL sync to capture overnight transactions
3. **7:00 AM**: Update PO sequence to current production number + buffer
4. **8:00 AM**: Enable new system for production use
5. **8:30 AM**: Staff begin using new system for daily operations

#### Post-Cutover (first week)
1. **Daily Reconciliation**: Compare transaction totals between systems
2. **Performance Monitoring**: Ensure 10-key entry speed meets requirements
3. **User Support**: Address any workflow issues immediately

## Critical Success Factors

### 1. 10-Key Entry Performance
```typescript
// Frontend optimization for rapid entry
const handleProductEntry = (productId: string, quantity: string) => {
  // Immediate validation and auto-advance
  if (isValidProductId(productId)) {
    addToOrder(productId, quantity);
    focusNextField();
  }
};
```

### 2. Sequential Numbering Integrity
```sql
-- Ensure no gaps in PO numbering during migration
CREATE SEQUENCE po_number_seq START WITH 30000;

-- Function to get next PO number safely
CREATE OR REPLACE FUNCTION get_next_po_number()
RETURNS TEXT AS $$
BEGIN
    RETURN nextval('po_number_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;
```

### 3. Historical Reporting Continuity
- All historical purchase orders must remain queryable
- Vendor spending history must be preserved
- Product purchase patterns must be maintained
- Transfer cost calculations must match legacy system

## Data Export Requirements from Legacy System

### Required CSV Exports
1. **vendors.csv**: id, code, name, contact_name, email, phone, address, terms
2. **products.csv**: product_id, description, brand, size, case_pack, department
3. **purchase_order_header.csv**: po_number, vendor_id, order_date, status, total
4. **purchase_order_items.csv**: po_id, product_id, quantity, unit_cost, line_total
5. **product_purchases.csv**: product_id, vendor_id, case_cost, unit_cost, crv
6. **transfer_orders.csv**: transfer_number, store_id, order_date, status
7. **transfer_items.csv**: transfer_id, product_id, quantity, unit_cost
8. **inventory_transactions.csv**: transaction_date, product_id, location_id, quantity, type

### Export Validation Queries
```sql
-- Validate export completeness before migration
SELECT 
    'vendors' as table_name,
    COUNT(*) as record_count,
    MIN(created_date) as earliest_date,
    MAX(created_date) as latest_date
FROM vendors
UNION ALL
SELECT 'purchase_orders', COUNT(*), MIN(order_date), MAX(order_date) FROM purchase_orders
UNION ALL
SELECT 'products', COUNT(*), MIN(created_date), MAX(modified_date) FROM products;
```

## Risk Mitigation

### Data Loss Prevention
- Complete database backup before migration
- Parallel system testing for 1 week minimum
- Rollback plan with legacy system reactivation procedure

### Performance Requirements
- 10-key entry: < 200ms response time per product addition
- Purchase order loading: < 2 seconds for orders with 50+ items
- Search functionality: < 500ms for product/vendor searches

### Business Continuity
- Legacy system remains accessible (read-only) for 30 days post-cutover
- Daily reconciliation reports for first month
- Emergency procedures for system rollback if critical issues arise

## Timeline
- **Week 1-2**: Complete historical data export and validation
- **Week 3**: Import and validate data in new system
- **Week 4**: Parallel testing and user training
- **Week 5**: Cutover execution and monitoring

This migration preserves your 19-year operational history while enabling modern warehouse management capabilities.