#!/usr/bin/env python3
"""
Legacy Schema Verification for CostLessWarehouse
Confirms table structure before running full ETL migration
"""

import pyodbc
import json
from datetime import datetime

def verify_legacy_schema():
    """Verify your actual legacy table structure"""
    
    # Your exact configuration
    server = "SQL\\SQLEXPRESS"
    database = "CostLessWarehouse"
    
    try:
        # Connect using Windows Authentication
        conn_str = (
            f"DRIVER={{SQL Server}};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"Trusted_Connection=yes;"
        )
        
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        print(f"✓ Connected to {database} on {server}")
        
        # Tables to verify
        critical_tables = [
            'Products', 'Vendor', 'PurchaseOrders', 'POProducts',
            'TransferOrders', 'TransferOrderItems', 'Departments', 
            'Categories', 'Stores'
        ]
        
        schema_info = {}
        
        for table in critical_tables:
            try:
                # Get table structure
                cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    CHARACTER_MAXIMUM_LENGTH,
                    IS_NULLABLE,
                    COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table}'
                ORDER BY ORDINAL_POSITION
                """)
                
                columns = []
                for row in cursor.fetchall():
                    columns.append({
                        'name': row.COLUMN_NAME,
                        'type': row.DATA_TYPE,
                        'length': row.CHARACTER_MAXIMUM_LENGTH,
                        'nullable': row.IS_NULLABLE == 'YES',
                        'default': row.COLUMN_DEFAULT
                    })
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                row_count = cursor.fetchone()[0]
                
                if columns:
                    schema_info[table] = {
                        'columns': columns,
                        'row_count': row_count
                    }
                    print(f"✓ {table}: {len(columns)} columns, {row_count:,} rows")
                else:
                    print(f"⚠ {table}: Table not found")
                    
            except Exception as e:
                print(f"✗ {table}: Error - {e}")
        
        # Save schema information
        with open('legacy_schema_verified.json', 'w') as f:
            json.dump(schema_info, f, indent=2, default=str)
        
        print(f"\n✓ Schema verification complete")
        print(f"✓ Results saved to legacy_schema_verified.json")
        
        # Check for key fields in critical tables
        print("\nKEY FIELD VERIFICATION:")
        
        # Products table key fields
        if 'Products' in schema_info:
            product_columns = [col['name'] for col in schema_info['Products']['columns']]
            key_fields = ['ProductID', 'ProductName', 'CasePack', 'DepartmentID', 'CategoryID']
            missing = [field for field in key_fields if field not in product_columns]
            if missing:
                print(f"⚠ Products missing: {missing}")
            else:
                print("✓ Products table has all key fields")
        
        # Vendor table key fields  
        if 'Vendor' in schema_info:
            vendor_columns = [col['name'] for col in schema_info['Vendor']['columns']]
            key_fields = ['VendorID', 'VendorCode', 'VendorName']
            missing = [field for field in key_fields if field not in vendor_columns]
            if missing:
                print(f"⚠ Vendor missing: {missing}")
            else:
                print("✓ Vendor table has all key fields")
        
        # Transfer orders key fields
        if 'TransferOrders' in schema_info:
            transfer_columns = [col['name'] for col in schema_info['TransferOrders']['columns']]
            key_fields = ['TransferOrderID', 'TransferNumber', 'StoreID', 'OrderDate']
            missing = [field for field in key_fields if field not in transfer_columns]
            if missing:
                print(f"⚠ TransferOrders missing: {missing}")
            else:
                print("✓ TransferOrders table has all key fields")
        
        print(f"\nNext step: Review legacy_schema_verified.json and run production-etl-windows-auth.py")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Schema verification failed: {e}")
        return False

if __name__ == "__main__":
    print("Legacy Schema Verification for CostLessWarehouse")
    print("=" * 50)
    verify_legacy_schema()