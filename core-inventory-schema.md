# Core Inventory Schema - Three Transaction Model

## Primary Inventory Flow

### Transaction Types
1. **PURCHASE_RECEIPT** - Receiving goods from vendors (+inventory)
2. **TRANSFER_SHIPMENT** - Shipping to stores (-inventory) 
3. **ADJUSTMENT** - Manual corrections (+/- inventory)

## Core Schema

### 1. Inventory Holdings (Current Balances)
```sql
inventory_holdings
- id (primary key)
- product_id (foreign key to products)
- location_id (foreign key to locations)
- quantity_on_hand (current physical quantity)
- quantity_reserved (allocated to pending transfers)
- quantity_available (on_hand - reserved)
- last_movement_date (most recent transaction)
- last_counted_date (most recent physical count)
- cost_basis (weighted average cost)
- last_updated (timestamp)
```

### 2. Inventory Transactions (All Movement History)
```sql
inventory_transactions
- id (primary key)
- transaction_type (PURCHASE_RECEIPT, TRANSFER_SHIPMENT, ADJUSTMENT)
- product_id (foreign key)
- location_id (foreign key)
-
-- Transaction References
- reference_type (purchase_order, transfer_order, adjustment)
- reference_id (links to source document)
- reference_line_id (specific line item)

-- Quantity Changes
- quantity_change (+/- units moved)
- quantity_before (balance before this transaction)
- quantity_after (balance after this transaction)

-- Cost Information
- unit_cost (cost per unit for this transaction)
- total_cost (quantity * unit_cost)

-- Tracking
- transaction_date (when movement occurred)
- created_by (user who entered transaction)
- created_at (system timestamp)
- notes (optional description)
```

## Transaction Processing Logic

### Purchase Order Receipt Flow
```
1. Purchase order arrives at warehouse
2. Staff receives items using 10-key entry (product_id + quantity)
3. System creates PURCHASE_RECEIPT transaction
4. Inventory holdings updated: quantity_on_hand += received_quantity
5. Cost basis recalculated (weighted average)
```

### Transfer Order Shipment Flow  
```
1. Store places transfer order (online or phone)
2. Warehouse picks items using mobile interface
3. System creates TRANSFER_SHIPMENT transaction  
4. Inventory holdings updated: quantity_on_hand -= shipped_quantity
5. Reserved quantity cleared for completed transfers
```

### Adjustment Processing
```
1. Staff discovers discrepancy (cycle count, damage, theft)
2. Adjustment entry using 10-key interface
3. System creates ADJUSTMENT transaction (+ or -)
4. Inventory holdings updated: quantity_on_hand += adjustment_quantity
5. Reason code tracked for reporting
```

## Supporting Tables

### 3. Reorder Point Monitoring
```sql
reorder_analysis
- product_id (foreign key)
- location_id (foreign key)
- current_stock (from inventory_holdings)
- reorder_point (trigger level)
- suggested_order_qty (recommended purchase quantity)
- days_of_supply (current stock / daily_usage)
- velocity_30day (units moved in last 30 days)
- velocity_90day (units moved in last 90 days)
- last_purchase_date (most recent receipt)
- last_calculated (when analysis was run)
```

### 4. Movement Velocity Analysis
```sql
product_velocity
- product_id (foreign key)
- period_start (analysis period)
- period_end (analysis period)
- purchases_received (total units received)
- transfers_shipped (total units shipped)
- adjustments_net (net adjustment quantity)
- turnover_rate (how many times inventory turned)
- abc_classification (A=high velocity, B=medium, C=low)
- forecast_next_period (predicted usage)
```

## Simplified Workflow Integration

### For Current 10-Key Operations
- **Receiving**: Product ID + Quantity Received → PURCHASE_RECEIPT
- **Shipping**: Product ID + Quantity Shipped → TRANSFER_SHIPMENT  
- **Adjustments**: Product ID + Quantity Adjustment → ADJUSTMENT

### For Mobile Operations
- Pick lists show available inventory from holdings
- Cycle counts create ADJUSTMENT transactions for variances
- Real-time inventory updates during warehouse operations

### For Forecasting
- Analyze transaction history to predict future needs
- Calculate reorder points based on velocity patterns
- Identify slow-moving inventory for management attention

This streamlined schema focuses on your three core transaction types while supporting the rapid entry workflow your team depends on, plus the advanced analytics for forecasting and optimization.