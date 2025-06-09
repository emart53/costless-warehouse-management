#!/usr/bin/env python3
"""
CostLessWarehouse ETL Migration Script
Maps authentic legacy data to PostgreSQL with exact field mappings
"""

import pyodbc
import psycopg2
import psycopg2.extras
import logging
import sys
import os
from datetime import datetime
import time
from urllib.parse import urlparse

class CostLessWarehouseETL:
    def __init__(self):
        self.setup_logging()
        
        # Your exact SQL Server configuration
        self.server = "SQL\\SQLEXPRESS"
        self.database = "CostLessWarehouse"
        
        self.sql_server_conn = None
        self.postgres_conn = None
        self.migration_stats = {}
        
        # Batch sizes optimized for your data volume
        self.batch_sizes = {
            'departments': 50,
            'categories': 100,
            'vendors': 500,
            'stores': 50,
            'products': 1000,
            'product_prices': 2000,
            'purchase_orders': 500,
            'purchase_order_items': 2000,
            'transfer_orders': 500,
            'transfer_order_items': 2000
        }

    def setup_logging(self):
        log_filename = f'costless_etl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
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
        """Connect using Windows Authentication and proper PostgreSQL connection"""
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

            # PostgreSQL connection with proper URL parsing
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise Exception("DATABASE_URL environment variable not set")
            
            # Parse the URL to extract components
            parsed = urlparse(database_url)
            
            self.postgres_conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path[1:],  # Remove leading slash
                user=parsed.username,
                password=parsed.password,
                sslmode='require',
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            self.postgres_conn.autocommit = False
            self.logger.info("Connected to PostgreSQL target database")

        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            raise

    def migrate_departments(self):
        """Migrate from Dept table"""
        self.logger.info("Migrating departments from Dept table...")
        
        # First insert a default department for orphaned categories
        cursor = self.postgres_conn.cursor()
        cursor.execute("""
            INSERT INTO departments (id, department_name, is_active, created_at, updated_at)
            VALUES (0, 'Unassigned', true, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (datetime.now(), datetime.now()))
        self.postgres_conn.commit()
        
        legacy_query = """
        SELECT 
            DeptId,
            Dept as DeptName
        FROM Dept
        ORDER BY DeptId
        """
        
        postgres_insert = """
        INSERT INTO departments (id, department_name, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            department_name = EXCLUDED.department_name,
            updated_at = EXCLUDED.updated_at
        """
        
        self._migrate_table_with_transform('departments', legacy_query, postgres_insert, self._transform_department)

    def _transform_department(self, row):
        """Transform department row"""
        return (
            row.DeptId,
            row.DeptName,
            True,
            datetime.now(),
            datetime.now()
        )

    def migrate_categories(self):
        """Migrate from Category table"""
        self.logger.info("Migrating categories from Category table...")
        
        legacy_query = """
        SELECT 
            ID,
            CatDesc,
            DeptId
        FROM Category
        ORDER BY ID
        """
        
        postgres_insert = """
        INSERT INTO categories (id, category_name, department_id, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            category_name = EXCLUDED.category_name,
            department_id = EXCLUDED.department_id,
            updated_at = EXCLUDED.updated_at
        """
        
        self._migrate_table_with_transform('categories', legacy_query, postgres_insert, self._transform_category)

    def _transform_category(self, row):
        """Transform category row"""
        return (
            row.ID,
            row.CatDesc,
            row.DeptId,
            True,
            datetime.now(),
            datetime.now()
        )

    def migrate_vendors(self):
        """Migrate from Vendor table"""
        self.logger.info("Migrating vendors from Vendor table...")
        
        legacy_query = """
        SELECT 
            VendorId,
            VendorAP,
            VendorName,
            Address1,
            Address2,
            City,
            State,
            Zip,
            Phone,
            FAX,
            Contact,
            Notes,
            Discount,
            EPDays,
            NetDays
        FROM Vendor
        ORDER BY VendorId
        """
        
        postgres_insert = """
        INSERT INTO vendors (
            code, name, contact_name, phone, address, city, state,
            zip_code, discount_percent, ep_days, net_days, is_active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table_with_transform('vendors', legacy_query, postgres_insert, self._transform_vendor)

    def _transform_vendor(self, row):
        """Transform vendor row"""
        address = row.Address1 or ''
        if row.Address2:
            address += f" {row.Address2}"
        
        vendor_code = row.VendorAP or str(row.VendorId)
        
        return (
            vendor_code,
            row.VendorName,
            row.Contact,
            row.Phone,
            address.strip(),
            row.City,
            row.State,
            row.Zip,
            float(row.Discount or 0),
            row.EPDays or 0,
            row.NetDays or 0,
            True
        )

    def migrate_stores(self):
        """Migrate from Stores table"""
        self.logger.info("Migrating stores from Stores table...")
        
        legacy_query = """
        SELECT 
            StoreID,
            [Store Name],
            [Store Number],
            Address1,
            Address2,
            City,
            State,
            Zip,
            Phone,
            FAX,
            email,
            StoreMgr,
            StoreType,
            Upcharge
        FROM Stores
        ORDER BY StoreID
        """
        
        postgres_insert = """
        INSERT INTO stores (
            store_number, name, address, city, state, zip_code,
            phone, manager_id, is_active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table_with_transform('stores', legacy_query, postgres_insert, self._transform_store)

    def _transform_store(self, row):
        """Transform store row"""
        address = row.Address1 or ''
        if row.Address2:
            address += f" {row.Address2}"
        
        return (
            str(getattr(row, 'Store Number')),
            getattr(row, 'Store Name'),
            address.strip(),
            row.City,
            row.State,
            row.Zip,
            row.Phone,
            None,
            True
        )

    def migrate_products(self):
        """Migrate from Products table with simplified structure"""
        self.logger.info("Migrating products from Products table...")
        
        legacy_query = """
        SELECT 
            ProductId,
            VendorId,
            VendorAP,
            UPC,
            [Product Description],
            CasePack,
            Size,
            Dept,
            Category,
            ShipPk,
            ShipCfg,
            ShipUnitCt,
            ShipConfigWt,
            ShipCaseQty,
            [WhseCase Cost],
            OffInvoice,
            BillBack,
            CRV,
            TransPk,
            TransCfg,
            TransUnitCt,
            TransConfigWt,
            TransCaseCost,
            TransCRV,
            RetailMult,
            [Retail Unit],
            [RedTag Retail],
            [Wall Of Value],
            Notes,
            ExpectedDate,
            TransCaseQty,
            IsActive,
            Disco
        FROM Products
        ORDER BY ProductId
        """
        
        postgres_insert = """
        INSERT INTO products (
            product_id, product_description, case_upc, case_pack,
            size, department_id, category_id, purchase_cost, off_invoice,
            bill_back, crv, purchase_weight, preferred_vendor_id, status
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table_with_transform('products', legacy_query, postgres_insert, self._transform_product)

    def _transform_product(self, row):
        """Transform product row without brand field"""
        if not row.IsActive:
            status = 'Inactive'
        elif row.Disco:
            status = 'Discontinued'
        else:
            status = 'Active'
        
        return (
            row.ProductId,
            getattr(row, 'Product Description'),
            row.UPC,
            int(row.CasePack or 1),
            row.Size,
            row.Dept,
            row.Category,
            float(getattr(row, 'WhseCase Cost') or 0),
            float(row.OffInvoice or 0),
            float(row.BillBack or 0),
            float(row.CRV or 0),
            float(row.ShipConfigWt or 0),
            row.VendorId,
            status
        )

    def migrate_product_pricing(self):
        """Create product pricing records from Products table"""
        self.logger.info("Creating product pricing from Products table...")
        
        legacy_query = """
        SELECT 
            ProductId,
            VendorId,
            [WhseCase Cost] as PurchaseCost,
            TransCaseCost as TransferCost,
            [Retail Unit] as RetailPrice,
            OffInvoice,
            BillBack,
            CRV
        FROM Products
        WHERE [WhseCase Cost] IS NOT NULL OR TransCaseCost IS NOT NULL OR [Retail Unit] IS NOT NULL
        ORDER BY ProductId
        """
        
        postgres_insert = """
        INSERT INTO product_prices (
            product_id, vendor_id, effective_date, purchase_cost, transfer_cost,
            retail_price, off_invoice, bill_back, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table_with_transform('product_prices', legacy_query, postgres_insert, self._transform_product_pricing)

    def _transform_product_pricing(self, row):
        """Transform product pricing row"""
        return (
            row.ProductId,
            row.VendorId,
            datetime.now().date(),
            float(row.PurchaseCost or 0),
            float(row.TransferCost or 0),
            float(row.RetailPrice or 0),
            float(row.OffInvoice or 0),
            float(row.BillBack or 0),
            datetime.now()
        )

    def migrate_purchase_orders(self):
        """Migrate from PurchaseOrders table"""
        self.logger.info("Migrating purchase orders from PurchaseOrders table...")
        
        legacy_query = """
        SELECT 
            POID,
            PODate,
            VendorID,
            Fee1,
            BackHaul,
            DeductBH,
            LumpSum,
            DeductLump,
            ExpectedDelivery,
            Received,
            SpecIns,
            Notes,
            BillTo,
            ShipTo,
            DeductBB
        FROM PurchaseOrders
        WHERE POID > 20955
        ORDER BY PODate, POID
        """
        
        postgres_insert = """
        INSERT INTO purchase_orders (
            purchase_order_number, vendor_id, order_date, expected_delivery_date,
            status, notes, bill_to_id, ship_to_id, fee1, lump_sum_fee, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table_with_transform('purchase_orders', legacy_query, postgres_insert, self._transform_purchase_order)

    def _transform_purchase_order(self, row):
        """Transform purchase order row"""
        status = 'RECEIVED' if row.Received else 'PENDING'
        po_number = f"PO{row.POID:05d}"
        
        return (
            po_number,
            row.VendorID,
            row.PODate,
            row.ExpectedDelivery,
            status,
            row.Notes,
            row.BillTo,
            row.ShipTo,
            float(row.Fee1 or 0),
            float(row.LumpSum or 0),
            row.PODate or datetime.now()
        )

    def migrate_transfer_orders(self):
        """Migrate from Transfers table"""
        self.logger.info("Migrating transfer orders from Transfers table...")
        
        legacy_query = """
        SELECT 
            TransferID,
            TransferDate,
            ExpectedDelivery,
            Received,
            SpecIns,
            TransferFrom,
            TransferTo,
            Upcharge,
            Dept
        FROM Transfers
        ORDER BY TransferDate, TransferID
        """
        
        postgres_insert = """
        INSERT INTO transfer_orders (
            transfer_number, store_id, order_date, delivery_date, status,
            notes, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table_with_transform('transfer_orders', legacy_query, postgres_insert, self._transform_transfer_order)

    def _transform_transfer_order(self, row):
        """Transform transfer order row"""
        status = 'delivered' if row.Received else 'pending'
        transfer_number = f"TR{row.TransferID:05d}"
        
        return (
            transfer_number,
            row.TransferTo,
            row.TransferDate,
            row.ExpectedDelivery,
            status,
            row.SpecIns,
            row.TransferDate or datetime.now()
        )

    def migrate_transfer_order_items(self):
        """Migrate from TransProducts table"""
        self.logger.info("Migrating transfer order items from TransProducts table...")
        
        legacy_query = """
        SELECT 
            tp.TransProductID,
            tp.TransId,
            tp.ProductID,
            tp.TransQty,
            tp.TransCfg,
            tp.TransCost,
            tp.TransCRV,
            tp.TransConfigWt,
            tp.TransCaseQty,
            t.TransferID
        FROM TransProducts tp
        INNER JOIN Transfers t ON tp.TransId = t.TransferID
        ORDER BY t.TransferDate, tp.TransId, tp.TransProductID
        """
        
        postgres_insert = """
        INSERT INTO transfer_order_items (
            transfer_id, product_id, quantity_ordered, unit_cost,
            crv_per_unit, transfer_cfg, transfer_weight, transfer_case_qty,
            csv_product_transfer_id
        ) VALUES (
            (SELECT id FROM transfer_orders WHERE transfer_number = %s),
            %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table_with_transform('transfer_order_items', legacy_query, postgres_insert, self._transform_transfer_order_item)

    def _transform_transfer_order_item(self, row):
        """Transform transfer order item row"""
        transfer_number = f"TR{row.TransferID:05d}"
        
        return (
            transfer_number,
            row.ProductID,
            row.TransQty or 0,
            float(row.TransCost or 0),
            float(row.TransCRV or 0),
            row.TransCfg,
            float(row.TransConfigWt or 0),
            row.TransCaseQty or 0,
            row.TransProductID
        )

    def _migrate_table_with_transform(self, table_name, legacy_query, postgres_insert, transform_func):
        """Execute table migration with data transformation"""
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
                
                try:
                    transformed_data = transform_func(row)
                    batch.append(transformed_data)
                    
                    if len(batch) >= batch_size:
                        self._execute_batch(cursor_pg, postgres_insert, batch, table_name)
                        batch = []
                        
                        if self.migration_stats[table_name]['processed'] % 5000 == 0:
                            elapsed = time.time() - start_time
                            rate = self.migration_stats[table_name]['processed'] / elapsed
                            self.logger.info(f"{table_name}: {self.migration_stats[table_name]['processed']} processed ({rate:.1f} records/sec)")
                
                except Exception as e:
                    self.logger.error(f"Transform error for {table_name} row {self.migration_stats[table_name]['processed']}: {e}")
                    self.migration_stats[table_name]['errors'] += 1
            
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

    def _execute_batch(self, cursor, query, batch, table_name):
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
        """Execute complete migration"""
        start_time = time.time()
        
        self.logger.info("=" * 60)
        self.logger.info("COSTLESSWAREHOUSE ETL MIGRATION")
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
                'product_prices', 'products', 'stores', 'vendors',
                'categories', 'departments'
            ]
            for table in clear_tables:
                try:
                    cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
                except:
                    pass
            self.postgres_conn.commit()
            
            # Execute migration steps
            migration_steps = [
                ('departments', self.migrate_departments),
                ('categories', self.migrate_categories),
                ('vendors', self.migrate_vendors),
                ('stores', self.migrate_stores),
                ('products', self.migrate_products),
                ('product_prices', self.migrate_product_pricing),
                ('purchase_orders', self.migrate_purchase_orders),
                ('transfer_orders', self.migrate_transfer_orders),
                ('transfer_order_items', self.migrate_transfer_order_items)
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
    
    print("CostLessWarehouse ETL Migration")
    print("This will migrate your complete legacy dataset")
    print("Source: CostLessWarehouse on SQL\\SQLEXPRESS")
    
    response = input("Ready to proceed? (yes/no): ")
    if response.lower() != 'yes':
        print("Migration cancelled")
        sys.exit(0)
    
    etl = CostLessWarehouseETL()
    etl.run_complete_migration()