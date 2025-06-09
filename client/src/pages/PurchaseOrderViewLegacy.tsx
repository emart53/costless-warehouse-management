import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Printer } from "lucide-react";
import logoPath from "@assets/logo_1749078044715.png";

interface PurchaseOrderItem {
  id?: number;
  productId: number;
  quantityOrdered: number;
  listCost: number;
  offInvoice: number;
  billBack: number;
  netCost: number;
  purchaseWeight: number;
  purchaseCrv: number;
  purchaseCfg?: number;
  product?: {
    productDescription: string;
    casePack: number;
    size: string;
    caseUpc?: string;
  };
  configuration?: {
    configurationName: string;
  };
}

export default function PurchaseOrderViewLegacy() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: purchaseOrder, isLoading } = useQuery({
    queryKey: [`/api/purchase-orders/${id}`],
    enabled: !!id,
  });

  const handleEdit = () => {
    setLocation(`/purchase-orders/edit/${id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Check if any items have bill back or CRV data for conditional column display
  const hasBillBack = purchaseOrder?.items?.some(item => 
    item.billBack && parseFloat(item.billBack.toString()) > 0
  ) || false;
  
  const hasCRV = purchaseOrder?.items?.some(item => 
    item.product?.crv && parseFloat(item.product.crv.toString()) > 0
  ) || false;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Purchase Order Not Found</h2>
          <p className="text-gray-600 mt-2">The requested purchase order could not be found.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setLocation("/purchase-orders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    );
  }

  // Calculate totals like legacy system
  const calculateTotals = () => {
    let subtotal = 0;
    let totalWeight = 0;
    let totalBillBack = 0;
    let totalCrv = 0;
    let totalExtendedListCost = 0;

    if (purchaseOrder.items) {
      purchaseOrder.items.forEach((item: PurchaseOrderItem) => {
        const quantity = item.quantityOrdered || 0;
        const listCost = parseFloat(item.listCost?.toString() || '0');
        const offInvoice = parseFloat(item.offInvoice?.toString() || '0');
        const billBack = parseFloat(item.billBack?.toString() || '0');
        const weight = parseFloat(item.purchaseWeight?.toString() || '0');
        const productCrv = parseFloat(item.product?.crv?.toString() || '0');
        const crv = quantity * productCrv;
        const extendedListCost = quantity * listCost;

        const netCost = listCost - offInvoice;
        const extendedCost = quantity * netCost;
        
        subtotal += extendedCost;
        totalWeight += weight;
        totalBillBack += billBack;
        totalCrv += crv;
        totalExtendedListCost += extendedListCost;
      });
    }

    const deliveryCharge = parseFloat(purchaseOrder.deliveryCharge || '0');
    const lumpSumAllowance = parseFloat(purchaseOrder.lumpSumAllowance || '0');
    
    // Calculate vendor discount if available
    const vendorDiscountPercent = parseFloat(purchaseOrder.vendor?.discountPercent || '0');
    const vendorDiscount = subtotal * vendorDiscountPercent;
    
    const netInvoiceCost = subtotal + deliveryCharge + totalCrv;
    const totalInvoiceCost = netInvoiceCost - totalBillBack - lumpSumAllowance - vendorDiscount;

    return {
      subtotal,
      totalWeight,
      totalBillBack,
      totalCrv,
      totalExtendedListCost,
      deliveryCharge,
      lumpSumAllowance,
      vendorDiscount,
      vendorDiscountPercent,
      netInvoiceCost,
      totalInvoiceCost
    };
  };

  const totals = calculateTotals();
  const hasBillBackValues = purchaseOrder.items?.some((item: PurchaseOrderItem) => item.billBack && parseFloat(item.billBack.toString()) > 0) || false;
  const hasCrvValues = purchaseOrder.items?.some((item: PurchaseOrderItem) => {
    const productCrv = parseFloat(item.product?.crv?.toString() || '0');
    return productCrv > 0;
  }) || false;

  return (
    <div className="max-w-none p-4 bg-white min-h-screen print:p-0 print:m-0">
      {/* Navigation - Screen Only */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/purchase-orders")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Orders
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Legacy Document Format */}
      <div className="print:font-mono print:text-sm">
        {/* Header Row - Matches PO-20929 exactly */}
        <div className="grid grid-cols-12 items-start mb-4 print:mb-2">
          <div className="col-span-3">
            <div className="text-2xl font-bold">COST LESS FOOD COMPANY</div>
          </div>
          
          <div className="col-span-6"></div>
          
          <div className="col-span-2 text-center">
            <div className="text-2xl font-bold">Purchase Order</div>
            <div className="text-sm">Page 1 of 1</div>
          </div>
          
          <div className="col-span-1 text-right">
            <div className="text-lg font-bold">#: {purchaseOrder.poNumber}</div>
          </div>
        </div>

        {/* Vendor and Details Row */}
        <div className="grid grid-cols-12 gap-4 mb-6 print:mb-4">
          {/* Vendor Info */}
          <div className="col-span-3">
            <div className="font-bold text-base">{purchaseOrder.vendor?.name || 'N/A'}</div>
            {purchaseOrder.vendor?.address ? (
              <div className="text-sm">
                {purchaseOrder.vendor.address}<br />
                {purchaseOrder.vendor.city && purchaseOrder.vendor.state && 
                  `${purchaseOrder.vendor.city}, ${purchaseOrder.vendor.state} ${purchaseOrder.vendor.zipCode || ''}`}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">Address on file</div>
            )}
            {purchaseOrder.vendor?.phone ? (
              <div className="text-sm mt-2">{purchaseOrder.vendor.phone}</div>
            ) : (
              <div className="text-sm mt-2 text-gray-500 italic">Phone on file</div>
            )}
            {purchaseOrder.vendor?.contactName && (
              <div className="text-sm font-medium mt-2">{purchaseOrder.vendor.contactName}</div>
            )}
          </div>

          {/* Order Details */}
          <div className="col-span-3">
            <div className="text-sm space-y-1">
              <div><span className="font-medium">Purchase Order Date:</span> {new Date(purchaseOrder.orderDate).toLocaleDateString()}</div>
              {purchaseOrder.expectedDate && (
                <div><span className="font-medium">Expected Delivery Date:</span> {new Date(purchaseOrder.expectedDate).toLocaleDateString()}</div>
              )}
              <div><span className="font-medium">Terms:</span> {purchaseOrder.vendor?.paymentTerms || 'Net 30'}</div>
            </div>
            
            {purchaseOrder.specialInstructions && (
              <div className="mt-4">
                <div className="font-medium text-sm">Special Instructions:</div>
                <div className="text-sm">{purchaseOrder.specialInstructions}</div>
              </div>
            )}
          </div>

          {/* Bill To */}
          <div className="col-span-3">
            <div className="font-medium text-sm">Bill To: Cost Less Accounting</div>
            <div className="text-sm">
              102 S. 11th Ave<br />
              Hanford, CA 93230
            </div>
          </div>

          {/* Ship To & Financial Summary */}
          <div className="col-span-3">
            <div className="font-medium text-sm">ShipTo: Cost Less Warehouse</div>
            <div className="text-sm">
              2905 Railroad Ave<br />
              Ceres, CA 95307<br />
              209-537-4472<br />
              Mark Niewig / Clay Nibler
            </div>
            
            <div className="mt-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span>BackHaul:</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Lump Sum:</span>
                <span>${Math.abs(totals.lumpSumAllowance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span>${totals.deliveryCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table Header */}
        <div className="border border-gray-400 bg-gray-100 text-center">
          <div className={`grid gap-0 text-base font-bold py-2 ${hasCRV ? 'grid-cols-13' : hasBillBack ? 'grid-cols-12' : 'grid-cols-11'}`} style={{ gridTemplateColumns: `80px 400px 70px 110px 110px ${hasBillBack ? '110px ' : ''}85px 110px 110px 110px${hasCRV ? ' 80px 110px' : ''} 120px` }}>
            <div className="border-r border-gray-400 px-1">QTY</div>
            <div className="border-r border-gray-400 px-1">Product</div>
            <div className="border-r border-gray-400 px-1">Config</div>
            <div className="border-r border-gray-400 px-1">List Cost</div>
            <div className="border-r border-gray-400 px-1">Off Invoice</div>
            {hasBillBack && <div className="border-r border-gray-400 px-1">Bill Back</div>}
            <div className="border-r border-gray-400 px-1">Weight</div>
            <div className="border-r border-gray-400 px-1">Ext Weight</div>
            <div className="border-r border-gray-400 px-1">Billed Cost</div>
            <div className="border-r border-gray-400 px-1">Ext Cost</div>
            {hasCRV && <div className="border-r border-gray-400 px-1">CRV</div>}
            {hasCRV && <div className="border-r border-gray-400 px-1">Ext CRV</div>}
            <div className="px-1">Ext List Cost</div>
          </div>
        </div>

        {/* Line Items */}
        {purchaseOrder.items?.map((item: PurchaseOrderItem, index: number) => {
          const quantity = item.quantityOrdered || 0;
          const listCost = parseFloat(item.listCost?.toString() || '0');
          const offInvoice = parseFloat(item.offInvoice?.toString() || '0');
          const billBack = parseFloat(item.billBack?.toString() || '0');
          const weight = parseFloat(item.purchaseWeight?.toString() || '0');
          const productCrv = parseFloat(item.product?.crv?.toString() || '0');
          const extendedListCost = listCost * quantity;
          const billedCost = listCost - offInvoice - billBack;
          const extendedWeight = weight * quantity;
          const extendedCost = billedCost * quantity;
          const extendedCrv = productCrv * quantity;

          return (
            <div key={item.id || index} className="border-b border-gray-300">
              <div className={`grid gap-0 text-base py-2 ${hasCRV ? 'grid-cols-13' : hasBillBack ? 'grid-cols-12' : 'grid-cols-11'}`} style={{ gridTemplateColumns: `80px 400px 70px 110px 110px ${hasBillBack ? '110px ' : ''}85px 110px 110px 110px${hasCRV ? ' 80px 110px' : ''} 120px` }}>
                <div className="border-r border-gray-300 px-1 text-center">{quantity}</div>
                <div className="border-r border-gray-300 px-1">
                  {item.product?.name || item.product?.productDescription || 'N/A'} {item.product?.casePack && `${item.product.casePack}/`}{item.product?.size || ''}
                </div>
                <div className="border-r border-gray-300 px-1 text-center">{item.configuration?.configurationName || 'Case'}</div>
                <div className="border-r border-gray-300 px-1 text-right">${listCost.toFixed(2)}</div>
                <div className="border-r border-gray-300 px-1 text-right">${offInvoice.toFixed(2)}</div>
                {hasBillBack && <div className="border-r border-gray-300 px-1 text-right">${billBack.toFixed(2)}</div>}
                <div className="border-r border-gray-300 px-1 text-right">{weight.toFixed(2)}</div>
                <div className="border-r border-gray-300 px-1 text-right">{extendedWeight.toFixed(2)}</div>
                <div className="border-r border-gray-300 px-1 text-right">${billedCost.toFixed(2)}</div>
                <div className="border-r border-gray-300 px-1 text-right">${extendedCost.toFixed(2)}</div>
                {hasCRV && <div className="border-r border-gray-300 px-1 text-right">${productCrv.toFixed(2)}</div>}
                {hasCRV && <div className="border-r border-gray-300 px-1 text-right">${extendedCrv.toFixed(2)}</div>}
                <div className="px-1 text-right">${extendedListCost.toFixed(2)}</div>
              </div>
            </div>
          );
        })}

        {/* Total Row */}
        <div className="border-b border-gray-400 bg-gray-50">
          <div className={`grid gap-0 text-lg font-bold py-3 ${hasCRV ? 'grid-cols-13' : hasBillBack ? 'grid-cols-12' : 'grid-cols-11'}`} style={{ gridTemplateColumns: `80px 400px 70px 110px 110px ${hasBillBack ? '110px ' : ''}85px 110px 110px 110px${hasCRV ? ' 80px 110px' : ''} 120px` }}>
            <div className="border-r border-gray-300 px-1 text-right"></div>
            <div className="border-r border-gray-300 px-1 text-right"></div>
            <div className="border-r border-gray-300 px-1 text-right"></div>
            <div className="border-r border-gray-300 px-1 text-right"></div>
            <div className="border-r border-gray-300 px-1 text-right"></div>
            {hasBillBack && <div className="border-r border-gray-300 px-1 text-right"></div>}
            <div className="border-r border-gray-300 px-1 text-right">
              {purchaseOrder.items?.reduce((sum, item) => {
                const weight = parseFloat(item.purchaseWeight?.toString() || '0');
                return sum + (weight * (item.quantityOrdered || 0));
              }, 0).toFixed(2)}
            </div>
            <div className="border-r border-gray-300 px-1 text-right"></div>
            <div className="border-r border-gray-300 px-1 text-right">
              ${purchaseOrder.items?.reduce((sum, item) => {
                const quantity = item.quantityOrdered || 0;
                const listCost = parseFloat(item.listCost?.toString() || '0');
                const offInvoice = parseFloat(item.offInvoice?.toString() || '0');
                const billBack = parseFloat(item.billBack?.toString() || '0');
                const billedCost = listCost - offInvoice - billBack;
                return sum + (quantity * billedCost);
              }, 0).toFixed(2)}
            </div>
            {hasCRV && <div className="border-r border-gray-300 px-1 text-right"></div>}
            {hasCRV && <div className="border-r border-gray-300 px-1 text-right">
              ${purchaseOrder.items?.reduce((sum, item) => {
                const quantity = item.quantityOrdered || 0;
                const productCrv = parseFloat(item.product?.crv?.toString() || '0');
                return sum + (quantity * productCrv);
              }, 0).toFixed(2)}
            </div>}
            <div className="px-1 text-right">
              ${purchaseOrder.items?.reduce((sum, item) => {
                const quantity = item.quantityOrdered || 0;
                const listCost = parseFloat(item.listCost?.toString() || '0');
                return sum + (quantity * listCost);
              }, 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Signature and Totals Section */}
        <div className="mt-8 print:mt-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Left: Signature */}
            <div>
              <div className="mb-4">
                <div className="text-sm font-bold">Received By:</div>
                <div className="border-b border-gray-400 mt-8 mb-4"></div>
                <div className="text-sm font-bold">Date:</div>
                <div className="border-b border-gray-400 mt-8"></div>
              </div>
            </div>

            {/* Right: Financial Summary */}
            <div className="text-sm space-y-1">
              {totals.vendorDiscountPercent > 0 && (
                <div className="flex justify-between">
                  <span>Early Payment Discount ({(totals.vendorDiscountPercent * 100).toFixed(1)}%):</span>
                  <span>${totals.vendorDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Backhaul Allowance:</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Lump Sum Allowance:</span>
                <span>${totals.lumpSumAllowance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span>${totals.deliveryCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {hasCrvValues && (
                <div className="flex justify-between">
                  <span>Net Extended CRV:</span>
                  <span>${totals.totalCrv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Net Invoice Cost:</span>
                <span>${totals.netInvoiceCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {hasBillBackValues && (
                <div className="flex justify-between">
                  <span>Total Bill Back:</span>
                  <span>${totals.totalBillBack.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-xs ml-2">Bill Back will be Deducted</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total Invoice Cost:</span>
                <span>${totals.totalInvoiceCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Footer */}
        <div className="text-right mt-8 print:mt-6">
          <div className="text-sm">{new Date(purchaseOrder.orderDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
    </div>
  );
}