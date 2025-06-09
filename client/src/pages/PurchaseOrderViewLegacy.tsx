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

    if (purchaseOrder.items) {
      purchaseOrder.items.forEach((item: PurchaseOrderItem) => {
        const quantity = item.quantityOrdered || 0;
        const listCost = parseFloat(item.listCost?.toString() || '0');
        const offInvoice = parseFloat(item.offInvoice?.toString() || '0');
        const billBack = parseFloat(item.billBack?.toString() || '0');
        const weight = parseFloat(item.purchaseWeight?.toString() || '0');
        const productCrv = parseFloat(item.product?.crv?.toString() || '0');
        const crv = quantity * productCrv;

        const netCost = listCost - offInvoice;
        const extendedCost = quantity * netCost;
        
        subtotal += extendedCost;
        totalWeight += weight;
        totalBillBack += billBack;
        totalCrv += crv;
      });
    }

    const deliveryCharge = parseFloat(purchaseOrder.deliveryCharge || '0');
    const lumpSumAllowance = parseFloat(purchaseOrder.lumpSumAllowance || '0');
    
    const netInvoiceCost = subtotal + deliveryCharge + totalCrv;
    const totalInvoiceCost = netInvoiceCost - totalBillBack - lumpSumAllowance;

    return {
      subtotal,
      totalWeight,
      totalBillBack,
      totalCrv,
      deliveryCharge,
      lumpSumAllowance,
      netInvoiceCost,
      totalInvoiceCost
    };
  };

  const totals = calculateTotals();
  const hasBillBackValues = purchaseOrder.items?.some((item: PurchaseOrderItem) => item.billBack && parseFloat(item.billBack.toString()) > 0) || false;
  const hasCrvValues = purchaseOrder.items?.some((item: PurchaseOrderItem) => item.purchaseCrv && parseFloat(item.purchaseCrv.toString()) > 0) || false;

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
              <div><span className="font-medium">Terms:</span> Net 30</div>
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
        <div className="border-t border-b border-gray-800 py-1 mb-2">
          <div className="grid grid-cols-12 gap-2 text-sm font-bold">
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">UPC</div>
            <div className="col-span-3">Item Description</div>
            <div className="col-span-1 text-right">List Cost</div>
            <div className="col-span-1 text-right">Off Invoice</div>
            {hasBillBackValues && <div className="col-span-1 text-right">Bill Back</div>}
            {hasCrvValues && <div className="col-span-1 text-right">CRV</div>}
            <div className="col-span-1 text-right">Total Weight</div>
            <div className="col-span-1 text-right">Billed Cost</div>
            <div className="col-span-1 text-right">Extended Cost</div>
          </div>
        </div>

        {/* Line Items */}
        {purchaseOrder.items?.map((item: PurchaseOrderItem, index: number) => {
          const quantity = item.quantityOrdered || 0;
          const listCost = parseFloat(item.listCost?.toString() || '0');
          const offInvoice = parseFloat(item.offInvoice?.toString() || '0');
          const billBack = parseFloat(item.billBack?.toString() || '0');
          const weight = parseFloat(item.purchaseWeight?.toString() || '0');
          const crv = parseFloat(item.purchaseCrv?.toString() || '0');
          const netCost = listCost - offInvoice;
          const extendedCost = quantity * netCost;

          return (
            <div key={item.id || index} className="mb-1">
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-1">{quantity}</div>
                <div className="col-span-1">{item.product?.caseUpc || ''}</div>
                <div className="col-span-3">
              {item.product?.name || item.product?.productDescription || 'N/A'} {item.product?.casePack && `${item.product.casePack}/`}{item.product?.size || ''}
            </div>
                <div className="col-span-1 text-right">${listCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="col-span-1 text-right">${offInvoice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                {hasBillBackValues && (
                  <div className="col-span-1 text-right">${billBack.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                )}
                {hasCrvValues && (
                  <div className="col-span-1 text-right">${crv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                )}
                <div className="col-span-1 text-right">{weight.toFixed(2)}</div>
                <div className="col-span-1 text-right">${netCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="col-span-1 text-right">${extendedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              {/* Total weight line for each item */}
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-7"></div>
                <div className="col-span-1 text-right">{weight.toFixed(2)}</div>
                <div className="col-span-4"></div>
              </div>
            </div>
          );
        })}

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
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Backhaul Allowance:</span>
                <span>$0.00</span>
                <span className="text-xs ml-2">Back Haul will be Deducted</span>
              </div>
              <div className="flex justify-between">
                <span>Lump Sum Allowance:</span>
                <span>${totals.lumpSumAllowance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs ml-2">Lump Sum will be Deducted</span>
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