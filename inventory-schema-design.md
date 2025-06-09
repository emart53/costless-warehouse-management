# Comprehensive Inventory Schema Design

## Core Inventory Tables

### 1. Inventory Holdings (Current Stock)
```sql
-- Real-time inventory by location
inventory_holdings
- id (primary key)
- product_id (foreign key to products)
- location_id (foreign key to locations) 
- warehouse_id (foreign key to warehouses)
- quantity_on_hand (current physical count)
- quantity_reserved (allocated to orders)
- quantity_available (on_hand - reserved)
- last_counted_date (last physical count)
- last_counted_by (user who counted)
- last_updated (timestamp)
- cost_basis (FIFO/LIFO/weighted average)
```

### 2. Inventory Movements (Transaction Log)
```sql
-- Complete audit trail of all inventory changes
inventory_movements
- id (primary key)
- product_id (foreign key)
- location_id (foreign key)
- movement_type (receipt, shipment, adjustment, transfer_in, transfer_out, cycle_count)
- reference_type (purchase_order, transfer_order, adjustment, count)
- reference_id (links to source document)
- quantity_change (+/- units moved)
- quantity_before (balance before movement)
- quantity_after (balance after movement)
- unit_cost (cost per unit for this movement)
- total_cost (quantity * unit_cost)
- movement_date (when movement occurred)
- created_by (user who entered)
- created_at (timestamp)
- notes (optional description)
```

### 3. Reorder Point Management
```sql
-- Dynamic reorder calculations
reorder_settings
- id (primary key)
- product_id (foreign key)
- location_id (foreign key)
- reorder_point (trigger quantity)
- reorder_quantity (suggested order amount)
- safety_stock (buffer quantity)
- lead_time_days (vendor delivery time)
- review_period_days (how often to recalculate)
- seasonal_factor (multiplier for seasonal items)
- last_calculated (when reorder point was computed)
- calculation_method (manual, velocity_based, ml_predicted)
- is_active (enable/disable automatic reordering)
```

### 4. Demand Forecasting Data
```sql
-- Historical consumption patterns for ML forecasting
demand_history
- id (primary key)
- product_id (foreign key)
- location_id (foreign key)
- period_start (date range start)
- period_end (date range end)
- units_consumed (actual usage in period)
- units_ordered (what was ordered)
- stockout_days (days out of stock)
- seasonality_index (seasonal adjustment factor)
- trend_factor (growth/decline trend)
- forecast_accuracy (actual vs predicted variance)
```

## Mobile Operations Support

### 5. Cycle Count Management
```sql
-- Mobile inventory counting
cycle_counts
- id (primary key)
- count_name (description of count)
- location_id (foreign key)
- scheduled_date (when count should happen)
- started_date (when actually started)
- completed_date (when finished)
- assigned_to (user responsible)
- status (scheduled, in_progress, completed, cancelled)
- count_type (full, partial, abc_analysis, random)
- created_by (who scheduled it)
```

cycle_count_items
- id (primary key)
- cycle_count_id (foreign key)
- product_id (foreign key)
- expected_quantity (system quantity)
- counted_quantity (physical count)
- variance (difference)
- counter_user_id (who counted)
- count_timestamp (when counted)
- notes (observations)
- requires_recount (if variance too large)
```

### 6. Mobile Pick Lists
```sql
-- Order picking optimization
pick_lists
- id (primary key)
- order_type (transfer, customer_order, internal)
- order_id (foreign key to source order)
- picker_assigned (user assigned)
- route_sequence (optimized picking order)
- status (pending, picking, completed, cancelled)
- started_at (picking start time)
- completed_at (picking end time)
- total_items (count of line items)
- items_picked (progress counter)
```

pick_list_items
- id (primary key)
- pick_list_id (foreign key)
- product_id (foreign key)
- location_id (where to find item)
- quantity_requested (what's needed)
- quantity_picked (what was actually picked)
- sequence_number (picking order)
- status (pending, picked, short, substituted)
- picked_by (user who picked)
- picked_at (timestamp)
- notes (picker observations)
```

## Advanced Analytics Support

### 7. ABC Analysis Data
```sql
-- Product classification for inventory priority
abc_analysis
- id (primary key)
- product_id (foreign key)
- analysis_period_start (date range)
- analysis_period_end (date range)
- total_value_moved (revenue/cost importance)
- movement_frequency (how often it moves)
- abc_classification (A, B, C category)
- xyz_classification (X=consistent, Y=variable, Z=lumpy demand)
- review_frequency_days (how often to monitor)
- calculated_date (when analysis was run)
```

### 8. Supplier Performance Tracking
```sql
-- Vendor reliability for reorder calculations
supplier_performance
- id (primary key)
- vendor_id (foreign key)
- product_id (foreign key)
- period_start (measurement period)
- period_end (measurement period)
- orders_placed (count)
- orders_on_time (count)
- orders_complete (no shorts)
- average_lead_time (days)
- lead_time_variance (consistency measure)
- quality_score (1-100 rating)
- reliability_factor (used in reorder calculations)
```

## Store Online Ordering Support

### 9. Store Product Catalog
```sql
-- What each store can order
store_product_catalog
- id (primary key)
- store_id (foreign key)
- product_id (foreign key)
- is_available (can store order this)
- minimum_order_quantity (store minimums)
- maximum_order_quantity (allocation limits)
- standard_order_quantity (suggested amount)
- last_ordered_date (when store last ordered)
- average_weekly_usage (consumption pattern)
- seasonal_pattern (demand variations)
```

### 10. Store Order History
```sql
-- Pattern analysis for recommendations
store_order_patterns
- id (primary key)
- store_id (foreign key)
- product_id (foreign key)
- order_frequency_days (how often they order)
- typical_quantity (usual order size)
- last_order_date (most recent order)
- last_order_quantity (most recent amount)
- trend_direction (increasing/decreasing/stable)
- seasonality_factor (seasonal multiplier)
- reorder_recommendation (suggested next order)
```

## Key Features This Schema Enables:

### Real-Time Operations
- Live inventory balances across all locations
- Mobile cycle counting with variance tracking
- Optimized pick routes for order fulfillment
- Complete audit trail of all movements

### Intelligent Forecasting
- Historical demand pattern analysis
- Seasonal adjustment calculations
- ABC/XYZ classification for prioritization
- Supplier reliability factor integration
- Machine learning ready data structure

### Store Self-Service Ordering
- Personalized product catalogs per store
- Order history and pattern recognition
- Automatic reorder suggestions
- Quantity limits and allocation controls

### Management Reporting
- Inventory aging and turnover analysis
- Forecasting accuracy measurement
- Supplier performance scorecards
- Stock optimization recommendations

This schema supports everything from your current rapid 10-key entry workflow to advanced AI-driven inventory optimization, while maintaining the data integrity needed for a mission-critical warehouse system.