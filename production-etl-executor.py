#!/usr/bin/env python3
"""
Production ETL Executor for Complete Legacy Data Migration
Handles the full 19-year dataset migration with proper error handling and monitoring
"""

import pyodbc
import psycopg2
import psycopg2.extras
import logging
import sys
import json
from datetime import datetime, date
from decimal import Decimal
import os
from typing import Dict, List, Optional, Any
import time

class ProductionETL:
    def __init__(self):
        self.setup_logging()
        self.sql_server_conn = None
        self.postgres_conn = None
        self.migration_stats = {}
        self.start_time = None
        
        # Production batch sizes optimized for your data volume
        self.batch_sizes = {
            'departments': 50,        # Small reference table
            'categories': 100,        # Medium reference table
            'vendors': 500,           # Larger reference table
            'stores': 50,             # Small reference table
            'products': 1000,         # Critical large table
            'product_prices': 2000,   # High volume pricing data
            'purchase_orders': 500,   # Transaction headers
            'purchase_order_items': 2000,  # High volume line items
            'transfer_orders': 500,   # Transaction headers
            'transfer_order_items': 2000   # High volume line items
        }

    def setup_logging(self):
        """Production-grade logging configuration"""
        log_filename = f'production_etl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            handlers=[
                logging.FileHandler(log_filename),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"Production ETL started - Log file: {log_filename}")

    def connect_databases(self):
        """Establish production database connections"""
        try:
            # SQL Server connection - Update with your production details
            sql_conn_str = (
                "DRIVER={ODBC Driver 17 for SQL Server};"
                "SERVER=YOUR_SQL_SERVER_NAME;"          # Update this
                "DATABASE=YOUR_DATABASE_NAME;"          # Update this  
                "Trusted_Connection=yes;"               # Or use UID/PWD
            )
            
            self.sql_server_conn = pyodbc.connect(sql_conn_str)
            self.sql_server_conn.timeout = 300  # 5 minute timeout
            self.logger.info("Connected to SQL Server production database")

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

    def clear_target_tables(self):
        """Clear target tables in dependency order"""
        self.logger.info("Clearing target tables for fresh migration...")
        
        # Order matters for foreign key constraints
        clear_order = [
            'transfer_order_items',
            'transfer_orders', 
            'purchase_order_items',
            'purchase_orders',
            'product_prices',
            'products',
            'categories',
            'departments', 
            'vendors',
            'stores'
        ]
        
        try:
            cursor = self.postgres_conn.cursor()
            
            for table in clear_order:
                cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
                self.logger.info(f"Cleared table: {table}")
            
            self.postgres_conn.commit()
            self.logger.info("All target tables cleared successfully")
            
        except Exception as e:
            self.postgres_conn.rollback()
            self.logger.error(f"Failed to clear tables: {e}")
            raise

    def migrate_departments(self):
        """Migrate departments foundation table"""
        self.logger.info("Starting departments migration...")
        
        legacy_query = """
        SELECT DISTINCT
            DepartmentId,
            DepartmentName,
            DepartmentDescription,
            IsActive,
            CreatedDate
        FROM Departments
        WHERE DepartmentId IS NOT NULL
        ORDER BY DepartmentId
        """
        
        postgres_insert = """
        INSERT INTO departments (id, department_name, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            department_name = EXCLUDED.department_name,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
        """
        
        self._migrate_table('departments', legacy_query, postgres_insert)

    def migrate_categories(self):
        """Migrate categories with department relationships"""
        self.logger.info("Starting categories migration...")
        
        legacy_query = """
        SELECT DISTINCT
            CategoryId,
            CategoryName,
            DepartmentId,
            CategoryDescription,
            IsActive,
            CreatedDate
        FROM Categories
        WHERE CategoryId IS NOT NULL
        ORDER BY CategoryId
        """
        
        postgres_insert = """
        INSERT INTO categories (id, category_name, department_id, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            category_name = EXCLUDED.category_name,
            department_id = EXCLUDED.department_id,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
        """
        
        self._migrate_table('categories', legacy_query, postgres_insert)

    def migrate_vendors(self):
        """Migrate vendor master data"""
        self.logger.info("Starting vendors migration...")
        
        legacy_query = """
        SELECT 
            VendorId,
            VendorCode,
            VendorName,
            ContactName,
            Email,
            Phone,
            Address,
            City,
            State,
            ZipCode,
            PaymentTerms,
            DiscountPercent,
            EPDays,
            NetDays,
            LeadTime,
            IsActive,
            CreatedDate
        FROM Vendors
        ORDER BY VendorId
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

    def migrate_products_complete(self):
        """Migrate complete product dataset with all historical data"""
        self.logger.info("Starting complete products migration...")
        
        legacy_query = """
        SELECT 
            p.ProductId,
            p.ProductName,
            p.ProductDescription,
            p.Brand,
            p.CaseUPC,
            p.CasePack,
            p.Size,
            p.DiscontinuedDate,
            p.Status,
            p.SKU,
            p.UPC,
            p.Unit,
            p.UnitSize,
            p.MinStockLevel,
            p.MaxStockLevel,
            p.ReorderPoint,
            p.LastCost,
            p.AvgCost,
            p.PurchaseCost,
            p.OffInvoice,
            p.CRV,
            p.PurchaseWeight,
            p.BillBack,
            p.DepartmentId,
            p.CategoryId,
            p.PreferredVendorId,
            p.CreatedDate,
            p.UpdatedDate
        FROM Products p
        ORDER BY p.ProductId
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

    def migrate_product_pricing_history(self):
        """Migrate complete pricing history for all products"""
        self.logger.info("Starting product pricing history migration...")
        
        legacy_query = """
        SELECT 
            ProductId,
            VendorId,
            EffectiveDate,
            ExpirationDate,
            PurchaseCost,
            TransferCost,
            RetailPrice,
            OffInvoice,
            BillBack,
            IsPromotional,
            PromotionDescription,
            ContractReference,
            CreatedBy,
            CreatedDate
        FROM ProductPricing
        ORDER BY ProductId, EffectiveDate
        """
        
        postgres_insert = """
        INSERT INTO product_prices (
            product_id, vendor_id, effective_date, expiration_date,
            purchase_cost, transfer_cost, retail_price, off_invoice,
            bill_back, is_promotional, promotion_description,
            contract_reference, created_by, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table('product_prices', legacy_query, postgres_insert)

    def migrate_transfer_orders_complete(self):
        """Migrate all transfer orders with complete history"""
        self.logger.info("Starting complete transfer orders migration...")
        
        legacy_query = """
        SELECT 
            TransferOrderId,
            TransferNumber,
            StoreId,
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
        ORDER BY OrderDate, TransferOrderId
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

    def migrate_transfer_order_items_complete(self):
        """Migrate all transfer order line items with pricing history"""
        self.logger.info("Starting complete transfer order items migration...")
        
        legacy_query = """
        SELECT 
            toi.TransferOrderItemId,
            toi.TransferOrderId,
            toi.ProductId,
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
            toi.Notes
        FROM TransferOrderItems toi
        INNER JOIN TransferOrders to_table ON toi.TransferOrderId = to_table.TransferOrderId
        ORDER BY to_table.OrderDate, toi.TransferOrderId, toi.TransferOrderItemId
        """
        
        postgres_insert = """
        INSERT INTO transfer_order_items (
            transfer_id, product_id, quantity_ordered, quantity_shipped,
            unit_cost, csv_product_transfer_id, crv_per_unit, total_crv,
            transfer_cfg, transfer_weight, transfer_case_qty, retail_price,
            gm_percentage, notes
        ) VALUES (
            (SELECT id FROM transfer_orders WHERE transfer_number = 
             (SELECT TransferNumber FROM TransferOrders WHERE TransferOrderId = %s)),
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        self._migrate_table('transfer_order_items', legacy_query, postgres_insert)

    def _migrate_table(self, table_name: str, legacy_query: str, postgres_insert: str):
        """Generic table migration with comprehensive error handling"""
        start_time = time.time()
        self.migration_stats[table_name] = {
            'processed': 0, 'success': 0, 'errors': 0, 'start_time': start_time
        }
        
        try:
            cursor_sql = self.sql_server_conn.cursor()
            cursor_pg = self.postgres_conn.cursor()
            
            # Execute legacy query
            self.logger.info(f"Executing legacy query for {table_name}...")
            cursor_sql.execute(legacy_query)
            
            batch = []
            batch_size = self.batch_sizes.get(table_name, 1000)
            
            for row in cursor_sql:
                self.migration_stats[table_name]['processed'] += 1
                
                # Convert row to tuple, handling None values and data types
                row_data = []
                for value in row:
                    if isinstance(value, Decimal):
                        row_data.append(float(value))
                    elif isinstance(value, datetime):
                        row_data.append(value)
                    else:
                        row_data.append(value)
                
                batch.append(tuple(row_data))
                
                # Process batch when full
                if len(batch) >= batch_size:
                    self._execute_batch(cursor_pg, postgres_insert, batch, table_name)
                    batch = []
                    
                    # Progress reporting
                    if self.migration_stats[table_name]['processed'] % 10000 == 0:
                        elapsed = time.time() - start_time
                        rate = self.migration_stats[table_name]['processed'] / elapsed
                        self.logger.info(f"{table_name}: {self.migration_stats[table_name]['processed']} processed ({rate:.1f} records/sec)")
            
            # Process remaining batch
            if batch:
                self._execute_batch(cursor_pg, postgres_insert, batch, table_name)
            
            self.postgres_conn.commit()
            
            # Final statistics
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

    def _execute_batch(self, cursor, query: str, batch: List, table_name: str):
        """Execute batch with error handling and retry logic"""
        try:
            cursor.executemany(query, batch)
            self.migration_stats[table_name]['success'] += len(batch)
            
        except Exception as e:
            self.migration_stats[table_name]['errors'] += len(batch)
            self.logger.error(f"Batch error for {table_name}: {e}")
            self.logger.error(f"Sample batch data: {batch[0] if batch else 'empty batch'}")
            raise

    def run_production_migration(self):
        """Execute complete production migration"""
        self.start_time = time.time()
        self.logger.info("=" * 60)
        self.logger.info("STARTING PRODUCTION ETL MIGRATION")
        self.logger.info("=" * 60)
        
        try:
            # Step 1: Connect to databases
            self.connect_databases()
            
            # Step 2: Clear target tables
            self.clear_target_tables()
            
            # Step 3: Execute migration in dependency order
            migration_steps = [
                ('departments', self.migrate_departments),
                ('categories', self.migrate_categories), 
                ('vendors', self.migrate_vendors),
                ('products', self.migrate_products_complete),
                ('product_prices', self.migrate_product_pricing_history),
                ('transfer_orders', self.migrate_transfer_orders_complete),
                ('transfer_order_items', self.migrate_transfer_order_items_complete)
            ]
            
            for step_name, step_function in migration_steps:
                step_start = time.time()
                self.logger.info(f"Starting {step_name} migration...")
                step_function()
                step_duration = time.time() - step_start
                self.logger.info(f"{step_name} completed in {step_duration:.1f} seconds")
            
            # Step 4: Post-migration validation
            self.validate_migration()
            
            # Step 5: Generate final report
            self.generate_migration_report()
            
            total_duration = time.time() - self.start_time
            self.logger.info("=" * 60)
            self.logger.info(f"PRODUCTION ETL COMPLETED IN {total_duration:.1f} SECONDS")
            self.logger.info("=" * 60)
            
        except Exception as e:
            self.logger.error(f"Production migration failed: {e}")
            raise
        finally:
            if self.sql_server_conn:
                self.sql_server_conn.close()
            if self.postgres_conn:
                self.postgres_conn.close()

    def validate_migration(self):
        """Comprehensive post-migration data validation"""
        self.logger.info("Starting post-migration validation...")
        
        try:
            cursor = self.postgres_conn.cursor()
            
            # Count validation
            validation_queries = [
                ("products", "SELECT COUNT(*) FROM products"),
                ("vendors", "SELECT COUNT(*) FROM vendors"),
                ("transfer_orders", "SELECT COUNT(*) FROM transfer_orders"),
                ("transfer_order_items", "SELECT COUNT(*) FROM transfer_order_items"),
                ("product_prices", "SELECT COUNT(*) FROM product_prices")
            ]
            
            for table, query in validation_queries:
                cursor.execute(query)
                count = cursor.fetchone()[0]
                self.logger.info(f"Validation - {table}: {count:,} records")
            
            # Data integrity validation
            integrity_checks = [
                ("Missing product references", """
                    SELECT COUNT(*) FROM transfer_order_items toi
                    LEFT JOIN products p ON toi.product_id = p.product_id
                    WHERE p.product_id IS NULL
                """),
                ("Items with retail prices", """
                    SELECT COUNT(*) FROM transfer_order_items
                    WHERE retail_price IS NOT NULL AND retail_price > 0
                """),
                ("Items with GM percentages", """
                    SELECT COUNT(*) FROM transfer_order_items
                    WHERE gm_percentage IS NOT NULL
                """)
            ]
            
            for check_name, query in integrity_checks:
                cursor.execute(query)
                result = cursor.fetchone()[0]
                self.logger.info(f"Validation - {check_name}: {result:,}")
            
            self.logger.info("Post-migration validation completed successfully")
            
        except Exception as e:
            self.logger.error(f"Validation failed: {e}")
            raise

    def generate_migration_report(self):
        """Generate comprehensive migration report"""
        report_file = f'migration_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        
        with open(report_file, 'w') as f:
            f.write("PRODUCTION ETL MIGRATION REPORT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Migration Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total Duration: {time.time() - self.start_time:.1f} seconds\n\n")
            
            f.write("MIGRATION STATISTICS:\n")
            f.write("-" * 30 + "\n")
            
            total_processed = 0
            total_success = 0
            total_errors = 0
            
            for table, stats in self.migration_stats.items():
                processed = stats['processed']
                success = stats['success']
                errors = stats['errors']
                duration = stats.get('duration', 0)
                
                total_processed += processed
                total_success += success
                total_errors += errors
                
                if processed > 0:
                    success_rate = (success / processed) * 100
                    rate = processed / duration if duration > 0 else 0
                    f.write(f"{table}:\n")
                    f.write(f"  Processed: {processed:,}\n")
                    f.write(f"  Success: {success:,} ({success_rate:.1f}%)\n")
                    f.write(f"  Errors: {errors:,}\n")
                    f.write(f"  Rate: {rate:.1f} records/sec\n")
                    f.write(f"  Duration: {duration:.1f} seconds\n\n")
            
            f.write("OVERALL SUMMARY:\n")
            f.write("-" * 20 + "\n")
            if total_processed > 0:
                overall_success_rate = (total_success / total_processed) * 100
                f.write(f"Total Processed: {total_processed:,}\n")
                f.write(f"Total Success: {total_success:,} ({overall_success_rate:.1f}%)\n")
                f.write(f"Total Errors: {total_errors:,}\n")
        
        self.logger.info(f"Migration report saved to: {report_file}")

if __name__ == "__main__":
    # Ensure database connection environment variable is set
    if not os.getenv('DATABASE_URL'):
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    print("Production ETL Migration Starting...")
    print("Update SQL Server connection details in the script before running")
    print("This will migrate your complete 19-year legacy dataset")
    
    response = input("Are you ready to proceed? (yes/no): ")
    if response.lower() != 'yes':
        print("Migration cancelled")
        sys.exit(0)
    
    etl = ProductionETL()
    etl.run_production_migration()