import React from 'react';
import logoPath from "@assets/logo_1749078044715.png";

interface PurchaseOrderPDFProps {
  purchaseOrder: any;
}

export const PurchaseOrderPDF: React.FC<PurchaseOrderPDFProps> = ({ purchaseOrder }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[$,]/g, '')) : amount;
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatWeight = (weight: number) => {
    return weight % 1 === 0 ? Math.round(weight).toLocaleString('en-US') : weight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateExtendedValues = (item: any) => {
    const qty = item.quantityOrdered || 0;
    const listCost = item.listCost || 0;
    const netCost = item.netCost || 0;
    const weight = item.purchaseWeight || 0;
    const crv = item.purchaseCrv || 0;

    return {
      extNet: netCost * qty,
      extWeight: weight * qty,
      extCrv: crv * qty,
      extList: listCost * qty
    };
  };

  const calculateTotals = () => {
    if (!purchaseOrder.items) return { 
      quantity: 0, 
      extNet: 0, 
      extWeight: 0, 
      extCrv: 0, 
      extList: 0,
      offInvoice: 0,
      billBack: 0
    };
    
    return purchaseOrder.items.reduce((totals: any, item: any) => {
      const qty = item.quantityOrdered || 0;
      const extValues = calculateExtendedValues(item);
      
      return {
        quantity: totals.quantity + qty,
        extNet: totals.extNet + extValues.extNet,
        extWeight: totals.extWeight + extValues.extWeight,
        extCrv: totals.extCrv + extValues.extCrv,
        extList: totals.extList + extValues.extList,
        offInvoice: totals.offInvoice + ((item.offInvoice || 0) * qty),
        billBack: totals.billBack + ((item.billBack || 0) * qty)
      };
    }, { quantity: 0, extNet: 0, extWeight: 0, extCrv: 0, extList: 0, offInvoice: 0, billBack: 0 });
  };

  const calculateTotalsByConfig = () => {
    if (!purchaseOrder.items) return {};
    
    const configTotals: { [key: string]: number } = {};
    
    purchaseOrder.items.forEach((item: any) => {
      const qty = item.quantityOrdered || 0;
      const configName = item.configuration?.configurationName || 'Case';
      
      if (configTotals[configName]) {
        configTotals[configName] += qty;
      } else {
        configTotals[configName] = qty;
      }
    });
    
    return configTotals;
  };

  const totals = calculateTotals();
  const configTotals = calculateTotalsByConfig();
  const lumpSum = parseFloat(purchaseOrder.lumpSumAllowance || '0');
  const delivery = parseFloat(purchaseOrder.deliveryCharge || '0');
  
  // Calculate final totals with vendor discount
  const discountPercent = parseFloat(purchaseOrder.vendor?.discountPercent || '0');
  let netAfterAllowances = totals.extList - totals.offInvoice - totals.billBack;
  
  if (discountPercent > 0) {
    const discountAmount = totals.extList * discountPercent;
    netAfterAllowances -= discountAmount;
  }
  
  const finalTotal = netAfterAllowances + lumpSum + delivery;

  const hasCrvValues = purchaseOrder.items?.some((item: any) => (item.purchaseCrv || 0) > 0);

  return (
    <div className="hidden print:block print:absolute print:inset-0 print:z-50">
      <style>{`
        @media print {
          * {
            visibility: hidden;
          }
          
          .pdf-wrapper, .pdf-wrapper * {
            visibility: visible;
          }
          
          .pdf-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }
        }
        
        @page {
          size: letter landscape;
          margin: 0.3cm;
        }
        
        .pdf-wrapper {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.3;
          color: #000;
          margin: 0;
          padding: 5px;
        }
        
        .pdf-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }
        
        .pdf-title {
          font-size: 28px;
          font-weight: bold;
          text-align: center;
          flex: 1;
        }
        
        .pdf-po-info {
          text-align: right;
          font-size: 12px;
        }
        
        .pdf-info-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }
        
        .pdf-info-block {
          border: 1px solid #000;
          padding: 8px;
          min-height: 80px;
        }
        
        .pdf-info-title {
          font-weight: bold;
          font-size: 13px;
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
          padding-bottom: 2px;
        }
        
        .pdf-items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 10px;
        }
        
        .pdf-items-table th,
        .pdf-items-table td {
          border: 1px solid #000;
          padding: 5px;
          text-align: left;
        }
        
        .pdf-items-table th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
          font-size: 9px;
        }
        
        .pdf-items-table .text-right {
          text-align: right;
        }
        
        .pdf-items-table .text-center {
          text-align: center;
        }
        
        .pdf-totals-row {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        
        .pdf-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }
        
        .pdf-signature {
          border: 1px solid #000;
          padding: 10px;
          height: 100px;
        }
        
        .pdf-totals {
          border: 1px solid #000;
          padding: 10px;
        }
        
        .pdf-total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .pdf-final-total {
          font-weight: bold;
          font-size: 12px;
          border-top: 2px solid #000;
          padding-top: 5px;
        }
      `}</style>

      <div className="pdf-wrapper">
        {/* Header */}
        <div className="pdf-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src={logoPath} 
              alt="Company Logo" 
              style={{ height: '90px', width: 'auto' }}
            />
          </div>
          <div className="pdf-title">PURCHASE ORDER</div>
          <div className="pdf-po-info">
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>PO# {purchaseOrder.poNumber}</div>
            <div>Date: {formatDate(purchaseOrder.orderDate)}</div>
            <div>Status: {purchaseOrder.status}</div>
          </div>
        </div>

        {/* Information Section */}
        <div className="pdf-info-section">
          {/* Vendor Information */}
          <div className="pdf-info-block">
            <div className="pdf-info-title">Vendor</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{purchaseOrder.vendor?.name}</div>
            {purchaseOrder.vendor?.address && (
              <div>
                <div>{purchaseOrder.vendor.address}</div>
                {purchaseOrder.vendor.city && purchaseOrder.vendor.state && (
                  <div>{purchaseOrder.vendor.city}, {purchaseOrder.vendor.state} {purchaseOrder.vendor.zipCode || ''}</div>
                )}
              </div>
            )}
            {purchaseOrder.vendor?.contactName && (
              <div>Contact: {purchaseOrder.vendor.contactName}</div>
            )}
            {purchaseOrder.vendor?.phone && (
              <div>Phone: {purchaseOrder.vendor.phone}</div>
            )}
          </div>

          {/* Shipping Information */}
          <div className="pdf-info-block">
            <div className="pdf-info-title">Ship To</div>
            {purchaseOrder.defaultShipToStore ? (
              <div>
                <div style={{ fontWeight: 'bold' }}>{purchaseOrder.defaultShipToStore.name}</div>
                <div>{purchaseOrder.defaultShipToStore.address}</div>
                <div>{purchaseOrder.defaultShipToStore.city}, {purchaseOrder.defaultShipToStore.state} {purchaseOrder.defaultShipToStore.zipCode}</div>
                {purchaseOrder.defaultShipToStore.phone && <div>Phone: {purchaseOrder.defaultShipToStore.phone}</div>}
              </div>
            ) : purchaseOrder.shipToLocation ? (
              <div>
                <div style={{ fontWeight: 'bold' }}>{purchaseOrder.shipToLocation.name}</div>
                <div>{purchaseOrder.shipToLocation.address}</div>
                <div>{purchaseOrder.shipToLocation.city}, {purchaseOrder.shipToLocation.state} {purchaseOrder.shipToLocation.zipCode}</div>
              </div>
            ) : (
              <div>Warehouse</div>
            )}
          </div>

          {/* Bill To Information */}
          <div className="pdf-info-block">
            <div className="pdf-info-title">Bill To</div>
            <div>
              <div style={{ fontWeight: 'bold' }}>Main Office</div>
              <div>123 Business Street</div>
              <div>City, State 12345</div>
              <div>Phone: (555) 123-4567</div>
            </div>
          </div>

          {/* Order Details */}
          <div className="pdf-info-block">
            <div className="pdf-info-title">Order Details</div>
            <div>Order Date: {formatDate(purchaseOrder.orderDate)}</div>
            {purchaseOrder.expectedDate && (
              <div>Expected Date: {formatDate(purchaseOrder.expectedDate)}</div>
            )}
            {purchaseOrder.vendor?.discountPercent && (
              <div>
                Terms: {(parseFloat(purchaseOrder.vendor.discountPercent) * 100).toFixed(1)}% {purchaseOrder.vendor.epDays || 0} Days Net {purchaseOrder.vendor.netDays || 0}
              </div>
            )}
            <div>Total Items: {totals.quantity}</div>
            <div>Total Weight: {formatWeight(totals.extWeight)}</div>
          </div>
        </div>

        {/* Items Table */}
        <table className="pdf-items-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>Qty</th>
              <th style={{ width: '8%' }}>Config</th>
              <th style={{ width: '28%' }}>Description</th>
              <th style={{ width: '8%' }}>List Cost</th>
              <th style={{ width: '8%' }}>Off Invoice</th>
              <th style={{ width: '8%' }}>Net Cost</th>
              <th style={{ width: '7%' }}>Weight</th>
              {hasCrvValues && <th style={{ width: '6%' }}>CRV</th>}
              <th style={{ width: '8%' }}>Ext. Net</th>
              <th style={{ width: '8%' }}>Ext. Weight</th>
              <th style={{ width: '8%' }}>Ext. List</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.items?.map((item: any, index: number) => {
              const extValues = calculateExtendedValues(item);
              const configName = item.configuration?.configurationName || 
                                (item.purchaseCfg ? 'Pallet' : 'Items');
              
              return (
                <tr key={index}>
                  <td className="text-center">{item.quantityOrdered}</td>
                  <td className="text-center">{configName}</td>
                  <td>{item.product?.product_description || `Product ${item.productId}`}</td>
                  <td className="text-right">${formatCurrency(item.listCost || 0)}</td>
                  <td className="text-right">${formatCurrency(item.offInvoice || 0)}</td>
                  <td className="text-right">${formatCurrency(item.netCost || 0)}</td>
                  <td className="text-right">{formatWeight(item.purchaseWeight || 0)}</td>
                  {hasCrvValues && <td className="text-right">${formatCurrency(item.purchaseCrv || 0)}</td>}
                  <td className="text-right">${formatCurrency(extValues.extNet)}</td>
                  <td className="text-right">{formatWeight(extValues.extWeight)}</td>
                  <td className="text-right">${formatCurrency(extValues.extList)}</td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="pdf-totals-row">
              <td className="text-center">{totals.quantity}</td>
              <td colSpan={hasCrvValues ? 6 : 5}></td>
              <td className="text-right">{formatWeight(totals.extWeight)}</td>
              {hasCrvValues && <td className="text-right">${formatCurrency(totals.extCrv)}</td>}
              <td className="text-right">${formatCurrency(totals.extNet)}</td>
              <td className="text-right">{formatWeight(totals.extWeight)}</td>
              <td className="text-right">${formatCurrency(totals.extList)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', marginTop: '8px' }}>
          {/* Signature Section */}
          <div className="pdf-signature">
            <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>Received By:</div>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '10px', height: '20px' }}></div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Date:</div>
            <div style={{ borderBottom: '1px solid #000', height: '20px' }}></div>
          </div>

          {/* Summary Totals - Items and Weight */}
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '10px', minWidth: '180px' }}>
            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Total Items</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '3px' }}>{totals.quantity}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '5px', fontSize: '9px' }}>
                {Object.entries(configTotals).map(([config, count]) => (
                  <div key={config} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold' }}>{count}</div>
                    <div>{config}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Total Weight</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '3px' }}>{formatWeight(totals.extWeight)} lbs</div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="pdf-totals">
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Cost Breakdown</div>
            
            <div className="pdf-total-line">
              <span>Ext. List Total:</span>
              <span>${formatCurrency(totals.extList)}</span>
            </div>
            
            <div className="pdf-total-line">
              <span>Off Invoice Allowances:</span>
              <span>-${formatCurrency(totals.offInvoice)}</span>
            </div>
            
            <div className="pdf-total-line">
              <span>Bill Back Allowances:</span>
              <span>-${formatCurrency(totals.billBack)}</span>
            </div>
            
            {discountPercent > 0 && (
              <div className="pdf-total-line">
                <span>Vendor Discount ({(discountPercent * 100).toFixed(1)}%):</span>
                <span>-${formatCurrency(totals.extList * discountPercent)}</span>
              </div>
            )}
            
            {lumpSum !== 0 && (
              <div className="pdf-total-line">
                <span>Lump Sum {lumpSum > 0 ? 'Charge' : 'Allowance'}:</span>
                <span>{lumpSum > 0 ? '+' : ''}${formatCurrency(Math.abs(lumpSum))}</span>
              </div>
            )}
            
            {delivery !== 0 && (
              <div className="pdf-total-line">
                <span>Delivery Charge:</span>
                <span>+${formatCurrency(delivery)}</span>
              </div>
            )}
            
            <div className="pdf-total-line pdf-final-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {purchaseOrder.specialInstructions && (
          <div style={{ marginTop: '15px', border: '1px solid #000', padding: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Special Instructions:</div>
            <div>{purchaseOrder.specialInstructions}</div>
          </div>
        )}

        {/* Notes */}
        {purchaseOrder.notes && (
          <div style={{ marginTop: '15px', border: '1px solid #000', padding: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Notes:</div>
            <div>{purchaseOrder.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
};