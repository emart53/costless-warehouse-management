#!/usr/bin/env python3
"""
Production ETL for SQL Server Express with Windows Authentication
Based on your existing extraction script pattern
"""

import pyodbc
import psycopg2
import psycopg2.extras
import csv
import os
import logging
import sys
from datetime import datetime
import time

class WindowsAuthETL:
    def __init__(self):
        self.setup_logging()
        
        # Your exact SQL Server configuration
        self.server = "SQL\\SQLEXPRESS"
        self.database = "CostLessWarehouse"
        
        self.sql_server_conn = None
        self.postgres_conn = None
        self.migration_stats = {}
        
        # Optimized batch sizes for your data volume
        self.batch_sizes = {
            'vendors': 500,
            'departments': 100,
            'categories': 200,
            'products': 1000,
            'product_prices': 2000,
            'purchase_orders': 500,
            'purchase_order_items': 2000,
            'transfer_orders': 500,
            'transfer_order_items': 2000
        }

    def setup_logging(self):
        log_filename = f'windows_auth_etl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_filename),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def connect_databases(self):
        """Connect using your exact Windows Authentication pattern"""
        try:
            # SQL Server connection with Windows Authentication
            sql_conn_str = (
                f"DRIVER={{SQL Server}};"
                f"SERVER={self.server};"
                f"DATABASE={self.database};"
                f"Trusted_Connection=yes;"
            )
            
            self.sql_server_conn = pyodbc.connect(sql_conn_str)
            self.logger.info(f"Connected to {self.database} on {self.server}")

            # PostgreSQL connection
            self.postgres_conn = psycopg2.connect(
                os.getenv('DATABASE_URL'),
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            self.postgres_conn.autocommit = False
            self.logger.info("Connected to PostgreSQL target database")

        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            raise

    def migrate_vendors_from_legacy(self):
        """Extract vendors using your legacy table structure"""
        self.logger.info("Starting vendors migration from legacy Vendor table...")
        
        # Your legacy Vendor table structure
        legacy_query = """
        SELECT 
            VendorID,
            VendorCode,
            VendorName,
            ContactName,
            Email,
            Phone,
            Address,
            City,
            State,
            Zip,
            PaymentTerms,
            Discount,
            EPDays,
            NetDays,
            LeadTime,
            IsActive,
            CreatedDate
        FROM Vendor
        ORDER BY VendorID
        """
        
        postgres_insert = """
        INSERT INTO vendors (
            code, name, contact_name, email, phone, address, city, state,
            zip_code, payment_terms, discount_percent, ep_days, net_days,
            lead_time, is_active, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            contact_name = EXCLUDED.contact_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip_code = EXCLUDED.zip_code,
            payment_terms = EXCLUDED.payment_terms,
            discount_percent = EXCLUDED.discount_percent,
            ep_days = EXCLUDED.ep_days,
            net_days = EXCLUDED.net_days,
            lead_time = EXCLUDED.lead_time,
            is_active = EXCLUDED.is_active
        """
        
        self._migrate_table('vendors', legacy_query, postgres_insert)

    def migrate_products_complete_legacy(self):
        """Migrate products from your actual legacy Products table"""
        self.logger.info("Starting complete products migration from legacy Products table...")
        
        # Based on your actual Products table structure
        legacy_query = """
        SELECT 
            ProductID,
            ProductName,
            ProductDescription,
            Brand,
            CaseUPC,
            CasePack,
            Size,
            DiscontinuedDate,
            Status,
            SKU,
            UPC,
            Unit,
            UnitSize,
            MinStockLevel,
            MaxStockLevel,
            ReorderPoint,
            LastCost,
            AvgCost,
            PurchaseCost,
            OffInvoice,
            CRV,
            PurchaseWeight,
            BillBack,
            DepartmentID,
            CategoryID,
            PreferredVendorID,
            CreatedDate,
            UpdatedDate
        FROM Products
        ORDER BY ProductID
        """
        
        postgres_insert = """
        INSERT INTO products (
            product_id, product_name, product_description, brand, case_upc,
            case_pack, size, discontinued_date, status, sku, upc, unit,
            unit_size, min_stock_level, max_stock_level, reorder_point,
            last_cost, avg_cost, purchase_cost, off_invoice, crv,
            purchase_weight, bill_back, department_id, category_id,
            preferred_vendor_id, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (product_id) DO UPDATE SET
            product_name = EXCLUDED.product_name,
            product_description = EXCLUDED.product_description,
            brand = EXCLUDED.brand,
            case_upc = EXCLUDED.case_upc,
            case_pack = EXCLUDED.case_pack,
            size = EXCLUDED.size,
            discontinued_date = EXCLUDED.discontinued_date,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        """
        
        self._migrate_table('products', legacy_query, postgres_insert)

    def migrate_purchase_orders_legacy(self):
        """Migrate purchase orders using your exact extraction pattern"""
        self.logger.info("Starting purchase orders migration from legacy PurchaseOrders table...")
        
        # Your exact header query pattern
        legacy_query = """
        SELECT
            p.POID                           AS purchase_order_id,
            p.PODate                         AS purchase_order_date,
            p.VendorID                       AS vendor_id,
            CASE WHEN p.Received = 1 THEN 'RECEIVED' ELSE 'PENDING' END AS status,
            p.Notes                          AS notes,
            p.BillTo                         AS bill_to_id,
            p.ShipTo                         AS ship_to_id,
            p.ExpectedDelivery               AS expected_delivery_date,
            COALESCE(p.Fee1, 0)              AS fee1,
            COALESCE(p.BackHaul, 0)          AS backhaul_fee,
            COALESCE(p.DeductBH, 0)          AS deduct_backhaul,
            COALESCE(p.LumpSum, 0)           AS lump_sum_fee,
            COALESCE(p.DeductLump, 0)        AS deduct_lump_sum,
            COALESCE(p.DeductBB, 0)          AS deduct_bill_back,
            COALESCE(v.Discount, 0)          AS discount,
            COALESCE(v.EPDays, 0)            AS ep_days,
            COALESCE(v.NetDays, 0)           AS net_days
        FROM PurchaseOrders p
        LEFT JOIN Vendor v ON p.VendorID = v.VendorID
        WHERE p.POID > 20955
        ORDER BY p.PODate, p.POID
        """
        
        postgres_insert = """
        INSERT INTO purchase_orders (
            purchase_order_number, vendor_id, order_date, expected_delivery_date,
            status, notes, bill_to_id, ship_to_id, fee1, lump_sum_fee,
            created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (purchase_order_number) DO UPDATE SET
            expected_delivery_date = EXCLUDED.expected_delivery_date,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes
        """
        
        self._migrate_table('purchase_orders', legacy_query, postgres_insert)

    def migrate_purchase_order_items_legacy(self):
        """Migrate PO items using your exact extraction pattern"""
        self.logger.info("Starting purchase order items migration from legacy POProducts table...")
        
        # Your exact item query pattern
        legacy_query = """
        SELECT
            pi.POProductID   AS purchase_order_item_id,
            pi.POID          AS purchase_order_id,
            pi.ProductID     AS product_id,
            pi.POQty         AS quantity,
            pi.WhseShipCfg   AS configuration_name,
            pi.WhseShipCost  AS purchase_cost,
            pi.OffInvoice    AS off_invoice,
            pi.BillBack      AS bill_back,
            pi.CRV           AS purchase_crv,
            pi.WhseShipWt    AS purchase_weight,
            pi.AddDate       AS created_at,
            pi.ShipCaseQty   AS purchase_case_qty
        FROM POProducts pi
        WHERE pi.POID > 20955
        ORDER BY pi.POID, pi.POProductID
        """
        
        postgres_insert = """
        INSERT INTO purchase_order_items (
            purchase_order_id, product_id, quantity, purchase_cost,
            off_invoice, bill_back, purchase_crv, purchase_weight,
            purchase_case_qty, notes, created_at
        ) VALUES (
            (SELECT id FROM purchase_orders WHERE purchase_order_number = %s),
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table('purchase_order_items', legacy_query, postgres_insert)

    def migrate_transfer_orders_legacy(self):
        """Migrate transfer orders from your legacy TransferOrders table"""
        self.logger.info("Starting transfer orders migration from legacy TransferOrders table...")
        
        # Assuming your legacy transfer orders structure
        legacy_query = """
        SELECT 
            TransferOrderID,
            TransferNumber,
            StoreID,
            OrderDate,
            ShipDate,
            DeliveryDate,
            Status,
            TotalItems,
            TotalCases,
            Notes,
            CreatedBy,
            CreatedDate
        FROM TransferOrders
        ORDER BY OrderDate, TransferOrderID
        """
        
        postgres_insert = """
        INSERT INTO transfer_orders (
            transfer_number, store_id, order_date, ship_date, delivery_date,
            status, total_items, total_cases, notes, created_by, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (transfer_number) DO UPDATE SET
            ship_date = EXCLUDED.ship_date,
            delivery_date = EXCLUDED.delivery_date,
            status = EXCLUDED.status,
            total_items = EXCLUDED.total_items,
            total_cases = EXCLUDED.total_cases,
            notes = EXCLUDED.notes
        """
        
        self._migrate_table('transfer_orders', legacy_query, postgres_insert)

    def migrate_transfer_order_items_legacy(self):
        """Migrate transfer order items from your legacy TransferOrderItems table"""
        self.logger.info("Starting transfer order items migration from legacy TransferOrderItems table...")
        
        # Assuming your legacy transfer order items structure
        legacy_query = """
        SELECT 
            toi.TransferOrderItemID,
            toi.TransferOrderID,
            toi.ProductID,
            toi.QuantityOrdered,
            toi.QuantityShipped,
            toi.UnitCost,
            toi.TransProductID,
            toi.CRVPerUnit,
            toi.TotalCRV,
            toi.TransCfg,
            toi.TransConfigWt,
            toi.TransCaseQty,
            toi.RetailPrice,
            toi.GMPercentage,
            toi.Notes,
            to_table.TransferNumber
        FROM TransferOrderItems toi
        INNER JOIN TransferOrders to_table ON toi.TransferOrderID = to_table.TransferOrderID
        ORDER BY to_table.OrderDate, toi.TransferOrderID, toi.TransferOrderItemID
        """
        
        postgres_insert = """
        INSERT INTO transfer_order_items (
            transfer_id, product_id, quantity_ordered, quantity_shipped,
            unit_cost, csv_product_transfer_id, crv_per_unit, total_crv,
            transfer_cfg, transfer_weight, transfer_case_qty, retail_price,
            gm_percentage, notes
        ) VALUES (
            (SELECT id FROM transfer_orders WHERE transfer_number = %s),
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table('transfer_order_items', legacy_query, postgres_insert)

    def _migrate_table(self, table_name: str, legacy_query: str, postgres_insert: str):
        """Execute table migration with batch processing and error handling"""
        start_time = time.time()
        self.migration_stats[table_name] = {
            'processed': 0, 'success': 0, 'errors': 0, 'start_time': start_time
        }
        
        try:
            cursor_sql = self.sql_server_conn.cursor()
            cursor_pg = self.postgres_conn.cursor()
            
            self.logger.info(f"Executing legacy query for {table_name}...")
            cursor_sql.execute(legacy_query)
            
            batch = []
            batch_size = self.batch_sizes.get(table_name, 1000)
            
            for row in cursor_sql:
                self.migration_stats[table_name]['processed'] += 1
                
                # Convert row to tuple, handling data types
                row_data = []
                for value in row:
                    if value is None:
                        row_data.append(None)
                    elif hasattr(value, 'total_seconds'):  # datetime.timedelta
                        row_data.append(float(value.total_seconds()))
                    else:
                        row_data.append(value)
                
                batch.append(tuple(row_data))
                
                if len(batch) >= batch_size:
                    self._execute_batch(cursor_pg, postgres_insert, batch, table_name)
                    batch = []
                    
                    # Progress reporting
                    if self.migration_stats[table_name]['processed'] % 5000 == 0:
                        elapsed = time.time() - start_time
                        rate = self.migration_stats[table_name]['processed'] / elapsed
                        self.logger.info(f"{table_name}: {self.migration_stats[table_name]['processed']} processed ({rate:.1f} records/sec)")
            
            # Process remaining batch
            if batch:
                self._execute_batch(cursor_pg, postgres_insert, batch, table_name)
            
            self.postgres_conn.commit()
            
            elapsed = time.time() - start_time
            self.migration_stats[table_name]['duration'] = elapsed
            
            self.logger.info(f"{table_name} migration completed:")
            self.logger.info(f"  Processed: {self.migration_stats[table_name]['processed']}")
            self.logger.info(f"  Success: {self.migration_stats[table_name]['success']}")
            self.logger.info(f"  Errors: {self.migration_stats[table_name]['errors']}")
            self.logger.info(f"  Duration: {elapsed:.1f} seconds")
            
        except Exception as e:
            self.postgres_conn.rollback()
            self.logger.error(f"{table_name} migration failed: {e}")
            raise

    def _execute_batch(self, cursor, query: str, batch: list, table_name: str):
        """Execute batch with error handling"""
        try:
            cursor.executemany(query, batch)
            self.migration_stats[table_name]['success'] += len(batch)
            
        except Exception as e:
            self.migration_stats[table_name]['errors'] += len(batch)
            self.logger.error(f"Batch error for {table_name}: {e}")
            if batch:
                self.logger.error(f"Sample data: {batch[0]}")
            raise

    def run_complete_migration(self):
        """Execute complete migration using Windows Authentication"""
        start_time = time.time()
        
        self.logger.info("=" * 60)
        self.logger.info("STARTING WINDOWS AUTH ETL MIGRATION")
        self.logger.info(f"Source: {self.database} on {self.server}")
        self.logger.info("=" * 60)
        
        try:
            self.connect_databases()
            
            # Clear existing data
            self.logger.info("Clearing target tables...")
            cursor = self.postgres_conn.cursor()
            clear_tables = [
                'transfer_order_items', 'transfer_orders',
                'purchase_order_items', 'purchase_orders',
                'product_prices', 'products', 'vendors'
            ]
            for table in clear_tables:
                cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
            self.postgres_conn.commit()
            
            # Execute migration steps
            migration_steps = [
                ('vendors', self.migrate_vendors_from_legacy),
                ('products', self.migrate_products_complete_legacy),
                ('purchase_orders', self.migrate_purchase_orders_legacy),
                ('purchase_order_items', self.migrate_purchase_order_items_legacy),
                ('transfer_orders', self.migrate_transfer_orders_legacy),
                ('transfer_order_items', self.migrate_transfer_order_items_legacy)
            ]
            
            for step_name, step_function in migration_steps:
                step_start = time.time()
                self.logger.info(f"Starting {step_name} migration...")
                step_function()
                step_duration = time.time() - step_start
                self.logger.info(f"{step_name} completed in {step_duration:.1f} seconds")
            
            total_duration = time.time() - start_time
            self.logger.info("=" * 60)
            self.logger.info(f"MIGRATION COMPLETED IN {total_duration:.1f} SECONDS")
            self.logger.info("=" * 60)
            
            # Generate summary
            self._generate_summary()
            
        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            raise
        finally:
            if self.sql_server_conn:
                self.sql_server_conn.close()
            if self.postgres_conn:
                self.postgres_conn.close()

    def _generate_summary(self):
        """Generate migration summary"""
        self.logger.info("MIGRATION SUMMARY:")
        total_processed = sum(stats['processed'] for stats in self.migration_stats.values())
        total_success = sum(stats['success'] for stats in self.migration_stats.values())
        total_errors = sum(stats['errors'] for stats in self.migration_stats.values())
        
        for table, stats in self.migration_stats.items():
            if stats['processed'] > 0:
                success_rate = (stats['success'] / stats['processed']) * 100
                self.logger.info(f"  {table}: {stats['processed']} processed, {success_rate:.1f}% success")
        
        if total_processed > 0:
            overall_rate = (total_success / total_processed) * 100
            self.logger.info(f"TOTAL: {total_processed} processed, {overall_rate:.1f}% success")

if __name__ == "__main__":
    if not os.getenv('DATABASE_URL'):
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    print("Windows Authentication ETL Migration")
    print(f"Source: CostLessWarehouse on SQL\\SQLEXPRESS")
    print("This will migrate your complete legacy dataset")
    
    response = input("Ready to proceed? (yes/no): ")
    if response.lower() != 'yes':
        print("Migration cancelled")
        sys.exit(0)
    
    etl = WindowsAuthETL()
    etl.run_complete_migration()