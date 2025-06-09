# CostLessWarehouse Data Export Instructions

## Step 1: Execute SQL Queries
1. Open SQL Server Management Studio
2. Connect to your SQL\SQLEXPRESS instance
3. Use the CostLessWarehouse database
4. Execute each .sql file in this folder
5. Save results as CSV files with column headers

## Step 2: Export Order
Execute queries in this order to maintain referential integrity:
1. departments_export.sql → save as departments.csv
2. categories_export.sql → save as categories.csv  
3. vendors_export.sql → save as vendors.csv
4. stores_export.sql → save as stores.csv
5. products_export.sql → save as products.csv
6. transfer_orders_export.sql → save as transfer_orders.csv
7. transfer_order_items_export.sql → save as transfer_order_items.csv

## Step 3: Load into PostgreSQL
After exporting all CSV files, run:
```bash
python sql-server-migration-kit.py --load-csv
```

This will load your complete 19-year dataset into the PostgreSQL system.
