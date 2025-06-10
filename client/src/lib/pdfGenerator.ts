// PDF Generation Utility for Purchase Orders
// Uses browser-native printing capabilities to avoid external dependencies

export interface PDFPurchaseOrder {
  poNumber: string;
  orderDate: string;
  expectedDate?: string;
  vendor: {
    name: string;
    address?: string;
    contact?: string;
    phone?: string;
    email?: string;
  };
  billTo: {
    name: string;
    address: string;
  };
  shipTo: {
    name: string;
    address: string;
  };
  items: Array<{
    productId: number;
    description: string;
    configuration: string;
    quantity: number;
    unitCost: number;
    offInvoice: number;
    billBack: number;
    extendedCost: number;
  }>;
  totals: {
    subtotal: number;
    offInvoiceTotal: number;
    billBackTotal: number;
    lumpSumAllowance: number;
    deliveryCharge: number;
    discount: number;
    total: number;
  };
  notes?: string;
  terms?: string;
}

/**
 * Generate print-ready HTML for purchase order
 */
export function generatePOPrintHTML(po: PDFPurchaseOrder): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Order ${po.poNumber}</title>
      <style>
        @media print {
          @page { margin: 0.5in; }
          body { margin: 0; }
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        
        .company-info h1 {
          margin: 0;
          font-size: 24px;
          color: #2563eb;
        }
        
        .po-info {
          text-align: right;
        }
        
        .po-info h2 {
          margin: 0;
          font-size: 18px;
          color: #dc2626;
        }
        
        .addresses {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .address-block {
          width: 30%;
        }
        
        .address-block h3 {
          margin: 0 0 5px 0;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #d1d5db;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .items-table th,
        .items-table td {
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
        }
        
        .items-table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        
        .items-table .number {
          text-align: right;
        }
        
        .totals {
          margin-left: auto;
          width: 300px;
        }
        
        .totals table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .totals td {
          padding: 5px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .totals .total-row {
          font-weight: bold;
          border-top: 2px solid #000;
        }
        
        .notes {
          margin-top: 20px;
          padding: 10px;
          background-color: #f9fafb;
          border: 1px solid #d1d5db;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>Cost Less Foods</h1>
          <p>Warehouse Purchase Order</p>
        </div>
        <div class="po-info">
          <h2>PO# ${po.poNumber}</h2>
          <p><strong>Order Date:</strong> ${po.orderDate}</p>
          ${po.expectedDate ? `<p><strong>Expected:</strong> ${po.expectedDate}</p>` : ''}
        </div>
      </div>
      
      <div class="addresses">
        <div class="address-block">
          <h3>Vendor</h3>
          <p><strong>${po.vendor.name}</strong></p>
          ${po.vendor.address ? `<p>${po.vendor.address}</p>` : ''}
          ${po.vendor.contact ? `<p>Contact: ${po.vendor.contact}</p>` : ''}
          ${po.vendor.phone ? `<p>Phone: ${po.vendor.phone}</p>` : ''}
          ${po.vendor.email ? `<p>Email: ${po.vendor.email}</p>` : ''}
        </div>
        
        <div class="address-block">
          <h3>Bill To</h3>
          <p><strong>${po.billTo.name}</strong></p>
          <p>${po.billTo.address}</p>
        </div>
        
        <div class="address-block">
          <h3>Ship To</h3>
          <p><strong>${po.shipTo.name}</strong></p>
          <p>${po.shipTo.address}</p>
        </div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Description</th>
            <th>Config</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Off Invoice</th>
            <th>Bill Back</th>
            <th>Extended</th>
          </tr>
        </thead>
        <tbody>
          ${po.items.map(item => `
            <tr>
              <td>${item.productId}</td>
              <td>${item.description}</td>
              <td>${item.configuration}</td>
              <td class="number">${item.quantity}</td>
              <td class="number">${formatCurrency(item.unitCost.toFixed(2))}</td>
              <td class="number">${formatCurrency(item.offInvoice.toFixed(2))}</td>
              <td class="number">${formatCurrency(item.billBack.toFixed(2))}</td>
              <td class="number">$${item.extendedCost.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="number">$${po.totals.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Off Invoice Total:</td>
            <td class="number">-${formatCurrency(po.totals.offInvoiceTotal.toFixed(2))}</td>
          </tr>
          <tr>
            <td>Bill Back Total:</td>
            <td class="number">-${formatCurrency(po.totals.billBackTotal.toFixed(2))}</td>
          </tr>
          <tr>
            <td>Lump Sum Allowance:</td>
            <td class="number">-${formatCurrency(po.totals.lumpSumAllowance.toFixed(2))}</td>
          </tr>
          <tr>
            <td>Delivery Charge:</td>
            <td class="number">${formatCurrency(po.totals.deliveryCharge.toFixed(2))}</td>
          </tr>
          <tr>
            <td>Early Pay Discount:</td>
            <td class="number">-$${po.totals.discount.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td><strong>Total:</strong></td>
            <td class="number"><strong>$${po.totals.total.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>
      
      ${po.notes ? `
        <div class="notes">
          <h3>Notes:</h3>
          <p>${po.notes}</p>
        </div>
      ` : ''}
      
      ${po.terms ? `
        <div class="notes">
          <h3>Terms & Conditions:</h3>
          <p>${po.terms}</p>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Print purchase order using browser's print functionality
 */
export function printPurchaseOrder(po: PDFPurchaseOrder): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the purchase order');
    return;
  }
  
  const htmlContent = generatePOPrintHTML(po);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };
}

/**
 * Download purchase order as HTML file
 */
export function downloadPOAsHTML(po: PDFPurchaseOrder): void {
  const htmlContent = generatePOPrintHTML(po);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `PO_${po.poNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}