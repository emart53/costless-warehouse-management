#!/usr/bin/env python3
"""
Simple Data Loader for CostLessWarehouse
Direct import without conflict resolution
"""

import csv
import psycopg2
import logging
import os
from datetime import datetime

class SimpleDataLoader:
    def __init__(self):
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        self.postgres_conn = None

    def connect_postgres(self):
        database_url = os.environ.get('DATABASE_URL')
        self.postgres_conn = psycopg2.connect(database_url)
        self.postgres_conn.autocommit = False
        self.logger.info("Connected to PostgreSQL")

    def load_all_data(self):
        try:
            self.connect_postgres()
            cursor = self.postgres_conn.cursor()
            
            # Clear existing data first
            self.logger.info("Clearing existing data...")
            cursor.execute("TRUNCATE TABLE transfer_order_items, transfer_orders, purchase_order_items, purchase_orders, product_prices, products, vendors, categories, departments CASCADE")
            
            # Load departments
            self.logger.info("Loading departments...")
            # First insert default department for orphaned categories
            cursor.execute("""
                INSERT INTO departments (id, department_name, is_active, created_at, updated_at)
                VALUES (0, 'Unassigned', true, %s, %s)
            """, (datetime.now(), datetime.now()))
            dept_count = 1
            
            with open('attached_assets/departments.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT INTO departments (id, department_name, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (int(row['department_id']), row['department_name'], True, datetime.now(), datetime.now()))
                    dept_count += 1
            
            # Load categories
            self.logger.info("Loading categories...")
            cat_count = 0
            with open('attached_assets/categories.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT INTO categories (id, category_name, department_id, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (int(row['category_id']), row['category_name'], int(row['department_id']), True, datetime.now(), datetime.now()))
                    cat_count += 1
            
            # Load vendors
            self.logger.info("Loading vendors...")
            vendor_count = 0
            with open('attached_assets/vendors.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    vendor_code = row.get('vendor_ap') or str(row['vendor_id'])
                    address = (row.get('address') or '') + (' ' + row.get('address2', '') if row.get('address2') else '')
                    
                    cursor.execute("""
                        INSERT INTO vendors (code, name, contact_name, phone, address, city, state, zip_code, discount_percent, ep_days, net_days, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        vendor_code, row['vendor_name'], row.get('contact_person', ''),
                        row.get('phone', ''), address.strip(), row.get('city', ''),
                        row.get('state', ''), row.get('zip', ''),
                        float(row.get('discount', 0) or 0), 
                        int(row.get('ep_days') or 0) if row.get('ep_days') and row.get('ep_days') != 'NULL' else 0,
                        int(row.get('net_days') or 0) if row.get('net_days') and row.get('net_days') != 'NULL' else 0, 
                        bool(int(row.get('is_active', 1)))
                    ))
                    vendor_count += 1
            
            # Load products
            self.logger.info("Loading products...")
            product_count = 0
            with open('attached_assets/products.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT INTO products (product_id, product_description, case_upc, case_pack, size, department_id, category_id, purchase_cost, off_invoice, bill_back, crv, purchase_weight, preferred_vendor_id, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        row['product_id'], row['product_description'], row.get('case_upc'),
                        int(row.get('case_pack', 1) or 1), row.get('size'), int(row.get('department_id', 0) or 0),
                        int(row.get('category_id', 0) or 0), float(row.get('purchase_cost', 0) or 0),
                        float(row.get('off_invoice', 0) or 0), float(row.get('bill_back', 0) or 0),
                        float(row.get('crv', 0) or 0), float(row.get('purchase_weight', 0) or 0),
                        row.get('preferred_vendor_id'), row.get('status', 'Active')
                    ))
                    product_count += 1
            
            # Load product prices
            self.logger.info("Loading product prices...")
            price_count = 0
            with open('attached_assets/product_prices.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    effective_date = datetime.now().date()
                    if row.get('effective_date'):
                        try:
                            effective_date = datetime.strptime(row['effective_date'].split()[0], '%Y-%m-%d').date()
                        except:
                            pass
                    
                    cursor.execute("""
                        INSERT INTO product_prices (product_id, vendor_id, effective_date, purchase_cost, transfer_cost, retail_price, off_invoice, bill_back, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        row['product_id'], row.get('vendor_id'), effective_date,
                        float(row.get('purchase_cost', 0) or 0), float(row.get('transfer_cost', 0) or 0),
                        float(row.get('retail_price', 0) or 0), float(row.get('off_invoice', 0) or 0),
                        float(row.get('bill_back', 0) or 0), datetime.now()
                    ))
                    price_count += 1
            
            # Load transfer orders
            self.logger.info("Loading transfer orders...")
            transfer_count = 0
            with open('attached_assets/transfer_header_1749144612951.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    transfer_date = datetime.now()
                    if row.get('transfer_date'):
                        try:
                            transfer_date = datetime.strptime(row['transfer_date'].split()[0], '%Y-%m-%d')
                        except:
                            pass
                    
                    cursor.execute("""
                        INSERT INTO transfer_orders (transfer_number, origin_store, destination_store, transfer_date, status, created_by)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        row['transfer_number'], row['origin_store'], row['destination_store'],
                        transfer_date, row.get('status', 'Open'), row.get('created_by')
                    ))
                    transfer_count += 1
            
            # Load transfer order items
            self.logger.info("Loading transfer order items...")
            transfer_item_count = 0
            with open('attached_assets/transfer_items_1749144612951.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT INTO transfer_order_items (transfer_number, product_id, quantity_requested, quantity_shipped, case_cost, retail_value)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        row['transfer_number'], row['product_id'],
                        int(row.get('quantity_requested', 0) or 0), int(row.get('quantity_shipped', 0) or 0),
                        float(row.get('case_cost', 0) or 0), float(row.get('retail_value', 0) or 0)
                    ))
                    transfer_item_count += 1
            
            self.postgres_conn.commit()
            
            self.logger.info(f"""
==========================================
COSTLESSWAREHOUSE DATA MIGRATION COMPLETE
==========================================
Departments: {dept_count}
Categories: {cat_count}
Vendors: {vendor_count}
Products: {product_count}
Product Prices: {price_count}
Transfer Orders: {transfer_count}
Transfer Items: {transfer_item_count}
==========================================
Total Records: {dept_count + cat_count + vendor_count + product_count + price_count + transfer_count + transfer_item_count}
==========================================""")
            
        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            if self.postgres_conn:
                self.postgres_conn.rollback()
            raise
        finally:
            if self.postgres_conn:
                self.postgres_conn.close()

if __name__ == "__main__":
    loader = SimpleDataLoader()
    loader.load_all_data()