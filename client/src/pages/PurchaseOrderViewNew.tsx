import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Building2, Calendar, MapPin, Printer, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PurchaseOrderDetailTableNew } from "@/components/PurchaseOrderDetailTableNew";
import { PurchaseOrderPDF } from "@/components/PurchaseOrderPDF";
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
  };
  configuration?: {
    configurationName: string;
  };
}

export default function PurchaseOrderViewNew() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: purchaseOrder, isLoading } = useQuery({
    queryKey: [`/api/purchase-orders/${id}`],
    enabled: !!id,
  });

  const { data: configurations } = useQuery({
    queryKey: ['/api/configurations'],
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'received': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if any items have bill back or CRV values for conditional display
  const hasBillBackValues = purchaseOrder.items?.some((item: PurchaseOrderItem) => item.billBack && item.billBack > 0) || false;
  const hasCrvValues = purchaseOrder.items?.some((item: PurchaseOrderItem) => item.purchaseCrv && item.purchaseCrv > 0) || false;

  // Calculate extended values for an item
  const calculateExtendedValues = (item: PurchaseOrderItem) => {
    const qty = item.quantityOrdered || 0;
    const netCost = item.listCost - item.offInvoice;
    
    return {
      extNet: netCost * qty,
      extWeight: item.purchaseWeight * qty,
      extCrv: item.purchaseCrv * qty,
      extList: item.listCost * qty,
      netCost
    };
  };

  // Get product description concatenation
  const getProductDescription = (item: PurchaseOrderItem) => {
    if (!item.product) return "Unknown Product";
    const { productDescription, casePack, size } = item.product;
    return `${productDescription} ${casePack}/${size}`;
  };

  // Get configuration name
  const getConfigurationName = (item: PurchaseOrderItem) => {
    if (!item.configuration) {
      // Find configuration by purchaseCfg ID - check both id and configuration_id
      const config = configurations?.find(c => 
        c.id === item.purchaseCfg || 
        c.configuration_id === item.purchaseCfg
      );
      return config ? (config.configuration_name || config.configurationName) : "Case";
    }
    return item.configuration.configurationName;
  };

  return (
    <div className="container mx-auto py-6 space-y-6 print:py-0 print:space-y-4">
      {/* Header with Logo */}
      <div className="flex items-start justify-between print:hidden">
        <div className="flex items-start gap-4">
          <img 
            src={logoPath} 
            alt="Company Logo" 
            className="h-20 w-auto"
          />
          <div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/purchase-orders')}
              className="flex items-center gap-2 mb-2"
            >
              <ArrowLeft size={14} />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Purchase Order {purchaseOrder.poNumber}</h1>
            <Badge className={getStatusColor(purchaseOrder.status)}>
              {purchaseOrder.status || 'Draft'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
          {purchaseOrder.status !== 'Received' && (
            <Button onClick={handleEdit}>
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Purchase Order Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={20} />
            Purchase Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Order Information */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 border-b pb-1">Order Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Order Date:</span><br />
                  <span className="font-medium">{new Date(purchaseOrder.orderDate).toLocaleDateString()}</span>
                </div>
                {purchaseOrder.expectedDate && (
                  <div>
                    <span className="text-gray-500">Expected Date:</span><br />
                    <span className="font-medium">{new Date(purchaseOrder.expectedDate).toLocaleDateString()}</span>
                  </div>
                )}
                {(purchaseOrder.vendor?.discountPercent || purchaseOrder.vendor?.epDays || purchaseOrder.vendor?.netDays) && (
                  <div>
                    <span className="text-gray-500">Terms & Conditions:</span><br />
                    <span className="font-medium">
                      {(() => {
                        const discount = purchaseOrder.vendor?.discountPercent || 0;
                        const epDays = purchaseOrder.vendor?.epDays || 0;
                        const netDays = purchaseOrder.vendor?.netDays || 0;
                        
                        if (discount > 0) {
                          return `${(parseFloat(discount) * 100).toFixed(1)}% ${epDays} Days Net ${netDays}`;
                        } else {
                          return `Net ${netDays} Days`;
                        }
                      })()}
                    </span>
                  </div>
                )}
                {purchaseOrder.specialInstructions && (
                  <div>
                    <span className="text-gray-500">Special Instructions:</span><br />
                    <span className="font-medium">{purchaseOrder.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Vendor Information */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 border-b pb-1">Vendor</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-base">{purchaseOrder.vendor?.name}</span>
                </div>
                {purchaseOrder.vendor?.address && (
                  <div className="text-gray-600">
                    {purchaseOrder.vendor.address}<br />
                    {purchaseOrder.vendor.city && purchaseOrder.vendor.state && 
                      `${purchaseOrder.vendor.city}, ${purchaseOrder.vendor.state} ${purchaseOrder.vendor.zipCode || ''}`}
                  </div>
                )}
                {purchaseOrder.vendor?.contactName && (
                  <div>
                    <span className="text-gray-500">Contact:</span><br />
                    <span>{purchaseOrder.vendor.contactName}</span>
                  </div>
                )}
                {purchaseOrder.vendor?.phone && (
                  <div>
                    <span className="text-gray-500">Phone:</span> {purchaseOrder.vendor.phone}
                  </div>
                )}
              </div>
            </div>
            
            {/* Contact Address Information */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 border-b pb-1">Contact Address</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">
                    {purchaseOrder.defaultShipToStore?.name || 
                     purchaseOrder.shipToLocation?.name || 
                     purchaseOrder.billToLocation?.name || 'Cost Less Warehouse'}
                  </span>
                </div>
                {purchaseOrder.defaultShipToStore?.storeNumber && (
                  <div className="text-gray-600">
                    Store #{purchaseOrder.defaultShipToStore.storeNumber}
                  </div>
                )}
                {(purchaseOrder.defaultShipToStore?.address || 
                  purchaseOrder.shipToLocation?.address || 
                  purchaseOrder.billToLocation?.address) && (
                  <div className="text-gray-600">
                    {purchaseOrder.defaultShipToStore?.address || 
                     purchaseOrder.shipToLocation?.address || 
                     purchaseOrder.billToLocation?.address}<br />
                    {(purchaseOrder.defaultShipToStore?.city && purchaseOrder.defaultShipToStore?.state) ? 
                      `${purchaseOrder.defaultShipToStore.city}, ${purchaseOrder.defaultShipToStore.state} ${purchaseOrder.defaultShipToStore.zipCode || ''}` :
                      (purchaseOrder.shipToLocation?.city && purchaseOrder.shipToLocation?.state) ?
                      `${purchaseOrder.shipToLocation.city}, ${purchaseOrder.shipToLocation.state} ${purchaseOrder.shipToLocation.zipCode || ''}` :
                      (purchaseOrder.billToLocation?.city && purchaseOrder.billToLocation?.state) ?
                      `${purchaseOrder.billToLocation.city}, ${purchaseOrder.billToLocation.state} ${purchaseOrder.billToLocation.zipCode || ''}` : ''
                    }
                  </div>
                )}
                {(purchaseOrder.defaultShipToStore?.phone || 
                  purchaseOrder.shipToLocation?.phone || 
                  purchaseOrder.billToLocation?.phone) && (
                  <div>
                    <span className="text-gray-500">Phone:</span> {purchaseOrder.defaultShipToStore?.phone || 
                                                                     purchaseOrder.shipToLocation?.phone || 
                                                                     purchaseOrder.billToLocation?.phone}
                  </div>
                )}
                {(purchaseOrder.defaultShipToStore?.contactPerson || 
                  purchaseOrder.shipToLocation?.contactPerson || 
                  purchaseOrder.billToLocation?.contactPerson) && (
                  <div>
                    <span className="text-gray-500">Contact:</span> {purchaseOrder.defaultShipToStore?.contactPerson || 
                                                                       purchaseOrder.shipToLocation?.contactPerson || 
                                                                       purchaseOrder.billToLocation?.contactPerson}
                  </div>
                )}
                
                {/* Additional Charges */}
                {((purchaseOrder.lumpSumAllowance && parseFloat(purchaseOrder.lumpSumAllowance) !== 0) || 
                  (purchaseOrder.deliveryCharge && parseFloat(purchaseOrder.deliveryCharge) !== 0)) && (
                  <div className="mt-3 pt-2 border-t">
                    <div className="font-medium text-xs text-gray-700 mb-2">Additional Charges</div>
                    {purchaseOrder.lumpSumAllowance && parseFloat(purchaseOrder.lumpSumAllowance) !== 0 && (
                      <div>
                        <span className="text-gray-500">Lump Sum {parseFloat(purchaseOrder.lumpSumAllowance) > 0 ? 'Charge' : 'Allowance'}:</span><br />
                        <span className={`font-medium {formatCurrency(parseFloat(purchaseOrder.lumpSumAllowance) > 0 ? 'text-red-600' : 'text-green-600')}`}>
                          {parseFloat(purchaseOrder.lumpSumAllowance) > 0 ? '+' : ''}{formatCurrency(Math.abs(parseFloat(purchaseOrder.lumpSumAllowance)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}
                        </span>
                      </div>
                    )}
                    {purchaseOrder.deliveryCharge && parseFloat(purchaseOrder.deliveryCharge) !== 0 && (
                      <div>
                        <span className="text-gray-500">Delivery Charge:</span><br />
                        <span className="font-medium text-red-600">{formatCurrency(parseFloat(purchaseOrder.deliveryCharge).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>



          {purchaseOrder.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="font-medium text-gray-500 mb-2">Notes</h3>
                <div className="text-sm bg-gray-50 p-3 rounded-md">
                  {purchaseOrder.notes}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Purchase Order Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrderDetailTableNew
            items={purchaseOrder.items || []}
            onUpdateItem={() => {}}
            onDeleteItem={() => {}}
            onAddItem={() => {}}
            allProducts={[]}
            configurations={configurations || []}
            isEditable={false}
          />
        </CardContent>
      </Card>

      {/* Order Totals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Order Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantity Summary - Left Side */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 border-b pb-1">Order Summary</h4>
              
              {/* Configuration Breakdown */}
              <div>
                <div className="text-sm text-gray-500 mb-2">Quantity Breakdown</div>
                <div className="space-y-1">
                  {(() => {
                    const configCounts = (purchaseOrder.items || []).reduce((acc: any, item: any) => {
                      const configName = configurations?.find(c => c.configuration_id === item.purchaseCfg)?.configuration_name || 'Case';
                      acc[configName] = (acc[configName] || 0) + (item.quantityOrdered || 0);
                      return acc;
                    }, {});
                    
                    return Object.entries(configCounts).map(([config, count]) => (
                      <div key={config} className="text-sm flex justify-between">
                        <span>{config}{Number(count) !== 1 ? 's' : ''}:</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Items:</span>
                <span className="font-bold">
                  {purchaseOrder.items?.reduce((sum: number, item: PurchaseOrderItem) => sum + item.quantityOrdered, 0) || 0}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Extended Weight:</span>
                <span className="font-bold text-blue-600">
                  {(() => {
                    const totalWeight = (purchaseOrder.items || []).reduce((sum: number, item: any) => 
                      sum + ((item.purchaseWeight || 0) * (item.quantityOrdered || 0)), 0);
                    return totalWeight % 1 === 0 ? Math.round(totalWeight).toLocaleString('en-US') : totalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
            </div>

            {/* Cost Breakdown - Right Side */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 border-b pb-1">Cost Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal (before allowances):</span>
                  <span className="font-medium">
                    {formatCurrency((() => {
                      const items = purchaseOrder.items || [];
                      const total = items.reduce((sum, item) => sum + ((item.listCost || 0) * (item.quantityOrdered || 0)), 0);
                      return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )});
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Off Invoice Allowances:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency((() => {
                      const items = purchaseOrder.items || [];
                      const total = items.reduce((sum, item) => sum + ((item.offInvoice || 0) * (item.quantityOrdered || 0)), 0);
                      return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )});
                    })()}
                  </span>
                </div>
                {(() => {
                  const items = purchaseOrder.items || [];
                  const totalBillBack = items.reduce((sum, item) => sum + ((item.billBack || 0) * (item.quantityOrdered || 0)), 0);
                  if (totalBillBack > 0) {
                    return (
                      <div className="flex justify-between">
                        <span>Bill Back Allowances:</span>
                        <span className="font-medium text-green-600">
                          -${totalBillBack.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  // Add vendor discount line - calculated on Ext. List total
                  const discountPercent = parseFloat(purchaseOrder.vendor?.discountPercent || '0');
                  if (discountPercent > 0) {
                    const items = purchaseOrder.items || [];
                    const extListTotal = items.reduce((sum, item) => sum + ((item.listCost || 0) * (item.quantityOrdered || 0)), 0);
                    const discountAmount = extListTotal * discountPercent;
                    
                    return (
                      <div className="flex justify-between">
                        <span>Vendor Discount ({(discountPercent * 100).toFixed(1)}%):</span>
                        <span className="font-medium text-green-600">
                          -${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  const items = purchaseOrder.items || [];
                  const totalCrv = items.reduce((sum, item) => sum + ((item.purchaseCrv || 0) * (item.quantityOrdered || 0)), 0);
                  if (totalCrv > 0) {
                    return (
                      <div className="flex justify-between">
                        <span>CRV Fees:</span>
                        <span className="font-medium text-red-600">
                          +${totalCrv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {purchaseOrder.lumpSumAllowance && parseFloat(purchaseOrder.lumpSumAllowance) !== 0 && (
                  <div className="flex justify-between">
                    <span>Lump Sum {parseFloat(purchaseOrder.lumpSumAllowance) > 0 ? 'Charge' : 'Allowance'}:</span>
                    <span className={`font-medium {formatCurrency(parseFloat(purchaseOrder.lumpSumAllowance) > 0 ? 'text-red-600' : 'text-green-600')}`}>
                      {parseFloat(purchaseOrder.lumpSumAllowance) > 0 ? '+' : ''}{formatCurrency(Math.abs(parseFloat(purchaseOrder.lumpSumAllowance)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}
                    </span>
                  </div>
                )}
                {purchaseOrder.deliveryCharge && parseFloat(purchaseOrder.deliveryCharge) !== 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span className="font-medium text-red-600">
                      +{formatCurrency(parseFloat(purchaseOrder.deliveryCharge).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold text-lg">Order Total:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency((() => {
                      const items = purchaseOrder.items || [];
                      const subtotal = items.reduce((sum, item) => sum + ((item.listCost || 0) * (item.quantityOrdered || 0)), 0);
                      const offInvoice = items.reduce((sum, item) => sum + ((item.offInvoice || 0) * (item.quantityOrdered || 0)), 0);
                      const billBack = items.reduce((sum, item) => sum + ((item.billBack || 0) * (item.quantityOrdered || 0)), 0);
                      const crvFees = items.reduce((sum, item) => sum + ((item.purchaseCrv || 0) * (item.quantityOrdered || 0)), 0);
                      
                      // Calculate net after allowances
                      let netAfterAllowances = subtotal - offInvoice - billBack;
                      
                      // Apply vendor discount on Ext. List total
                      const discountPercent = parseFloat(purchaseOrder.vendor?.discountPercent || '0');
                      if (discountPercent > 0) {
                        const discountAmount = subtotal * discountPercent;
                        netAfterAllowances -= discountAmount;
                      )}
                      
                      // Add CRV, lump sum, and delivery charges
                      const lumpSum = parseFloat(purchaseOrder.lumpSumAllowance || '0');
                      const delivery = parseFloat(purchaseOrder.deliveryCharge || '0');
                      const finalTotal = netAfterAllowances + crvFees + lumpSum + delivery;
                      
                      return finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Component for Printing */}
      <PurchaseOrderPDF purchaseOrder={purchaseOrder} />
    </div>
  );
}