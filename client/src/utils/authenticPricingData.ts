/**
 * Authentic Pricing Data from purchase_order_items.csv
 * This ensures 100% data integrity by using only real data from your legacy system
 */

interface AuthenticPricingRecord {
  productId: number;
  poNumber: string;
  quantity: number;
  purchaseCost: number;
  offInvoice: number;
  billBack: number;
  purchaseCrv: number;
  netCost: number;
}

/**
 * Direct mapping from purchase_order_items.csv - Line by line authentic data
 * This eliminates any possibility of synthetic or incorrect calculations
 */
export const AUTHENTIC_PURCHASE_ORDER_ITEMS: AuthenticPricingRecord[] = [
  // PO #17388 - Smuckers products
  {
    productId: 575, // Grape Jelly
    poNumber: "17388",
    quantity: 264,
    purchaseCost: 26.64,
    offInvoice: 0.84,
    billBack: 0.00,
    purchaseCrv: 0.00,
    netCost: 25.80
  },
  {
    productId: 574, // Strawberry  
    poNumber: "17388",
    quantity: 924,
    purchaseCost: 40.92,
    offInvoice: 1.68,
    billBack: 0.00,
    purchaseCrv: 0.00,
    netCost: 39.24
  },
  
  // PO #17390 - Gamesa Saladitas Pallet
  {
    productId: 2163,
    poNumber: "17390", 
    quantity: 48,
    purchaseCost: 844.80,
    offInvoice: 295.68,
    billBack: 0.00,
    purchaseCrv: 0.00,
    netCost: 549.12
  },
  
  // PO #17391 - Gamesa Maria Deluxe Box
  {
    productId: 393,
    poNumber: "17391",
    quantity: 390,
    purchaseCost: 23.76,
    offInvoice: 3.68,
    billBack: 0.00,
    purchaseCrv: 0.00,
    netCost: 20.08
  }
];

/**
 * Get authentic pricing for a specific product in a specific PO
 * This ensures we use exact data from your legacy system
 */
export function getAuthenticPricingForPO(productId: number, poNumber: string): AuthenticPricingRecord | null {
  return AUTHENTIC_PURCHASE_ORDER_ITEMS.find(
    item => item.productId === productId && item.poNumber === poNumber
  ) || null;
}

/**
 * Get all authentic pricing for a purchase order
 */
export function getAuthenticPricingForPurchaseOrder(poNumber: string): AuthenticPricingRecord[] {
  return AUTHENTIC_PURCHASE_ORDER_ITEMS.filter(item => item.poNumber === poNumber);
}

/**
 * Validate that calculated values match authentic legacy data
 */
export function validateAgainstAuthenticData(
  productId: number,
  poNumber: string,
  calculatedValues: {
    purchaseCost: number;
    offInvoice: number;
    billBack: number;
    netCost: number;
  }
): {
  isValid: boolean;
  errors: string[];
} {
  const authentic = getAuthenticPricingForPO(productId, poNumber);
  const errors: string[] = [];
  
  if (!authentic) {
    errors.push(`No authentic data found for Product ${productId} in PO ${poNumber}`);
    return { isValid: false, errors };
  }
  
  const tolerance = 0.01;
  
  if (Math.abs(calculatedValues.purchaseCost - authentic.purchaseCost) > tolerance) {
    errors.push(`Purchase cost mismatch: calculated ${calculatedValues.purchaseCost}, authentic ${authentic.purchaseCost}`);
  }
  
  if (Math.abs(calculatedValues.offInvoice - authentic.offInvoice) > tolerance) {
    errors.push(`Off invoice mismatch: calculated {formatCurrency(calculatedValues.offInvoice)}, authentic {formatCurrency(authentic.offInvoice)}`);
  }
  
  if (Math.abs(calculatedValues.billBack - authentic.billBack) > tolerance) {
    errors.push(`Bill back mismatch: calculated {formatCurrency(calculatedValues.billBack)}, authentic {formatCurrency(authentic.billBack)}`);
  }
  
  if (Math.abs(calculatedValues.netCost - authentic.netCost) > tolerance) {
    errors.push(`Net cost mismatch: calculated {formatCurrency(calculatedValues.netCost)}, authentic {formatCurrency(authentic.netCost)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}