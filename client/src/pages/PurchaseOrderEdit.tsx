import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, ArrowLeft, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { PurchaseOrderDetailTable } from "@/components/PurchaseOrderDetailTable";
import { formatCurrency, formatCurrencyInput, parseCurrency } from "@/lib/formatNumber";

interface PurchaseOrderItem {
  id?: number;
  productId: number;
  quantityOrdered: number;
  listCost: number;
  offInvoice: number;
  displayOffInvoice?: number;
  billBack: number;
  netCost: number;
  purchaseWeight: number;
  purchaseCrv: number;
  purchaseCfg?: number;
  product?: {
    productDescription: string;
    casePack: number;
    size: string;
    name?: string;
    description?: string;
    offInvoice?: string;
    crv?: string;
    caseUpc?: string;
    weight?: number;
  };
  configuration?: {
    configurationName: string;
  };
}

interface PurchaseOrderData {
  id?: number;
  poNumber: string;
  vendorId: number;
  orderDate: string;
  expectedDate?: string;
  shipToLocationId: number;
  billToLocationId: number;
  lumpSumAllowance: number;
  deliveryCharge: number;
  notes?: string;
  status: string;
  items: PurchaseOrderItem[];
}

// Utility function to format numbers with commas
const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Utility function to parse formatted number back to float
const parseFormattedNumber = (value: string): number => {
  const cleaned = value.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

export default function PurchaseOrderEdit() {
  const { id } = useParams();
  
  // Vendor Details Display Component - moved inside main component
  const VendorDetailsDisplay = ({ vendorId, vendors }: { vendorId: number; vendors: any[] }) => {
    const vendor = vendors.find((v: any) => v.id === vendorId);
    
    if (!vendor) {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <div className="text-sm text-gray-500">Vendor information not available</div>
        </div>
      );
    }
    
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <div className="text-sm">
          <div className="font-medium text-gray-900 mb-2">{vendor.name}</div>
          <div className="space-y-1">
            {/* Address Information */}
            {vendor.address || vendor.city || vendor.state ? (
              <div>
                {vendor.address && <div>{vendor.address}</div>}
                {(vendor.city || vendor.state) && (
                  <div>
                    {vendor.city}{vendor.city && vendor.state ? ', ' : ''}{vendor.state} {vendor.zipCode}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 italic">Address not on file</div>
            )}
            
            {/* Contact Information */}
            {vendor.phone && (
              <div className="mt-2">Phone: {vendor.phone}</div>
            )}
            {vendor.contactName && (
              <div>Contact: {vendor.contactName}</div>
            )}
            {vendor.email && (
              <div>Email: {vendor.email}</div>
            )}
            
            {/* Payment Terms */}
            {vendor.paymentTerms && (
              <div className="mt-2 text-gray-600">Terms: {vendor.paymentTerms}</div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Component load debugging
  console.log('PurchaseOrderEdit component loading, id:', id);

  const [formData, setFormData] = useState<PurchaseOrderData>({
    poNumber: '',
    vendorId: 0,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    shipToLocationId: 1,
    billToLocationId: 1,
    lumpSumAllowance: 0,
    deliveryCharge: 0,
    notes: '',
    status: 'pending',
    items: []
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    discountAmount: 0,
    totalBillBack: 0,
    totalCrv: 0,
    netTotal: 0,
    finalTotal: 0
  });

  // Calculate totals whenever items or allowances change
  const calculateTotals = (items: PurchaseOrderItem[], lumpSum: number = 0, delivery: number = 0) => {
    // Extended Net Total (qty * net cost) - off-invoice already incorporated
    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantityOrdered || 0);
      const listCost = Number(item.listCost || 0);
      
      // Calculate net cost with off-invoice deduction (authentic legacy behavior)
      const actualOffInvoice = (item.offInvoice && parseFloat(item.offInvoice.toString()) > 0) 
        ? parseFloat(item.offInvoice.toString()) 
        : (item.product?.offInvoice ? parseFloat(item.product.offInvoice.toString()) : 0);
      
      const netCost = listCost - actualOffInvoice;
      return sum + (qty * netCost);
    }, 0);
    
    const totalBillBack = items.reduce((sum, item) => {
      const qty = Number(item.quantityOrdered || 0);
      const billBack = Number(item.billBack || 0);
      return sum + (billBack * qty);
    }, 0);
    
    const totalCrv = items.reduce((sum, item) => {
      const qty = Number(item.quantityOrdered || 0);
      // Use product CRV if purchaseCrv is 0 or missing
      const crvPerUnit = (item.purchaseCrv && Number(item.purchaseCrv) > 0) 
        ? Number(item.purchaseCrv) 
        : Number(item.product?.crv || 0);
      return sum + (crvPerUnit * qty);
    }, 0);
    
    // Apply vendor discount to Extended Net (use actual vendor discount rate)
    const vendor = vendors && formData.vendorId ? (vendors as any[]).find(v => v.id === formData.vendorId) : null;
    const vendorDiscountPercent = vendor?.discount_percent ? parseFloat(vendor.discount_percent) : 0;
    const discountAmount = subtotal * vendorDiscountPercent;
    const netTotal = subtotal - discountAmount;
    const finalTotal = netTotal - totalBillBack + totalCrv + Number(lumpSum || 0) + Number(delivery || 0);

    return {
      subtotal: Number(subtotal), // This is now "Extended Net" with off-invoice incorporated
      discountAmount: Number(discountAmount),
      totalBillBack: Number(totalBillBack),
      totalCrv: Number(totalCrv),
      netTotal: Number(netTotal),
      finalTotal: Number(finalTotal)
    };
  };

  // Update totals when form data changes
  useEffect(() => {
    const newTotals = calculateTotals(formData.items, formData.lumpSumAllowance, formData.deliveryCharge);
    setTotals(newTotals);
  }, [formData.items, formData.lumpSumAllowance, formData.deliveryCharge, formData.vendorId, vendors]);

  // Load existing PO data if editing
  const { data: existingPO } = useQuery({
    queryKey: [`/api/purchase-orders/${id}`],
    enabled: !!id,
  });

  // Load reference data
  const { data: products } = useQuery({ queryKey: ['/api/products'] });
  const { data: vendors } = useQuery({ queryKey: ['/api/vendors'] });
  const { data: stores } = useQuery({ queryKey: ['/api/stores'] });
  
  // Load vendor-specific products when vendor is selected
  const { data: vendorProducts } = useQuery({
    queryKey: ['/api/vendors', formData.vendorId, 'products'],
    enabled: formData.vendorId > 0,
    queryFn: () => fetch(`/api/vendors/${formData.vendorId}/products`).then(res => res.json())
  });

  // Populate form when editing existing PO - with forced state update
  useEffect(() => {
    if (existingPO && id) {
      const po = existingPO as any; 
      
      // Transform items with proper off-invoice handling from product data
      const transformedItems = po.items?.map((item: any) => {
        // Use product's off-invoice value when item off-invoice is 0 (standard business logic)
        const productOffInvoice = parseFloat(item.product?.offInvoice || '0');
        const itemOffInvoice = parseFloat(item.offInvoice || '0');
        const actualOffInvoice = itemOffInvoice > 0 ? itemOffInvoice : productOffInvoice;
        
        const listCost = parseFloat(item.listCost || item.product?.purchaseCost || '0');
        const billBack = parseFloat(item.billBack || '0');
        const netCost = listCost - actualOffInvoice - billBack;
        
        // Debug logging
        if (item.productId === 6581) {
          console.log('Captain Crunch transform:', {
            productDescription: item.product?.productDescription,
            itemOffInvoice,
            productOffInvoice,
            actualOffInvoice,
            rawProduct: item.product
          });
        }
        
        return {
          id: item.id,
          productId: item.productId,
          product: item.product, // Keep original product data
          quantityOrdered: item.quantityOrdered || item.quantity || 0,
          listCost: listCost,
          offInvoice: actualOffInvoice, // Use computed value for display
          billBack: billBack,
          netCost: netCost,
          purchaseWeight: parseFloat(item.purchaseWeight || '0'),
          purchaseCrv: parseFloat(item.purchaseCrv || '0'),
          purchaseCfg: item.purchaseCfg || 1,
          configuration: item.configuration,
          notes: item.notes || ''
        };
      }) || [];

      // Force complete state replacement - use authentic Cost Less store locations
      const shipToId = po.shipToLocationId || po.defaultShipToStoreId || 1; // Default to store 1 (Cost Less Warehouse)
      const billToId = 2; // Default to store 2 (Cost Less Accounting) for billing - authentic from your legacy system
      setFormData({
        poNumber: po.poNumber || '',
        vendorId: po.vendorId || 0,
        orderDate: po.orderDate ? po.orderDate.split(' ')[0] : '',
        expectedDate: po.expectedDate ? po.expectedDate.split(' ')[0] : '',
        shipToLocationId: shipToId,
        billToLocationId: billToId, // Cost Less Accounting - authentic location from legacy data
        lumpSumAllowance: parseFloat(po.lumpSumAllowance || '0'),
        deliveryCharge: parseFloat(po.deliveryCharge || '0'),
        notes: po.notes || '',
        status: po.status || 'pending',
        items: transformedItems
      });
    }
  }, [existingPO, id]);

  // Quick item update functions
  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...formData.items];
    newItems[index].quantityOrdered = quantity;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemCost = (index: number, listCost: number) => {
    const newItems = [...formData.items];
    newItems[index].listCost = listCost;
    // Recalculate net cost: list cost - off invoice - bill back
    const offInvoice = newItems[index].offInvoice || 0;
    const billBack = newItems[index].billBack || 0;
    newItems[index].netCost = listCost - offInvoice - billBack;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemOffInvoice = (index: number, offInvoice: number) => {
    const newItems = [...formData.items];
    newItems[index].offInvoice = offInvoice;
    // Recalculate net cost: list cost - off invoice - bill back
    const listCost = newItems[index].listCost || 0;
    const billBack = newItems[index].billBack || 0;
    newItems[index].netCost = listCost - offInvoice - billBack;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemBillBack = (index: number, billBack: number) => {
    const newItems = [...formData.items];
    newItems[index].billBack = billBack;
    // Recalculate net cost: list cost - off invoice - bill back
    const listCost = newItems[index].listCost || 0;
    const offInvoice = newItems[index].offInvoice || 0;
    newItems[index].netCost = listCost - offInvoice - billBack;
    setFormData({ ...formData, items: newItems });
  };

  const addNewItem = () => {
    const newItem: PurchaseOrderItem = {
      productId: 0,
      quantityOrdered: 1,
      listCost: 0,
      offInvoice: 0,
      billBack: 0,
      netCost: 0,
      purchaseWeight: 0,
      purchaseCrv: 0,
      purchaseCfg: 1
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const selectProduct = (index: number, productId: number) => {
    // First try to find in vendor products, then fallback to all products
    const product = (vendorProducts as any[])?.find(p => (p.id || p.productId) === productId) ||
                   (products as any[])?.find(p => p.id === productId);
    if (product) {
      const listCost = parseFloat(product.purchaseCost || product.lastCost || product.purchase_cost || product.listCost || '0');
      const offInvoice = parseFloat(product.offInvoice || '0');
      const billBack = parseFloat(product.billBack || '0');
      const netCost = listCost - offInvoice - billBack;
      
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        productId,
        product: {
          productDescription: product.productDescription || product.description || product.product_description || product.name,
          casePack: product.casePack || product.case_pack || 1,
          size: product.unitSize || product.size || '',
          offInvoice: product.offInvoice
        },
        listCost: listCost,
        offInvoice: offInvoice,
        billBack: billBack,
        netCost: netCost
      };
      setFormData({ ...formData, items: newItems });
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PurchaseOrderData) => {
      const url = id ? `/api/purchase-orders/${id}` : '/api/purchase-orders';
      const method = id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save purchase order');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Purchase order ${id ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: [`/api/purchase-orders/${id}`] });
      // Stay on edit page to show updated data
      if (!id) {
        setLocation('/purchase-orders');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${id ? 'update' : 'create'} purchase order`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.vendorId || formData.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor and add at least one item",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate total amount from items
    const totalAmount = formData.items.reduce((sum, item) => {
      return sum + (item.netCost * item.quantityOrdered);
    }, 0);
    
    // Include total amount in the save data
    const saveData = {
      ...formData,
      totalAmount: totalAmount
    };
    
    saveMutation.mutate(saveData);
  };

  return (
    <div className="p-6 space-y-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <Button 
          variant="outline" 
          onClick={() => setLocation('/purchase-orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            {id ? `Edit Purchase Order ${formData.poNumber}` : 'Create Purchase Order'}
          </h1>
          {id && (
            <p className="text-sm text-gray-600 mt-1">
              ID: {id} | Vendor: {vendors && formData.vendorId ? 
                (vendors as any[]).find(v => v.id === formData.vendorId)?.name || 'Unknown Vendor' : 
                'No Vendor Selected'}
            </p>
          )}
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="poNumber">PO Number</Label>
              <Input
                id="poNumber"
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Select 
                value={formData.vendorId > 0 ? formData.vendorId.toString() : undefined} 
                onValueChange={(value) => setFormData({ ...formData, vendorId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {(vendors as any[])?.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Vendor Details */}
              {formData.vendorId > 0 && vendors && Array.isArray(vendors) && (
                <VendorDetailsDisplay vendorId={formData.vendorId} vendors={vendors as any[]} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expectedDate">Expected Date</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping & Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="shipTo">Ship To Location</Label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-2 border rounded-md bg-gray-50">
                  {existingPO && (existingPO as any).defaultShipToStore ? 
                    (existingPO as any).defaultShipToStore.name :
                    formData.shipToLocationId > 0 && stores ? 
                      (stores as any[]).find(s => s.id === formData.shipToLocationId)?.name || 'Unknown Store' :
                      'No store selected'
                  }
                </div>
                <Select 
                  value={formData.shipToLocationId > 0 ? formData.shipToLocationId.toString() : undefined} 
                  onValueChange={(value) => setFormData({ ...formData, shipToLocationId: parseInt(value) })}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue>Change</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(stores as any[])?.map((store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="billTo">Bill To Location</Label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-2 border rounded-md bg-gray-50">
                  {existingPO && (existingPO as any).billToLocation ? 
                    (existingPO as any).billToLocation.name :
                    formData.billToLocationId > 0 && stores ? 
                      (stores as any[]).find(s => s.id === formData.billToLocationId)?.name || 'Unknown Store' :
                      'No store selected'
                  }
                </div>
                <Select 
                  value={formData.billToLocationId > 0 ? formData.billToLocationId.toString() : undefined} 
                  onValueChange={(value) => setFormData({ ...formData, billToLocationId: parseInt(value) })}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue>Change</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(stores as any[])?.filter(store => store.locationType === 'office' || store.locationType === 'warehouse')?.map((store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lumpSum">Lump Sum Allowance</Label>
                <Input
                  id="lumpSum"
                  type="text"
                  value={formatCurrencyInput(formData.lumpSumAllowance)}
                  onChange={(e) => setFormData({ ...formData, lumpSumAllowance: parseCurrency(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="delivery">Delivery Charge</Label>
                <Input
                  id="delivery"
                  type="text"
                  value={formatCurrencyInput(formData.deliveryCharge)}
                  onChange={(e) => setFormData({ ...formData, deliveryCharge: parseCurrency(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Order Items</CardTitle>
            <Button onClick={addNewItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.items.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 text-left py-2 px-2 font-medium" style={{width: '320px'}}>Product</th>
                      <th className="border border-gray-300 text-right py-2 px-2 font-medium" style={{width: '80px'}}>Qty</th>
                      <th className="border border-gray-300 text-right py-2 px-2 font-medium" style={{width: '100px'}}>Unit Cost</th>
                      <th className="border border-gray-300 text-right py-2 px-2 font-medium" style={{width: '100px'}}>Extended</th>
                      <th className="border border-gray-300 text-right py-2 px-2 font-medium" style={{width: '100px'}}>Off Invoice</th>
                      <th className="border border-gray-300 text-right py-2 px-2 font-medium" style={{width: '100px'}}>Bill Back</th>
                      <th className="border border-gray-300 text-right py-2 px-2 font-medium" style={{width: '100px'}}>Net Cost</th>
                      <th className="border border-gray-300 text-center py-2 px-2 font-medium" style={{width: '80px'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const extended = item.quantityOrdered * item.listCost;
                      // Use product's off-invoice value if item's off-invoice is 0
                      const actualOffInvoice = (item.offInvoice && parseFloat(item.offInvoice.toString()) > 0) 
                        ? parseFloat(item.offInvoice.toString()) 
                        : (item.product?.offInvoice ? parseFloat(item.product.offInvoice.toString()) : 0);
                      const extendedOffInvoice = actualOffInvoice * item.quantityOrdered;
                      const billBackAmount = (item.billBack || 0) * item.quantityOrdered;
                      const netCost = extended - extendedOffInvoice - billBackAmount;
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 py-2 px-2" style={{width: '320px'}}>
                            {/* Show existing product info immediately, Select for changing */}
                            {item.product ? (
                              <div className="text-sm">
                                <div className="font-medium">
                                  {(item.product as any)?.product_description || (item.product as any)?.productDescription || item.product?.name || item.product?.description || `Product #${item.productId} (No Description)`}
                                </div>
                                <div className="text-gray-500">
                                  {item.product?.casePack && item.product?.size ? 
                                    `${item.product.casePack}/${item.product.size}` :
                                    (item.product as any)?.case_pack && (item.product as any)?.unit_size ?
                                    `${(item.product as any).case_pack}/${(item.product as any).unit_size}` : 
                                    'Case Pack/Size not available'
                                  }
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                Product not found. Click "Add Item" to add a new product.
                              </div>
                            )}
                          </td>
                          <td className="border border-gray-300 py-2 px-2" style={{width: '80px'}}>
                            <Input
                              type="number"
                              value={item.quantityOrdered}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-full text-right"
                            />
                          </td>
                          <td className="border border-gray-300 py-2 px-2" style={{width: '100px'}}>
                            <Input
                              type="text"
                              value={formatCurrencyInput(item.listCost)}
                              onChange={(e) => updateItemCost(index, parseCurrency(e.target.value))}
                              className="w-full text-right"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="border border-gray-300 py-2 px-2 text-right font-medium bg-blue-50" style={{width: '100px'}}>
                            {formatCurrency(extended)}
                          </td>
                          <td className="border border-gray-300 py-2 px-2" style={{width: '100px'}}>
                            <Input
                              type="text"
                              value={formatCurrencyInput(item.offInvoice || 0)}
                              onChange={(e) => updateItemOffInvoice(index, parseCurrency(e.target.value))}
                              className="w-full text-right"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="border border-gray-300 py-2 px-2" style={{width: '100px'}}>
                            <Input
                              type="text"
                              value={formatCurrencyInput(item.billBack || 0)}
                              onChange={(e) => updateItemBillBack(index, parseCurrency(e.target.value))}
                              className="w-full text-right"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="border border-gray-300 py-2 px-2 text-right font-medium bg-green-50" style={{width: '100px'}}>
                            {formatCurrency(netCost)}
                          </td>
                          <td className="border border-gray-300 py-2 px-2 text-center" style={{width: '80px'}}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Real-time Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4" />
                      <span className="font-semibold">Live Totals</span>
                    </div>
                    
                    <div className="flex justify-between font-medium">
                      <span>Extended Net:</span>
                      <span>{formatCurrency(totals.subtotal || 0)}</span>
                    </div>
                    
                    {(totals.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Less: Vendor Discount ({(() => {
                          const vendor = vendors && formData.vendorId ? (vendors as any[]).find(v => v.id === formData.vendorId) : null;
                          const discountPercent = vendor?.discount_percent ? parseFloat(vendor.discount_percent) * 100 : 0;
                          return discountPercent.toFixed(1);
                        })()}%):</span>
                        <span>-{formatCurrency(totals.discountAmount || 0).replace('$', '')}</span>
                      </div>
                    )}
                    
                    {(totals.totalBillBack || 0) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Less: Bill Back:</span>
                        <span>-{formatCurrency(totals.totalBillBack || 0).replace('$', '')}</span>
                      </div>
                    )}
                    
                    {(totals.totalCrv || 0) > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Plus: CRV:</span>
                        <span>+{formatCurrency(totals.totalCrv || 0).replace('$', '')}</span>
                      </div>
                    )}
                    
                    {(formData.lumpSumAllowance || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Lump Sum:</span>
                        <span>+{formatCurrency(formData.lumpSumAllowance || 0).replace('$', '')}</span>
                      </div>
                    )}
                    
                    {(formData.deliveryCharge || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery:</span>
                        <span>+{formatCurrency(formData.deliveryCharge || 0).replace('$', '')}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(Number(totals.finalTotal || 0))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No items added yet. Click "Add Item" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes or special instructions..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}