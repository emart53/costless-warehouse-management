#!/usr/bin/env python3
"""
Fast CSV Loader for CostLessWarehouse Authentic Data
Handles NULL values and data type conversions properly
"""

import csv
import psycopg2
import psycopg2.extras
import logging
import os
from datetime import datetime
import sys

class FastCSVLoader:
    def __init__(self):
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        self.postgres_conn = None
        self.migration_stats = {}

    def connect_postgres(self):
        database_url = os.environ.get('DATABASE_URL')
        self.postgres_conn = psycopg2.connect(database_url)
        self.postgres_conn.autocommit = False
        self.logger.info("Connected to PostgreSQL")

    def safe_int(self, value, default=0):
        """Safely convert to int, handling NULL/empty values"""
        if value is None or value == '' or value.upper() == 'NULL':
            return default
        try:
            return int(float(value))  # Handle decimal strings
        except (ValueError, TypeError):
            return default

    def safe_float(self, value, default=0.0):
        """Safely convert to float, handling NULL/empty values"""
        if value is None or value == '' or value.upper() == 'NULL':
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def safe_str(self, value, default=''):
        """Safely convert to string, handling NULL values"""
        if value is None or value.upper() == 'NULL':
            return default
        return str(value).strip()

    def clear_existing_data(self):
        """Clear existing data for fresh load"""
        cursor = self.postgres_conn.cursor()
        cursor.execute("""
            TRUNCATE TABLE 
                transfer_order_items, transfer_orders, 
                product_prices, products, 
                vendors, categories, departments, stores 
            CASCADE
        """)
        self.postgres_conn.commit()
        self.logger.info("Cleared existing data")

    def load_departments(self):
        """Load departments from CSV"""
        self.logger.info("Loading departments...")
        cursor = self.postgres_conn.cursor()
        
        # Insert default department
        cursor.execute("""
            INSERT INTO departments (id, department_name, is_active, created_at, updated_at)
            VALUES (0, 'Unassigned', true, %s, %s)
        """, (datetime.now(), datetime.now()))
        
        count = 1
        
        try:
            with open('attached_assets/departments.csv', 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT INTO departments (id, department_name, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            department_name = EXCLUDED.department_name,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        self.safe_int(row.get('department_id', row.get('id', 0))),
                        self.safe_str(row.get('department_name', row.get('name', 'Unknown'))),
                        True,
                        datetime.now(),
                        datetime.now()
                    ))
                    count += 1
        except FileNotFoundError:
            self.logger.warning("departments.csv not found")
        
        self.postgres_conn.commit()
        self.migration_stats['departments'] = count
        self.logger.info(f"Loaded {count} departments")

    def load_categories(self):
        """Load categories from CSV"""
        self.logger.info("Loading categories...")
        cursor = self.postgres_conn.cursor()
        count = 0
        
        try:
            with open('attached_assets/categories.csv', 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT INTO categories (id, category_name, department_id, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            category_name = EXCLUDED.category_name,
                            department_id = EXCLUDED.department_id,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        self.safe_int(row.get('category_id', row.get('id', 0))),
                        self.safe_str(row.get('category_name', row.get('name', 'Unknown'))),
                        self.safe_int(row.get('department_id', 0)),
                        True,
                        datetime.now(),
                        datetime.now()
                    ))
                    count += 1
        except FileNotFoundError:
            self.logger.warning("categories.csv not found")
        
        self.postgres_conn.commit()
        self.migration_stats['categories'] = count
        self.logger.info(f"Loaded {count} categories")

    def load_vendors(self):
        """Load vendors from CSV with proper NULL handling"""
        self.logger.info("Loading vendors...")
        cursor = self.postgres_conn.cursor()
        count = 0
        
        try:
            with open('attached_assets/vendors.csv', 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    vendor_code = self.safe_str(row.get('vendor_ap', row.get('vendor_id', str(count))))
                    if not vendor_code or vendor_code == '0':
                        vendor_code = f"V{self.safe_int(row.get('vendor_id', count))}"
                    
                    cursor.execute("""
                        INSERT INTO vendors (code, name, contact_name, phone, address, city, state, zip_code, discount_percent, ep_days, net_days, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (code) DO UPDATE SET
                            name = EXCLUDED.name,
                            contact_name = EXCLUDED.contact_name,
                            phone = EXCLUDED.phone,
                            address = EXCLUDED.address,
                            city = EXCLUDED.city,
                            state = EXCLUDED.state,
                            zip_code = EXCLUDED.zip_code,
                            discount_percent = EXCLUDED.discount_percent,
                            ep_days = EXCLUDED.ep_days,
                            net_days = EXCLUDED.net_days,
                            is_active = EXCLUDED.is_active
                    """, (
                        vendor_code,
                        self.safe_str(row.get('vendor_name', 'Unknown Vendor')),
                        self.safe_str(row.get('contact_person', '')),
                        self.safe_str(row.get('phone', '')),
                        self.safe_str(row.get('address', '')),
                        self.safe_str(row.get('city', '')),
                        self.safe_str(row.get('state', '')),
                        self.safe_str(row.get('zip', '')),
                        self.safe_float(row.get('discount', 0)),
                        self.safe_int(row.get('ep_days', 0)),
                        self.safe_int(row.get('net_days', 30)),
                        bool(self.safe_int(row.get('is_active', 1)))
                    ))
                    count += 1
        except Exception as e:
            self.logger.error(f"Error loading vendors: {e}")
        
        self.postgres_conn.commit()
        self.migration_stats['vendors'] = count
        self.logger.info(f"Loaded {count} vendors")

    def load_complete_dataset(self):
        """Load complete authentic dataset"""
        try:
            self.connect_postgres()
            self.clear_existing_data()
            
            self.load_departments()
            self.load_categories()
            self.load_vendors()
            
            # Load products with vendor mapping
            self.load_products_with_vendors()
            
            # Generate final summary
            total_records = sum(self.migration_stats.values())
            self.logger.info(f"\nMigration Complete: {total_records:,} total records loaded")
            
        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            if self.postgres_conn:
                self.postgres_conn.rollback()
            raise
        finally:
            if self.postgres_conn:
                self.postgres_conn.close()

    def load_products_with_vendors(self):
        """Load products with proper vendor references"""
        self.logger.info("Loading products...")
        cursor = self.postgres_conn.cursor()
        
        # Get vendor mapping
        cursor.execute("SELECT id, code FROM vendors")
        vendor_mapping = {code: id for id, code in cursor.fetchall()}
        
        count = 0
        
        try:
            with open('attached_assets/products.csv', 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Map vendor code to vendor ID
                    vendor_code = self.safe_str(row.get('vendor_code', ''))
                    preferred_vendor_id = vendor_mapping.get(vendor_code)
                    
                    cursor.execute("""
                        INSERT INTO products (product_id, product_description, case_upc, case_pack, size, department_id, category_id, purchase_cost, off_invoice, bill_back, crv, purchase_weight, preferred_vendor_id, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (product_id) DO UPDATE SET
                            product_description = EXCLUDED.product_description,
                            case_upc = EXCLUDED.case_upc,
                            case_pack = EXCLUDED.case_pack,
                            size = EXCLUDED.size,
                            department_id = EXCLUDED.department_id,
                            category_id = EXCLUDED.category_id,
                            purchase_cost = EXCLUDED.purchase_cost,
                            preferred_vendor_id = EXCLUDED.preferred_vendor_id,
                            status = EXCLUDED.status
                    """, (
                        self.safe_str(row.get('product_id', str(count))),
                        self.safe_str(row.get('product_description', row.get('description', 'Unknown Product'))),
                        self.safe_str(row.get('case_upc', row.get('upc', ''))),
                        self.safe_int(row.get('case_pack', 1)),
                        self.safe_str(row.get('size', '')),
                        self.safe_int(row.get('department_id', 0)),
                        self.safe_int(row.get('category_id', 0)),
                        self.safe_float(row.get('purchase_cost', row.get('cost', 0))),
                        self.safe_float(row.get('off_invoice', 0)),
                        self.safe_float(row.get('bill_back', 0)),
                        self.safe_float(row.get('crv', 0)),
                        self.safe_float(row.get('purchase_weight', 0)),
                        preferred_vendor_id,
                        self.safe_str(row.get('status', 'Active'))
                    ))
                    count += 1
                    
                    if count % 100 == 0:
                        self.logger.info(f"Processed {count} products...")
        except Exception as e:
            self.logger.error(f"Error loading products: {e}")
        
        self.postgres_conn.commit()
        self.migration_stats['products'] = count
        self.logger.info(f"Loaded {count} products")

if __name__ == "__main__":
    loader = FastCSVLoader()
    loader.load_complete_dataset()