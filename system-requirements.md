# Cost Less Food Company - Warehouse Management System Requirements

## Overview
Migration of 19-year-old SQL Server grocery warehouse system to modern React/Express/PostgreSQL architecture. System must handle 300+ products, 100+ vendors, and 9 retail stores with Purchase Orders and Store Transfers.

## Critical Success Requirements

### 1. Rapid 10-Key Entry Experience
- **Primary Requirement**: Replicate MS Access forms' rapid product_id + quantity entry
- Users must be able to quickly enter product codes and quantities without mouse interaction
- Form validation and auto-completion for product lookups

### 2. Authentic Data Integrity
- **All data must come from original CSV files**
- No mock, placeholder, or synthetic data
- Preserve original product IDs, vendor relationships, and financial calculations
- Use exact product descriptions from CSV data

### 3. Financial Calculation Accuracy
- Extended Cost = Quantity × Unit Cost
- Off-Invoice allowances (vendor rebates) - deducted at line item level
- Bill Back deductions (promotional funding) - **CRITICAL**: NOT deducted from line items, only in totals section
- Line Net Cost = Extended Cost - Off-Invoice (Bill Back NOT deducted here)
- Lump Sum allowances at PO level
- Delivery charges
- Final Total = Sum of Line Net Costs + Lump Sum + Delivery - Total Bill Back Amount

## Purchase Order System Requirements

### Core Fields (Confirmed)
1. **PO Number** - Unique identifier from CSV
2. **Vendor Information** - From vendors.csv with full contact details
3. **Order Date** - Date PO was created
4. **Expected Date** - When delivery is expected
5. **Status** - DRAFT, SENT, RECEIVED, etc.
6. **Ship To Location** - From locations.csv
7. **Bill To Location** - From locations.csv
8. **Lump Sum Allowance** - PO-level discount
9. **Delivery Charge** - Shipping costs
10. **Notes** - Free text field

### Line Item Fields (Confirmed) - PostgreSQL Field Names
1. **Product ID** - Links to products.csv (productId)
2. **Product Description** - From product_description field
3. **Size/UPC** - Show size if UPC not available
4. **Quantity Ordered** - Units to purchase (quantityOrdered)
5. **Unit Cost** - Cost per unit (unitCost - list cost, NOT reduced by bill back)
6. **Extended Cost** - Calculated: Quantity × Unit Cost
7. **Off Invoice** - Vendor allowances (offInvoice - deducted at line level)
8. **Bill Back** - Promotional deductions (billBack - DISPLAY ONLY - not deducted from line cost)
9. **Purchase CRV** - California Redemption Value (purchaseCrv - show when applicable, hide when zero)
10. **Line Net Cost** - Calculated: Extended Cost - Off Invoice (Bill Back NOT included)

### Fields NOT Currently Used (To Be Excluded)
- **Order Type** - This field appeared without user request and should be removed
- Any auto-generated PostgreSQL IDs that break CSV relationships

## Display Requirements

### Purchase Order View
- Professional layout matching original purchase_order_pdf.html
- Complete financial breakdown in totals section
- Product information with size when UPC unavailable
- Cost Less Food Company branding

### Product Information Display Priority
1. Product Description (from product_description field)
2. Size (from size field) 
3. UPC only if available in product_upcs.csv
4. Notes if present

## Data Source Mapping

### Primary CSV Files
- `purchase_order_header.csv` - PO header information
- `purchase_order_items.csv` - Line item details
- `products.csv` - Product master data
- `vendors.csv` - Vendor master data
- `locations.csv` - Ship/Bill to locations
- `product_upcs.csv` - UPC codes (when available)

### Field Mapping Rules
- Use exact field names from CSV files
- Preserve original product and vendor IDs
- Map quantity from CSV 'quantity' field to frontend display
- Financial calculations must use string-to-number conversion for precision

## Advanced Features (Future)

### Transfer Cost Override System
- Sophisticated cost calculations for store transfers
- Override standard costs for specific transfer scenarios

### Diverting Functionality  
- Bulk purchase splitting for resale to other retailers/distributors
- Split shipments and virtual warehouse management
- Customer invoicing integration

## Quality Standards
- All financial calculations must be transparent and auditable
- Error handling for missing data (graceful degradation)
- Professional appearance matching original system
- Fast, responsive interface for warehouse operations

## Change Management Process
- Any new fields or modifications require explicit user approval
- Document all changes in this requirements file
- Test with authentic CSV data before deployment
- Maintain backwards compatibility with existing data structure

---

**Last Updated**: December 2024
**Status**: Living document - requires user approval for all changes