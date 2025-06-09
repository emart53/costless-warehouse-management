/**
 * Format numbers with commas for thousands separators
 */
export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[,$]/g, '')) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDecimal(value: string | number, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[,$]/g, '')) : value;
  if (isNaN(num)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}