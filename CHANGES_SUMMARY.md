# Changes Summary - Purchase Order Discount Fix

## Date: June 11, 2025

## Changes Made

### Fixed Vendor Discount Calculation in Purchase Order Edit Page

**Problem**: The edit page was calculating vendor discount on Extended Net (after off-invoice deductions) instead of Extended List Cost (before off-invoice deductions), causing a mismatch with the view page.

**Files Modified**:
- `client/src/pages/PurchaseOrderEdit.tsx`

**Key Changes**:

1. **Fixed discount calculation logic** (lines 188-198):
   - Added calculation of Extended List Cost before off-invoice deductions
   - Changed vendor discount to apply to Extended List Cost instead of Extended Net
   - Matches legacy Cost Less system behavior

2. **Fixed field name reference** (line 197):
   - Changed from `vendor?.discount_percent` to `vendor?.discountPercent`
   - Fixed UI display of discount percentage (line 771)

3. **Added proper dependency handling** (line 232):
   - Added `calculateTotals` to useEffect dependencies

## Results

- Edit page now shows correct discount amount: $2,628.29 (matching view page)
- Vendor discount properly calculated on Extended List Cost of $131,414.40
- 2% Quaker vendor discount displays correctly in both edit and view modes
- Purchase order totals are accurate and consistent

## Testing

- PO-21046 (Quaker vendor) shows correct 2% discount calculation
- Edit and view pages now display matching totals
- All Quaker product descriptions and pricing remain accurate

## Next Steps for GitHub Commit

1. From your local development environment, run:
   ```bash
   git add client/src/pages/PurchaseOrderEdit.tsx
   git commit -m "Fix vendor discount calculation in purchase order edit page

   - Apply vendor discount to Extended List Cost instead of Extended Net
   - Fix field name reference from discount_percent to discountPercent
   - Ensure edit and view pages show matching discount amounts
   - Maintain consistency with legacy Cost Less system behavior"
   
   git push origin main
   ```

2. Consider creating a feature branch for future changes:
   ```bash
   git checkout -b feature/purchase-order-improvements
   ```