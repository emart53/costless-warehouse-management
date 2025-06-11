import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Save, Send } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency, formatCurrencyInput, parseCurrency, formatNumber } from "@/lib/formatNumber";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface POItem {
  productId: number;
  product?: any;
  quantityOrdered: number;
  listCost: number;
  offInvoice: number;
  billBack: number;
}

export default function CreatePurchaseOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Form state
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [lumpSumDiscount, setLumpSumDiscount] = useState(0);
  const [shipToLocation, setShipToLocation] = useState('1'); // Default to warehouse ID
  const [notes, setNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Product entry method
  const [entryMethod, setEntryMethod] = useState<'list' | 'rapid' | 'standing'>('list');
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [rapidProductId, setRapidProductId] = useState('');
  const [rapidQuantity, setRapidQuantity] = useState('');
  
  // Vendor combobox state
  const [vendorComboOpen, setVendorComboOpen] = useState(false);

  // Data queries
  const { data: allVendors = [] } = useQuery({ queryKey: ['/api/vendors'] });
  
  // Filter to show only active vendors
  const vendors = allVendors.filter((vendor: any) => 
    vendor.status === 'Active' || vendor.status === 'active' || !vendor.status
  );
  const { data: locations = [] } = useQuery({ queryKey: ['/api/locations'] });
  const { data: stores = [] } = useQuery({ queryKey: ['/api/stores'] });
  
  const { data: selectedVendor } = useQuery({
    queryKey: [`/api/vendors/${selectedVendorId}`],
    enabled: !!selectedVendorId,
  });

  const { data: vendorProducts = [] } = useQuery({
    queryKey: [`/api/vendors/${selectedVendorId}/products`],
    enabled: !!selectedVendorId,
  });

  const { data: standingOrders = [] } = useQuery({
    queryKey: [`/api/vendors/${selectedVendorId}/standing-orders`],
    enabled: !!selectedVendorId,
  });

  // Calculate expected delivery date when vendor changes
  useEffect(() => {
    if (selectedVendor && (selectedVendor as any)?.leadTime) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + (selectedVendor as any).leadTime);
      setExpectedDeliveryDate(deliveryDate.toISOString().split('T')[0]);
    }
  }, [selectedVendor]);

  // Automatically load products based on vendor selection
  useEffect(() => {
    const products = vendorProducts as any[];
    if (products.length > 0) {
      if (products.length <= 12) {
        // Automatically show all products for vendors with ≤12 products
        setEntryMethod('list');
        const initialItems = products.map((product: any) => ({
          productId: product.productId || product.id,
          product,
          quantityOrdered: 0,
          listCost: parseFloat(product.listCost || '0'),
          offInvoice: parseFloat(product.offInvoice || '0'),
          billBack: parseFloat(product.billBack || '0'),
        }));
        setPOItems(initialItems);
      } else {
        // For vendors with >12 products, default to 10-key rapid entry
        setEntryMethod('rapid');
        setPOItems([]);
      }
    } else {
      setPOItems([]);
    }
  }, [vendorProducts]);

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(parseInt(vendorId));
    setPOItems([]);
    setRapidProductId('');
    setRapidQuantity('');
  };

  const handleQuantityChange = (productId: number, quantity: string) => {
    const qty = parseInt(quantity) || 0;
    setPOItems(prev => prev.map(item => 
      item.productId === productId 
        ? { ...item, quantityOrdered: qty }
        : item
    ));
  };

  const addRapidProduct = () => {
    if (!rapidProductId || !rapidQuantity) return;
    
    const products = vendorProducts as any[];
    const product = products.find((p: any) => p.id === parseInt(rapidProductId));
    if (!product) return;

    const newItem: POItem = {
      productId: product.id,
      product,
      quantityOrdered: parseInt(rapidQuantity),
      listCost: parseFloat(product.listCost || '0'),
      offInvoice: parseFloat(product.offInvoice || '0'),
      billBack: parseFloat(product.billBack || '0'),
    };

    setPOItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantityOrdered: item.quantityOrdered + parseInt(rapidQuantity) }
            : item
        );
      }
      return [...prev, newItem];
    });

    setRapidProductId('');
    setRapidQuantity('');
  };

  const loadStandingOrder = (standingOrderId: string) => {
    // Implementation for loading standing order products
    // This would fetch the saved product list for the standing order
  };

  const calculateTotals = () => {
    const itemsWithQuantity = poItems.filter(item => item.quantityOrdered > 0);
    
    let totalListCost = 0;
    let totalOffInvoice = 0;
    let totalBillBack = 0;
    let totalCrv = 0;
    let totalWeight = 0;
    
    itemsWithQuantity.forEach(item => {
      const qty = item.quantityOrdered;
      const listCost = item.listCost;
      const offInvoice = item.offInvoice;
      const billBack = item.billBack;
      
      totalListCost += qty * listCost;
      totalOffInvoice += qty * offInvoice;
      totalBillBack += qty * billBack;
      
      // Add CRV and weight if available
      if (item.product?.crvPerUnit) {
        totalCrv += qty * parseFloat(item.product.crvPerUnit || '0');
      }
      if (item.product?.caseWeight) {
        totalWeight += qty * parseFloat(item.product.caseWeight || '0');
      }
    });

    // Calculate vendor discount on list cost (standard industry practice)
    const vendorDiscountPercent = parseFloat((selectedVendor as any)?.discountPercent || '0');
    const vendorDiscountAmount = totalListCost > 0 ? (totalListCost * vendorDiscountPercent) / 100 : 0;

    // Net cost should only deduct Off Invoice, not Bill Back (Bill Back shows in totals section)
    const netCost = totalListCost - totalOffInvoice - vendorDiscountAmount;
    const total = netCost + totalCrv + deliveryCharge - totalBillBack - lumpSumDiscount;
    
    return { 
      itemCount: itemsWithQuantity.length,
      totalListCost,
      totalOffInvoice,
      totalBillBack,
      totalCrv,
      totalWeight,
      vendorDiscountAmount,
      netCost,
      total
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'pending') => {
      const itemsToSave = poItems.filter(item => item.quantityOrdered > 0);
      
      if (itemsToSave.length === 0) {
        throw new Error('Please add at least one item to the purchase order');
      }

      const poData = {
        vendorId: selectedVendorId,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || null,
        deliveryCharge,
        lumpSumDiscount,
        shipToLocation,
        notes,
        specialInstructions,
        status,
        items: itemsToSave.map(item => ({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          listCost: item.listCost,
          offInvoice: item.offInvoice,
          billBack: item.billBack,
        })),
      };

      return await apiRequest('/api/purchase-orders', 'POST', poData);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
      setLocation(`/purchase-orders/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const { itemCount, totalListCost, totalOffInvoice, totalBillBack, totalCrv, totalWeight, vendorDiscountAmount, netCost, total } = calculateTotals();

  return (
    <div className="p-6 max-w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => setLocation('/purchase-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
          <h1 className="text-2xl font-bold ml-4">Create Purchase Order</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate('draft')}
            disabled={saveMutation.isPending || !selectedVendorId}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => saveMutation.mutate('pending')}
            disabled={saveMutation.isPending || !selectedVendorId}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit for Scheduling
          </Button>
        </div>
      </div>

      {/* Header Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Purchase Order Header</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="col-span-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Popover open={vendorComboOpen} onOpenChange={setVendorComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={vendorComboOpen}
                    className="w-full justify-between"
                  >
                    {selectedVendorId
                      ? (vendors as any[]).find((vendor: any) => vendor.id === selectedVendorId)?.name || "Select vendor..."
                      : "Select vendor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search vendors..." />
                    <CommandList>
                      <CommandEmpty>No vendor found.</CommandEmpty>
                      <CommandGroup>
                        {(vendors as any[]).map((vendor: any) => (
                          <CommandItem
                            key={vendor.id}
                            value={`${vendor.name} ${vendor.code}`}
                            onSelect={() => {
                              handleVendorChange(vendor.id.toString());
                              setVendorComboOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedVendorId === vendor.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {vendor.name} ({vendor.code})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="orderDate">Order Date</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expectedDeliveryDate">Expected Delivery</Label>
              <Input
                id="expectedDeliveryDate"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          {selectedVendor && (
            <div className="grid grid-cols-3 gap-6 p-4 bg-gray-50 rounded">
              <div>
                <h3 className="font-semibold mb-2">Vendor Address</h3>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{(selectedVendor as any).name}</p>
                  {(selectedVendor as any).address && <p>{(selectedVendor as any).address}</p>}
                  {(selectedVendor as any).city && (selectedVendor as any).state && (
                    <p>{(selectedVendor as any).city}, {(selectedVendor as any).state} {(selectedVendor as any).zipCode}</p>
                  )}
                  {(selectedVendor as any).contactPerson && (
                    <p className="font-medium mt-2">Contact: {(selectedVendor as any).contactPerson}</p>
                  )}
                  {(selectedVendor as any).phone && <p>Phone: {(selectedVendor as any).phone}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Terms & Conditions</h3>
                <div className="text-sm space-y-1">
                  {(selectedVendor as any).discountPercent && parseFloat((selectedVendor as any).discountPercent) > 0 ? (
                    <p className="font-medium">
                      {parseFloat((selectedVendor as any).discountPercent).toFixed(1)}% Early Pay Discount
                    </p>
                  ) : (selectedVendor as any).paymentTerms ? (
                    <p>{(selectedVendor as any).paymentTerms}</p>
                  ) : (
                    <p>Net 30 Days</p>
                  )}
                  {(selectedVendor as any).leadTime && <p>Lead Time: {(selectedVendor as any).leadTime} days</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Ship To Location</h3>
                <Select value={shipToLocation} onValueChange={setShipToLocation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(locations as any[]).map((location: any) => (
                      <SelectItem key={`location-${location.id}`} value={location.id.toString()}>
                        {location.name} (Warehouse)
                      </SelectItem>
                    ))}
                    {(stores as any[]).map((store: any) => (
                      <SelectItem key={`store-${store.id}`} value={`store-${store.id}`}>
                        {store.name} (Store #{store.storeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  let selectedLocation = null;
                  let isStore = false;
                  
                  if (shipToLocation.startsWith('store-')) {
                    const storeId = shipToLocation.replace('store-', '');
                    selectedLocation = (stores as any[]).find(store => store.id.toString() === storeId);
                    isStore = true;
                  } else {
                    selectedLocation = (locations as any[]).find(loc => loc.id.toString() === shipToLocation);
                  }
                  
                  return selectedLocation ? (
                    <div className="text-sm mt-2">
                      <p className="font-medium">
                        {selectedLocation.name} {isStore ? `(Store #${selectedLocation.storeNumber})` : '(Warehouse)'}
                      </p>
                      {selectedLocation.address && <p>{selectedLocation.address}</p>}
                      {selectedLocation.city && selectedLocation.state && (
                        <p>{selectedLocation.city}, {selectedLocation.state} {selectedLocation.zipCode}</p>
                      )}
                      {selectedLocation.phone && <p>Phone: {selectedLocation.phone}</p>}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <Label htmlFor="deliveryCharge">Delivery Charge (Reminder)</Label>
              <Input
                id="deliveryCharge"
                type="number"
                step="0.01"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="lumpSumDiscount">Lump Sum Discount (Reminder)</Label>
              <Input
                id="lumpSumDiscount"
                type="number"
                step="0.01"
                value={lumpSumDiscount}
                onChange={(e) => setLumpSumDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (for vendor)</Label>
              <Textarea
                id="specialInstructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                placeholder="Special delivery instructions, handling requirements..."
              />
            </div>
            <div>
              {(standingOrders as any[]).length > 0 && (
                <div>
                  <Label>Standing Orders (Saved Product Groups)</Label>
                  <Select onValueChange={loadStandingOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Load standing order..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(standingOrders as any[]).map((order: any) => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          {order.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Selection */}
      {selectedVendorId && (vendorProducts as any[]).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {(vendorProducts as any[]).length <= 12 
                ? `Products (${(vendorProducts as any[]).length} - All Displayed)`
                : `Product Entry (${(vendorProducts as any[]).length} available)`
              }
            </CardTitle>
            {(vendorProducts as any[]).length > 12 && (
              <div className="flex gap-4 items-center mt-3">
                <div className="flex-1">
                  <Label>Standing Orders</Label>
                  <Select onValueChange={loadStandingOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select standing order..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(standingOrders as any[]).map((order: any) => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          {order.name} ({order.productCount || 'items'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-gray-600 pt-6">
                  or use 10-key product entry below
                </div>
              </div>
            )}
            {(vendorProducts as any[]).length <= 12 && (standingOrders as any[]).length > 0 && (
              <div className="mt-3">
                <Label>Standing Orders (Optional)</Label>
                <Select onValueChange={loadStandingOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Load standing order to override..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(standingOrders as any[]).map((order: any) => (
                      <SelectItem key={order.id} value={order.id.toString()}>
                        {order.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {entryMethod === 'list' ? (
              // List Method (≤12 products) - Traditional Layout
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Product Description</th>
                      <th className="border border-gray-300 p-2 text-center">Unit Size</th>
                      <th className="border border-gray-300 p-2 text-center">QTY</th>
                      <th className="border border-gray-300 p-2 text-right">List Cost</th>
                      <th className="border border-gray-300 p-2 text-right">Off Invoice</th>
                      <th className="border border-gray-300 p-2 text-right">Bill Back</th>
                      <th className="border border-gray-300 p-2 text-right">CRV</th>
                      <th className="border border-gray-300 p-2 text-right">Net Cost</th>
                      <th className="border border-gray-300 p-2 text-right">Extended List</th>
                      <th className="border border-gray-300 p-2 text-right">Extended Net</th>
                      <th className="border border-gray-300 p-2 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item) => {
                      const netCost = item.listCost - item.offInvoice;
                      const extendedList = item.quantityOrdered * item.listCost;
                      const extendedNet = item.quantityOrdered * netCost;
                      const crvPerUnit = parseFloat(item.product?.crvPerUnit || '0');
                      const weightPerUnit = parseFloat(item.product?.caseWeight || '0');
                      const totalWeight = item.quantityOrdered * weightPerUnit;
                      const totalCrv = item.quantityOrdered * crvPerUnit;
                      
                      return (
                        <tr key={item.productId} className={item.quantityOrdered > 0 ? 'bg-blue-50' : ''}>
                          <td className="border border-gray-300 p-2">
                            <div>
                              <div className="font-medium">
                                {item.product?.description || item.product?.name || 'Product Description'} {item.product?.casePack || item.product?.case_pack || '1'}/{item.product?.size || 'EA'}
                              </div>
                              <div className="text-xs text-gray-600">
                                {item.product?.brand || ''} {item.product?.brand && item.product?.category ? ' | ' : ''} {item.product?.category || ''}
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <div className="text-sm">
                              <div>{item.product?.casePack || item.product?.case_pack || '-'}</div>
                              <div className="text-xs text-gray-600">{item.product?.unitSize || item.product?.unit_size || ''}</div>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <Input
                              type="number"
                              value={item.quantityOrdered || ''}
                              onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                              className="w-20 text-center text-sm font-mono"
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td className="border border-gray-300 p-2 text-right">
                            {formatCurrency(item.listCost)}
                          </td>
                          <td className="border border-gray-300 p-2 text-right">
                            {item.offInvoice > 0 ? formatCurrency(item.offInvoice) : '-'}
                          </td>
                          <td className="border border-gray-300 p-2 text-right">
                            {item.billBack > 0 ? formatCurrency(item.billBack) : '-'}
                          </td>
                          <td className="border border-gray-300 p-2 text-right">
                            {crvPerUnit > 0 ? formatCurrency(crvPerUnit) : '-'}
                          </td>
                          <td className="border border-gray-300 p-2 text-right font-medium">
                            {formatCurrency(netCost)}
                          </td>
                          <td className="border border-gray-300 p-2 text-right">
                            {item.quantityOrdered > 0 ? formatCurrency(extendedList) : '-'}
                          </td>
                          <td className="border border-gray-300 p-2 text-right font-medium">
                            {item.quantityOrdered > 0 ? formatCurrency(extendedNet) : '-'}
                          </td>
                          <td className="border border-gray-300 p-2 text-right">
                            {item.quantityOrdered > 0 && weightPerUnit > 0 ? `${totalWeight.toFixed(1)} lbs` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              // Rapid Entry Method (>12 products)
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="rapidProduct">Product</Label>
                    <Select value={rapidProductId} onValueChange={setRapidProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(vendorProducts as any[]).map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.productId || product.id} - {product.description || product.name} {product.casePack || '1'}/{product.size || 'EA'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label htmlFor="rapidQuantity">Quantity</Label>
                    <Input
                      id="rapidQuantity"
                      type="number"
                      value={rapidQuantity}
                      onChange={(e) => setRapidQuantity(e.target.value)}
                      className="font-mono text-center"
                      min="1"
                      placeholder="Qty"
                    />
                  </div>
                  <Button onClick={addRapidProduct} disabled={!rapidProductId || !rapidQuantity}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {poItems.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left w-2/5">Product</th>
                          <th className="border border-gray-300 p-2 text-center w-24">QTY</th>
                          <th className="border border-gray-300 p-2 text-right w-28">Net Cost</th>
                          <th className="border border-gray-300 p-2 text-right w-32">Extended</th>
                          <th className="border border-gray-300 p-2 text-center w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poItems.map((item) => {
                          const netCost = item.listCost - item.offInvoice;
                          const extended = item.quantityOrdered * netCost;
                          
                          return (
                            <tr key={item.productId}>
                              <td className="border border-gray-300 p-2">
                                <div>
                                  <div className="font-medium">{item.product?.description}</div>
                                  <div className="text-sm text-gray-600">
                                    ID: {item.productId} | {item.product?.category?.name}
                                  </div>
                                </div>
                              </td>
                              <td className="border border-gray-300 p-2 text-center">
                                <Input
                                  type="number"
                                  value={item.quantityOrdered}
                                  onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                                  className="w-32 text-center font-mono"
                                  min="0"
                                  placeholder="0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2 text-right">
                                {formatCurrency(netCost)}
                              </td>
                              <td className="border border-gray-300 p-2 text-right">
                                {formatCurrency(extended)}
                              </td>
                              <td className="border border-gray-300 p-2 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPOItems(prev => prev.filter(p => p.productId !== item.productId))}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown Summary */}
      {itemCount > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Purchase Order Summary - Review Before Submitting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3 text-lg">Cost Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total List Cost:</span>
                    <span className="font-medium">{formatCurrency(totalListCost)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Less: Off Invoice Allowances:</span>
                    <span className="font-medium">-{formatCurrency(totalOffInvoice)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Less: Bill Back Allowances:</span>
                    <span className="font-medium">-{formatCurrency(totalBillBack)}</span>
                  </div>
                  {(selectedVendor as any)?.discountPercent && parseFloat((selectedVendor as any).discountPercent) > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Less: Vendor Discount ({parseFloat((selectedVendor as any).discountPercent).toFixed(1)}%):</span>
                      <span className="font-medium">-{formatCurrency(vendorDiscountAmount)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Net Product Cost:</span>
                    <span>{formatCurrency(netCost)}</span>
                  </div>
                  {totalCrv > 0 && (
                    <div className="flex justify-between">
                      <span>Plus: CRV:</span>
                      <span className="font-medium">{formatCurrency(totalCrv)}</span>
                    </div>
                  )}
                  {deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Plus: Delivery Charge:</span>
                      <span className="font-medium">{formatCurrency(deliveryCharge)}</span>
                    </div>
                  )}
                  {lumpSumDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Less: Lump Sum Discount:</span>
                      <span className="font-medium">-{formatCurrency(lumpSumDiscount)}</span>
                    </div>
                  )}
                  <hr className="my-2 border-2" />
                  <div className="flex justify-between text-xl font-bold">
                    <span>TOTAL PURCHASE ORDER:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 text-lg">Order Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Number of Items:</span>
                    <span className="font-medium">{formatNumber(itemCount)}</span>
                  </div>
                  {totalWeight > 0 && (
                    <div className="flex justify-between">
                      <span>Total Weight:</span>
                      <span className="font-medium">{formatNumber(totalWeight)} lbs</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Average Cost per Item:</span>
                    <span className="font-medium">
                      {itemCount > 0 ? formatCurrency(netCost / itemCount) : formatCurrency(0)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
                  <h4 className="font-semibold text-amber-800 mb-2">Cost Components Present:</h4>
                  <div className="text-sm space-y-1">
                    {totalOffInvoice > 0 && (
                      <div className="text-green-700">✓ Off Invoice allowances applied</div>
                    )}
                    {totalBillBack > 0 && (
                      <div className="text-green-700">✓ Bill Back allowances applied</div>
                    )}
                    {totalCrv > 0 && (
                      <div className="text-blue-700">✓ CRV charges included</div>
                    )}
                    {deliveryCharge > 0 && (
                      <div className="text-blue-700">✓ Delivery charges included</div>
                    )}
                    {lumpSumDiscount > 0 && (
                      <div className="text-green-700">✓ Lump sum discount applied</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notes">Notes for Vendor</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any special notes or instructions for the vendor..."
                />
              </div>
              <div>
                <Label htmlFor="specialInstructions">Internal Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                  placeholder="Internal warehouse or receiving instructions..."
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-6 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/purchase-orders')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Purchase Orders
              </Button>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => saveMutation.mutate('draft')}
                  disabled={saveMutation.isPending || !selectedVendorId || poItems.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save as Draft'}
                </Button>
                
                <Button
                  onClick={() => saveMutation.mutate('pending')}
                  disabled={saveMutation.isPending || !selectedVendorId || poItems.length === 0}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {saveMutation.isPending ? 'Submitting...' : 'Submit Order'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}