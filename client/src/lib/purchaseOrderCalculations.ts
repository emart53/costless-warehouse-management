// Reusable Purchase Order Calculation Utilities
// Avoids hardcoding and provides consistent calculation logic across the application

export interface ProductPricing {
  purchase_cost: number;
  off_invoice: number;
  bill_back: number;
  crv?: number;
  unit_cost?: number;
}

export interface VendorTerms {
  discount_percent: number;
  ep_days?: number;
  net_days?: number;
  payment_terms?: string;
}

export interface POCalculationResult {
  extendedListTotal: number;
  extendedNetTotal: number;
  extendedCrvTotal: number;
  extendedBillBackTotal: number;
  discountAmount: number;
  finalTotal: number;
  totalItems: number;
  totalQuantity: number;
}

export interface POItem {
  productId: number;
  quantity: number;
  pricing: ProductPricing;
}

/**
 * Calculate comprehensive purchase order totals
 */
export function calculatePOTotals(
  items: POItem[],
  vendorTerms: VendorTerms,
  lumpSumAllowance: number = 0,
  deliveryCharge: number = 0
): POCalculationResult {
  let extendedListTotal = 0;
  let extendedNetTotal = 0;
  let extendedCrvTotal = 0;
  let extendedBillBackTotal = 0;
  let totalQuantity = 0;

  items.forEach(item => {
    const { quantity, pricing } = item;
    const unitCost = pricing.purchase_cost || 0;
    const offInvoice = pricing.off_invoice || 0;
    const billBack = pricing.bill_back || 0;
    const crv = pricing.crv || 0;

    extendedListTotal += unitCost * quantity;
    extendedNetTotal += (unitCost - offInvoice) * quantity;
    extendedCrvTotal += crv * quantity;
    extendedBillBackTotal += billBack * quantity;
    totalQuantity += quantity;
  });

  const discountAmount = (extendedListTotal * (vendorTerms.discount_percent || 0)) / 100;
  const finalTotal = extendedNetTotal + extendedCrvTotal - extendedBillBackTotal - lumpSumAllowance + deliveryCharge - discountAmount;

  return {
    extendedListTotal,
    extendedNetTotal,
    extendedCrvTotal,
    extendedBillBackTotal,
    discountAmount,
    finalTotal,
    totalItems: items.length,
    totalQuantity
  };
}

/**
 * Calculate gross margin for a product
 */
export function calculateGrossMargin(
  sellingPrice: number,
  netCost: number
): { margin: number; marginPercent: number } {
  if (sellingPrice <= 0) return { margin: 0, marginPercent: 0 };
  
  const margin = sellingPrice - netCost;
  const marginPercent = (margin / sellingPrice) * 100;
  
  return { margin, marginPercent };
}

/**
 * Calculate net cost after all allowances
 */
export function calculateNetCost(pricing: ProductPricing): number {
  const { purchase_cost = 0, off_invoice = 0, bill_back = 0 } = pricing;
  return purchase_cost - off_invoice - bill_back;
}

/**
 * Format concatenated product name for display
 */
export function formatProductDisplayName(product: {
  brand?: string;
  product_name?: string;
  product_description?: string;
  case_pack?: number;
  size?: string;
  configuration_name?: string;
}): string {
  const parts: string[] = [];
  
  if (product.brand) parts.push(product.brand);
  if (product.product_name || product.product_description) {
    parts.push(product.product_name || product.product_description || '');
  }
  
  // Add pack/size information
  const packInfo: string[] = [];
  if (product.case_pack) packInfo.push(`${product.case_pack}`);
  if (product.size) packInfo.push(product.size);
  if (packInfo.length > 0) {
    parts.push(packInfo.join('/'));
  }
  
  return parts.join(' ').trim();
}

/**
 * Format vendor display name with contact info
 */
export function formatVendorDisplayName(vendor: {
  name: string;
  code?: string;
  contact?: string;
}): string {
  let displayName = vendor.name;
  if (vendor.code) {
    displayName = `${vendor.code} - ${vendor.name}`;
  }
  if (vendor.contact) {
    displayName += ` (${vendor.contact})`;
  }
  return displayName;
}

/**
 * Validate purchase order data
 */
export function validatePOData(data: {
  vendorId?: number;
  items?: POItem[];
  orderDate?: Date;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.vendorId || data.vendorId <= 0) {
    errors.push('Vendor selection is required');
  }
  
  if (!data.items || data.items.length === 0) {
    errors.push('At least one product is required');
  }
  
  if (!data.orderDate) {
    errors.push('Order date is required');
  }
  
  if (data.items) {
    data.items.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.productId) {
        errors.push(`Item ${index + 1}: Product selection is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate purchase order number
 * Uses current timestamp approach to avoid hardcoding
 */
export function generatePONumber(prefix: string = 'PO'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${randomSuffix}`;
}

/**
 * Calculate extended line totals for display
 */
export function calculateLineExtended(
  quantity: number,
  pricing: ProductPricing
): {
  extendedList: number;
  extendedNet: number;
  extendedCrv: number;
  extendedBillBack: number;
} {
  return {
    extendedList: quantity * (pricing.purchase_cost || 0),
    extendedNet: quantity * calculateNetCost(pricing),
    extendedCrv: quantity * (pricing.crv || 0),
    extendedBillBack: quantity * (pricing.bill_back || 0)
  };
}