#!/usr/bin/env python3
"""
SQL Server Schema Analysis and ETL Configuration Generator
Connects to your legacy SQL Server to extract actual table schemas
and generate precise field mappings for PostgreSQL migration
"""

import pyodbc
import psycopg2
import json
import logging
from datetime import datetime
import os

class SchemaMapper:
    def __init__(self):
        self.setup_logging()
        self.sql_server_conn = None
        self.postgres_conn = None
        self.schema_mapping = {}
        
    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'schema_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def connect_sql_server(self):
        """Connect to your SQL Server instance"""
        try:
            # You'll need to provide these connection details
            conn_str = (
                "DRIVER={ODBC Driver 17 for SQL Server};"
                "SERVER=your-server-name;"  # Replace with your server
                "DATABASE=your-database-name;"  # Replace with your database
                "Trusted_Connection=yes;"  # Or use UID/PWD for SQL auth
            )
            
            self.sql_server_conn = pyodbc.connect(conn_str)
            self.logger.info("Connected to SQL Server successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"SQL Server connection failed: {e}")
            self.logger.info("Please update connection string with your SQL Server details")
            return False

    def analyze_legacy_tables(self):
        """Extract complete schema information from your legacy database"""
        if not self.sql_server_conn:
            self.logger.error("No SQL Server connection available")
            return
            
        # Key tables for grocery warehouse system
        critical_tables = [
            'Products', 'Vendors', 'Departments', 'Categories',
            'PurchaseOrders', 'PurchaseOrderItems', 
            'TransferOrders', 'TransferOrderItems',
            'Stores', 'Locations', 'Inventory',
            'ProductPricing', 'ProductTransfers'
        ]
        
        schema_info = {}
        cursor = self.sql_server_conn.cursor()
        
        for table in critical_tables:
            try:
                # Get table structure
                cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    CHARACTER_MAXIMUM_LENGTH,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    ORDINAL_POSITION
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
                """, table)
                
                columns = []
                for row in cursor.fetchall():
                    columns.append({
                        'name': row.COLUMN_NAME,
                        'data_type': row.DATA_TYPE,
                        'max_length': row.CHARACTER_MAXIMUM_LENGTH,
                        'nullable': row.IS_NULLABLE == 'YES',
                        'default': row.COLUMN_DEFAULT,
                        'position': row.ORDINAL_POSITION
                    })
                
                if columns:
                    schema_info[table] = {
                        'columns': columns,
                        'row_count': self.get_table_count(cursor, table)
                    }
                    self.logger.info(f"Analyzed {table}: {len(columns)} columns, {schema_info[table]['row_count']} rows")
                else:
                    self.logger.warning(f"Table {table} not found or empty")
                    
            except Exception as e:
                self.logger.error(f"Error analyzing table {table}: {e}")
        
        # Save schema analysis
        with open('legacy_schema_analysis.json', 'w') as f:
            json.dump(schema_info, f, indent=2, default=str)
        
        self.logger.info(f"Schema analysis saved to legacy_schema_analysis.json")
        return schema_info

    def get_table_count(self, cursor, table_name):
        """Get row count for table"""
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            return cursor.fetchone()[0]
        except:
            return 0

    def generate_field_mappings(self, schema_info):
        """Generate field mappings from legacy SQL Server to PostgreSQL"""
        
        # Define mapping rules for your specific system
        field_mappings = {
            'Products': {
                'postgres_table': 'products',
                'mappings': {
                    'ProductId': 'product_id',
                    'ProductName': 'product_name', 
                    'ProductDescription': 'product_description',
                    'Brand': 'brand',
                    'CaseUPC': 'case_upc',
                    'CasePack': 'case_pack',
                    'Size': 'size',
                    'DiscontinuedDate': 'discontinued_date',
                    'Status': 'status',
                    'SKU': 'sku',
                    'UPC': 'upc',
                    'Unit': 'unit',
                    'UnitSize': 'unit_size',
                    'MinStockLevel': 'min_stock_level',
                    'MaxStockLevel': 'max_stock_level',
                    'ReorderPoint': 'reorder_point',
                    'LastCost': 'last_cost',
                    'AvgCost': 'avg_cost',
                    'PurchaseCost': 'purchase_cost',
                    'OffInvoice': 'off_invoice',
                    'CRV': 'crv',
                    'PurchaseWeight': 'purchase_weight',
                    'BillBack': 'bill_back',
                    'DepartmentId': 'department_id',
                    'CategoryId': 'category_id',
                    'PreferredVendorId': 'vendor_id',
                    'CreatedDate': 'created_at',
                    'UpdatedDate': 'updated_at'
                }
            },
            'Vendors': {
                'postgres_table': 'vendors',
                'mappings': {
                    'VendorId': 'id',
                    'VendorCode': 'code',
                    'VendorName': 'name',
                    'ContactName': 'contact_name',
                    'Email': 'email',
                    'Phone': 'phone',
                    'Address': 'address',
                    'City': 'city',
                    'State': 'state',
                    'ZipCode': 'zip_code',
                    'PaymentTerms': 'payment_terms',
                    'DiscountPercent': 'discount_percent',
                    'EPDays': 'ep_days',
                    'NetDays': 'net_days',
                    'LeadTime': 'lead_time',
                    'IsActive': 'is_active',
                    'CreatedDate': 'created_at'
                }
            },
            'TransferOrders': {
                'postgres_table': 'transfer_orders',
                'mappings': {
                    'TransferOrderId': 'id',
                    'TransferNumber': 'transfer_number',
                    'StoreId': 'store_id',
                    'OrderDate': 'order_date',
                    'ShipDate': 'ship_date',
                    'DeliveryDate': 'delivery_date',
                    'Status': 'status',
                    'TotalItems': 'total_items',
                    'TotalCases': 'total_cases',
                    'Notes': 'notes',
                    'CreatedBy': 'created_by',
                    'CreatedDate': 'created_at'
                }
            },
            'TransferOrderItems': {
                'postgres_table': 'transfer_order_items',
                'mappings': {
                    'TransferOrderItemId': 'id',
                    'TransferOrderId': 'transfer_id',
                    'ProductId': 'product_id',
                    'QuantityOrdered': 'quantity_ordered',
                    'QuantityShipped': 'quantity_shipped',
                    'UnitCost': 'unit_cost',
                    'TransProductID': 'csv_product_transfer_id',
                    'CRVPerUnit': 'crv_per_unit',
                    'TotalCRV': 'total_crv',
                    'TransCfg': 'transfer_cfg',
                    'TransConfigWt': 'transfer_weight',
                    'TransCaseQty': 'transfer_case_qty',
                    'RetailPrice': 'retail_price',
                    'GMPercentage': 'gm_percentage',
                    'Notes': 'notes'
                }
            }
        }
        
        # Validate mappings against actual schema
        validated_mappings = {}
        for table, mapping_info in field_mappings.items():
            if table in schema_info:
                actual_columns = [col['name'] for col in schema_info[table]['columns']]
                mapped_columns = list(mapping_info['mappings'].keys())
                
                # Check for missing columns
                missing = set(mapped_columns) - set(actual_columns)
                extra = set(actual_columns) - set(mapped_columns)
                
                if missing:
                    self.logger.warning(f"{table} - Missing columns in schema: {missing}")
                if extra:
                    self.logger.info(f"{table} - Additional columns available: {extra}")
                
                validated_mappings[table] = mapping_info
                validated_mappings[table]['validation'] = {
                    'missing_columns': list(missing),
                    'extra_columns': list(extra),
                    'total_legacy_columns': len(actual_columns),
                    'mapped_columns': len(mapped_columns)
                }
        
        # Save field mappings
        with open('field_mappings.json', 'w') as f:
            json.dump(validated_mappings, f, indent=2)
        
        self.logger.info("Field mappings generated and saved to field_mappings.json")
        return validated_mappings

    def generate_etl_queries(self, field_mappings):
        """Generate SQL queries for ETL process"""
        
        etl_queries = {}
        
        for table, mapping_info in field_mappings.items():
            postgres_table = mapping_info['postgres_table']
            mappings = mapping_info['mappings']
            
            # Generate SELECT query for SQL Server
            legacy_columns = list(mappings.keys())
            select_query = f"""
            SELECT 
                {', '.join(legacy_columns)}
            FROM {table}
            ORDER BY {legacy_columns[0]}
            """
            
            # Generate INSERT query for PostgreSQL
            postgres_columns = list(mappings.values())
            placeholders = ', '.join(['%s'] * len(postgres_columns))
            insert_query = f"""
            INSERT INTO {postgres_table} (
                {', '.join(postgres_columns)}
            ) VALUES (
                {placeholders}
            ) ON CONFLICT ({postgres_columns[0]}) DO UPDATE SET
                {', '.join([f"{col} = EXCLUDED.{col}" for col in postgres_columns[1:]])}
            """
            
            etl_queries[table] = {
                'legacy_select': select_query,
                'postgres_insert': insert_query,
                'column_count': len(postgres_columns)
            }
        
        # Save ETL queries
        with open('etl_queries.sql', 'w') as f:
            for table, queries in etl_queries.items():
                f.write(f"-- {table} ETL Queries\n")
                f.write(f"-- Legacy SELECT:\n{queries['legacy_select']}\n\n")
                f.write(f"-- PostgreSQL INSERT:\n{queries['postgres_insert']}\n\n")
                f.write("-" * 80 + "\n\n")
        
        self.logger.info("ETL queries generated and saved to etl_queries.sql")
        return etl_queries

    def run_schema_analysis(self):
        """Complete schema analysis and ETL preparation"""
        self.logger.info("Starting comprehensive schema analysis...")
        
        if not self.connect_sql_server():
            self.logger.error("Cannot proceed without SQL Server connection")
            return False
        
        try:
            # Step 1: Analyze legacy schema
            schema_info = self.analyze_legacy_tables()
            
            # Step 2: Generate field mappings
            field_mappings = self.generate_field_mappings(schema_info)
            
            # Step 3: Generate ETL queries
            etl_queries = self.generate_etl_queries(field_mappings)
            
            # Step 4: Generate summary report
            self.generate_migration_report(schema_info, field_mappings)
            
            self.logger.info("Schema analysis completed successfully!")
            self.logger.info("Generated files:")
            self.logger.info("  - legacy_schema_analysis.json (complete schema)")
            self.logger.info("  - field_mappings.json (field mapping configuration)")
            self.logger.info("  - etl_queries.sql (ready-to-use SQL queries)")
            self.logger.info("  - migration_report.txt (summary and recommendations)")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Schema analysis failed: {e}")
            return False
        finally:
            if self.sql_server_conn:
                self.sql_server_conn.close()

    def generate_migration_report(self, schema_info, field_mappings):
        """Generate comprehensive migration report"""
        with open('migration_report.txt', 'w') as f:
            f.write("GROCERY WAREHOUSE ETL MIGRATION REPORT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("LEGACY DATABASE ANALYSIS:\n")
            f.write("-" * 30 + "\n")
            total_rows = 0
            for table, info in schema_info.items():
                rows = info['row_count']
                cols = len(info['columns'])
                total_rows += rows
                f.write(f"{table}: {rows:,} rows, {cols} columns\n")
            
            f.write(f"\nTotal Records: {total_rows:,}\n\n")
            
            f.write("FIELD MAPPING VALIDATION:\n")
            f.write("-" * 30 + "\n")
            for table, mapping in field_mappings.items():
                validation = mapping.get('validation', {})
                f.write(f"{table}:\n")
                f.write(f"  Mapped: {validation.get('mapped_columns', 0)} fields\n")
                f.write(f"  Total Legacy: {validation.get('total_legacy_columns', 0)} fields\n")
                if validation.get('missing_columns'):
                    f.write(f"  Missing: {validation['missing_columns']}\n")
                if validation.get('extra_columns'):
                    f.write(f"  Extra: {validation['extra_columns']}\n")
                f.write("\n")
            
            f.write("MIGRATION RECOMMENDATIONS:\n")
            f.write("-" * 30 + "\n")
            f.write("1. Review missing columns for business impact\n")
            f.write("2. Update connection strings in etl-master-migration.py\n")
            f.write("3. Test migration with small dataset first\n")
            f.write("4. Plan for weekend migration window\n")
            f.write("5. Backup both systems before cutover\n")

if __name__ == "__main__":
    mapper = SchemaMapper()
    success = mapper.run_schema_analysis()
    if success:
        print("\nSchema analysis completed! Review the generated files and update")
        print("your SQL Server connection details to proceed with ETL migration.")
    else:
        print("\nSchema analysis failed. Please check your SQL Server connection.")