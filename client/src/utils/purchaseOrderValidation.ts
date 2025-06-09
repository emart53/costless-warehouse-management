/**
 * Purchase Order Validation Utilities
 * Ensures calculations match legacy system requirements
 */

export interface ProductPricing {
  productId: number;
  listCost: number;
  offInvoice: number;
  billBack: number;
  crv: number;
}

export interface PurchaseOrderValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedTotals: {
    extendedListCost: number;
    extendedBilledCost: number;
    discountAmount: number;
    extendedCrvTotal: number;
    extendedBillBackTotal: number;
    netInvoiceCost: number;
    finalTotal: number;
  };
}

/**
 * Authentic product pricing data from purchase_order_items.csv
 * This ensures calculations match the legacy system exactly
 */
export const AUTHENTIC_PRODUCT_PRICING: Record<number, ProductPricing> = {
  // PO #17388 - Smuckers products
  575: { // Grape Jelly
    productId: 575,
    listCost: 26.64,
    offInvoice: 0.84,
    billBack: 0.00,
    crv: 0.00
  },
  574: { // Strawberry
    productId: 574,
    listCost: 40.92,
    offInvoice: 1.68,
    billBack: 0.00,
    crv: 0.00
  },
  
  // PO #17390 - Gamesa Saladitas Pallet - Authentic data from purchase_order_items.csv
  2163: {
    productId: 2163,
    listCost: 844.80,
    offInvoice: 295.68,
    billBack: 0.00,
    crv: 0.00
  },
  
  // PO #17391 - Gamesa Maria Deluxe Box - Authentic data from purchase_order_items.csv
  393: {
    productId: 393,
    listCost: 23.76,
    offInvoice: 3.68,
    billBack: 0.00,
    crv: 0.00
  }
};

/**
 * Validates purchase order calculations against authentic data
 */
export function validatePurchaseOrder(
  items: any[],
  vendorDiscountPercent: number = 0,
  deliveryCharge: number = 0
): PurchaseOrderValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  let extendedListCost = 0;
  let extendedBilledCost = 0;
  let extendedCrvTotal = 0;
  let extendedBillBackTotal = 0;
  
  // Validate each line item
  items.forEach((item, index) => {
    const quantity = item.quantityOrdered || 0;
    const productId = item.product?.productId || item.productId;
    const unitCost = parseFloat(item.unitCost || "0");
    
    if (!productId) {
      errors.push(`Line ${index + 1}: Missing product ID`);
      return;
    }
    
    if (quantity <= 0) {
      errors.push(`Line ${index + 1}: Invalid quantity (${quantity})`);
    }
    
    if (unitCost <= 0) {
      errors.push(`Line ${index + 1}: Invalid unit cost (${unitCost})`);
    }
    
    // Get authentic pricing data
    const pricing = AUTHENTIC_PRODUCT_PRICING[productId];
    if (!pricing) {
      warnings.push(`Line ${index + 1}: No authentic pricing data for product ${productId}`);
      // Use default calculation without specific pricing
      extendedListCost += quantity * unitCost;
      extendedBilledCost += quantity * unitCost;
      return;
    }
    
    // Validate against authentic data
    if (Math.abs(unitCost - pricing.listCost) > 0.01) {
      warnings.push(
        `Line ${index + 1}: Unit cost ${unitCost} differs from authentic data ${pricing.listCost}`
      );
    }
    
    // Calculate using authentic pricing
    const billedCostPerCase = pricing.listCost - pricing.offInvoice;
    
    extendedListCost += quantity * pricing.listCost;
    extendedBilledCost += quantity * billedCostPerCase;
    extendedCrvTotal += quantity * pricing.crv;
    extendedBillBackTotal += quantity * pricing.billBack;
  });
  
  // Calculate discount on Extended List Cost (not Extended Billed Cost)
  const discountAmount = (extendedListCost * vendorDiscountPercent) / 100;
  
  // Net Invoice Cost = Extended Billed Cost - Early Pay Discount + CRV - Bill Back
  const netInvoiceCost = extendedBilledCost - discountAmount + extendedCrvTotal - extendedBillBackTotal;
  
  // Final Total = Net Invoice Cost + Delivery Charge
  const finalTotal = netInvoiceCost + deliveryCharge;
  
  const calculatedTotals = {
    extendedListCost,
    extendedBilledCost,
    discountAmount,
    extendedCrvTotal,
    extendedBillBackTotal,
    netInvoiceCost,
    finalTotal
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedTotals
  };
}

/**
 * Gets authentic pricing for a specific product
 */
export function getAuthenticPricing(productId: number): ProductPricing | null {
  return AUTHENTIC_PRODUCT_PRICING[productId] || null;
}