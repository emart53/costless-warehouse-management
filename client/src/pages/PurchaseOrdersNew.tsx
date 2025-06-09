import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { Plus, Save, Search, ArrowLeft, ArrowRight, Package, Calculator, Eye, Check, ChevronsUpDown, Edit, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";

// Types
type POStep = 'header' | 'products' | 'totals';

const createPOSchema = z.object({
  vendorId: z.number().min(1, "Please select a vendor"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDate: z.string().optional(),
  shipToLocationId: z.number().min(1, "Please select ship-to location"),
  billToLocationId: z.number().min(1, "Please select bill-to location"),
  lumpSumAllowance: z.number().optional(),
  deliveryCharge: z.number().optional(),
  notes: z.string().optional(),
});

type CreatePOFormData = z.infer<typeof createPOSchema>;

export default function PurchaseOrders() {
  const [location] = useLocation();
  const params = useParams();
  const editId = params?.id ? parseInt(params.id) : null;
  const isEditMode = location.includes('/edit/');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(isEditMode);
  const [currentStep, setCurrentStep] = useState<POStep>('header');
  const [selectedVendorId, setSelectedVendorId] = useState(0);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [productIdInput, setProductIdInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [isGridView, setIsGridView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showStandingOrders, setShowStandingOrders] = useState(false);
  const [vendorComboOpen, setVendorComboOpen] = useState(false);
  const itemsPerPage = 10;
  
  const queryClient = useQueryClient();

  // Queries
  const { data: purchaseOrders, isLoading: isLoadingPOs } = useQuery({
    queryKey: ["/api/purchase-orders"],
  });

  // Query for existing PO data when editing
  const { data: existingPO, isLoading: isLoadingExistingPO } = useQuery({
    queryKey: ["/api/purchase-orders", editId],
    enabled: !!editId && isEditMode,
  });

  const { data: vendors, isLoading: isLoadingVendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: allProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: locations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ["/api/locations"],
  });

  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ["/api/stores"],
  });

  // Queries for standing orders
  const { data: vendorStandingOrders } = useQuery({
    queryKey: [`/api/vendors/${selectedVendorId}/standing-orders`],
    enabled: selectedVendorId > 0,
  });

  // Form setup
  const form = useForm<CreatePOFormData>({
    resolver: zodResolver(createPOSchema),
    defaultValues: {
      vendorId: 0,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: "",
      shipToLocationId: 6, // Default to Cost Less Warehouse (ID 6)
      billToLocationId: 7, // Default to Cost Less Accounting (ID 7)
      notes: "",
    },
  });

  // Populate form with existing PO data when editing
  useEffect(() => {
    if (existingPO && isEditMode) {
      form.reset({
        vendorId: existingPO.vendorId,
        orderDate: existingPO.orderDate,
        expectedDate: existingPO.expectedDate || "",
        shipToLocationId: existingPO.shipToLocationId || 6,
        billToLocationId: existingPO.billToLocationId || 7,
        lumpSumAllowance: parseFloat(existingPO.lumpSumAllowance || "0"),
        deliveryCharge: parseFloat(existingPO.deliveryCharge || "0"),
        notes: existingPO.notes || "",
      });
      
      setSelectedVendorId(existingPO.vendorId);
      
      // Populate product quantities from existing items
      if (existingPO.items) {
        const quantities: Record<string, number> = {};
        existingPO.items.forEach((item: any) => {
          quantities[item.productId.toString()] = item.quantityOrdered;
        });
        setProductQuantities(quantities);
      }
    }
  }, [existingPO, isEditMode, form]);

  // Create/Update PO mutation
  const createPOMutation = useMutation({
    mutationFn: async (data: CreatePOFormData) => {
      const items = Object.entries(productQuantities).map(([productId, quantity]) => ({
        productId: parseInt(productId),
        quantityOrdered: quantity,
        unitCost: "0.00"
      }));

      if (isEditMode && editId) {
        return apiRequest("PUT", `/api/purchase-orders/${editId}`, {
          ...data,
          items
        });
      } else {
        return apiRequest("POST", "/api/purchase-orders", {
          ...data,
          items
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsCreateDialogOpen(false);
      setSelectedVendorId(0);
      setProductQuantities({});
      setCurrentStep('header');
      form.reset();
    },
  });

  const onSubmit = (data: CreatePOFormData) => {
    createPOMutation.mutate(data);
  };

  // Force refresh mechanism for grid population bug
  const [refreshKey, setRefreshKey] = useState(0);
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);

  // Update vendor products when vendor or products change
  useEffect(() => {
    if (selectedVendorId > 0 && allProducts) {
      const filtered = allProducts.filter((product: any) => {
        const productVendorId = product.vendorId || product.vendor_id || product.vendorid;
        const matches = productVendorId == selectedVendorId;
        const isActive = (product.status === 'Active' || product.status === 'active');
        const notDiscontinued = !product.discontinuedDate;
        return matches && isActive && notDiscontinued;
      });
      setVendorProducts(filtered);
      setRefreshKey(prev => prev + 1);
    } else {
      setVendorProducts([]);
    }
  }, [selectedVendorId, allProducts]);

  // Auto-switch view based on product count
  useEffect(() => {
    if (vendorProducts.length <= 12) {
      setIsGridView(true);
    } else {
      setIsGridView(false);
    }
  }, [vendorProducts.length]);

  // Auto-calculate expected delivery date when vendor changes
  useEffect(() => {
    if (selectedVendorId > 0 && vendors && Array.isArray(vendors)) {
      const selectedVendor = vendors.find((v: any) => v.id === selectedVendorId);
      if (selectedVendor?.leadTime) {
        const orderDate = new Date(form.watch("orderDate"));
        const expectedDate = new Date(orderDate);
        expectedDate.setDate(orderDate.getDate() + selectedVendor.leadTime);
        form.setValue("expectedDate", expectedDate.toISOString().split('T')[0]);
      }
    }
  }, [selectedVendorId, vendors, form]);

  // Product ID input handler - only search within vendor's products
  const handleProductIdSubmit = () => {
    if (!productIdInput || !quantityInput) return;
    
    // Only search within the current vendor's products
    const product = vendorProducts?.find((p: any) => 
      (p.product_id || p.productId) === parseInt(productIdInput)
    );
    
    if (product) {
      setProductQuantities(prev => ({
        ...prev,
        [product.id]: parseInt(quantityInput)
      }));
      setProductIdInput("");
      setQuantityInput("");
    } else {
      // Product not found in vendor's catalog
      alert(`Product ID ${productIdInput} not found in ${vendors?.find((v: any) => v.id === selectedVendorId)?.name} catalog`);
    }
  };

  // Add product to order handler
  const handleAddToOrder = (product: any, quantity: number) => {
    if (quantity > 0) {
      setProductQuantities(prev => ({
        ...prev,
        [product.id]: quantity
      }));
    }
  };

  // Get paginated vendor products
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVendorProducts = vendorProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(vendorProducts.length / itemsPerPage);

  if (isLoadingPOs || isLoadingVendors || isLoadingProducts || isLoadingLocations || isLoadingStores) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {purchaseOrders?.map((po: any) => (
              <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">PO #{po.poNumber}</div>
                  <div className="text-sm text-gray-500">
                    {po.vendor?.name} • {new Date(po.orderDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/purchase-orders/view/${po.id}`;
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {(po.status === 'pending' || po.status === 'submitted' || po.status === 'scheduled') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/purchase-orders/edit/${po.id}`;
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {(po.status === 'received' || po.status === 'closed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/purchase-orders/view/${po.id}`;
                      }}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                  )}
                  <Badge variant={po.status === 'pending' ? 'secondary' : 'default'}>
                    {po.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Purchase Order Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {isEditMode ? 'Edit' : 'Create'} Purchase Order - {currentStep === 'header' ? 'Header Information' : 
                                      currentStep === 'products' ? 'Product Selection' : 
                                      'Review & Totals'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* STEP 1: Header Information */}
              {currentStep === 'header' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Popover open={vendorComboOpen} onOpenChange={setVendorComboOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={vendorComboOpen}
                                  className="w-full justify-between"
                                >
                                  {field.value && field.value > 0
                                    ? vendors?.find((vendor: any) => vendor.id === field.value)?.name
                                    : "Select vendor..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search vendors..." 
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const filteredVendors = vendors?.filter((v: any) => 
                                        v.name.toLowerCase().includes(e.currentTarget.value.toLowerCase())
                                      );
                                      if (filteredVendors && filteredVendors.length === 1) {
                                        const vendor = filteredVendors[0];
                                        setSelectedVendorId(vendor.id);
                                        field.onChange(vendor.id);
                                        setCurrentPage(1);
                                        setVendorComboOpen(false);
                                      }
                                    }
                                  }}
                                />
                                <CommandList>
                                  <CommandEmpty>No vendor found.</CommandEmpty>
                                  <CommandGroup>
                                    {vendors
                                      ?.sort((a: any, b: any) => a.name.localeCompare(b.name))
                                      ?.map((vendor: any) => (
                                        <CommandItem
                                          key={vendor.id}
                                          value={vendor.name}
                                          onSelect={() => {
                                            const vendorId = vendor.id;
                                            setSelectedVendorId(vendorId);
                                            field.onChange(vendorId);
                                            setCurrentPage(1);
                                            setVendorComboOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              field.value === vendor.id ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          {vendor.name}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orderDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e);
                                // Auto-calculate expected delivery date based on vendor lead time
                                if (selectedVendorId > 0) {
                                  const selectedVendor = vendors?.find((v: any) => v.id === selectedVendorId);
                                  const leadTimeDays = selectedVendor?.leadTime || 3; // Use leadTime field from vendors table
                                  const orderDate = new Date(e.target.value);
                                  const expectedDate = new Date(orderDate);
                                  expectedDate.setDate(orderDate.getDate() + leadTimeDays);
                                  form.setValue("expectedDate", expectedDate.toISOString().split('T')[0]);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expectedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Delivery Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shipToLocationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ship To</FormLabel>
                          <Select 
                            value={field.value.toString()} 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue 
                                  placeholder="Select shipping location..."
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Warehouse locations */}
                              {locations?.map((location: any) => (
                                <SelectItem key={`loc-${location.id}`} value={location.id.toString()}>
                                  {location.name} - {location.code}
                                </SelectItem>
                              ))}
                              {/* Store locations */}
                              {stores?.map((store: any) => (
                                <SelectItem key={`store-${store.id}`} value={`store-${store.id}`}>
                                  {store.name} - Store #{store.storeNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billToLocationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bill To</FormLabel>
                          <Select 
                            value={field.value.toString()} 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select billing location..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations?.map((location: any) => (
                                <SelectItem key={location.id} value={location.id.toString()}>
                                  {location.name} - {location.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lumpSumAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lump Sum Allowance</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field} 
                              placeholder="0.00"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryCharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Charge</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field} 
                              placeholder="0.00"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Optional notes..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Vendor Information Display */}
                  {selectedVendorId > 0 && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-blue-900">
                              {vendors?.find((v: any) => v.id === selectedVendorId)?.name}
                            </h4>
                            <p className="text-sm text-blue-700">
                              {vendorProducts.length} products available
                            </p>
                            
                            {/* Standing Orders Section */}
                            <div className="mt-3 flex items-center gap-2">
                              {vendorStandingOrders && Array.isArray(vendorStandingOrders) && vendorStandingOrders.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-800 border-blue-300 hover:bg-blue-100"
                                    onClick={() => setShowStandingOrders(true)}
                                  >
                                    <Package className="h-3 w-3 mr-1" />
                                    View Standing Orders ({vendorStandingOrders.length})
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-800 border-blue-300 hover:bg-blue-100"
                                  onClick={() => {
                                    // TODO: Open add standing order dialog
                                    console.log('Add standing order for vendor:', selectedVendorId);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Standing Order
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm text-blue-700">
                            <div>Ship To: {
                              form.watch("shipToLocationId").toString().startsWith('store-') 
                                ? stores?.find((s: any) => s.id === parseInt(form.watch("shipToLocationId").toString().replace('store-', '')))?.name
                                : locations?.find((l: any) => l.id === form.watch("shipToLocationId"))?.name
                            }</div>
                            <div>Bill To: {locations?.find((l: any) => l.id === form.watch("billToLocationId"))?.name}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* STEP 2: Product Selection */}
              {currentStep === 'products' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Select Products</h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={isGridView ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsGridView(true)}
                      >
                        Grid View
                      </Button>
                      <Button
                        type="button"
                        variant={!isGridView ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsGridView(false)}
                      >
                        10-Key Entry
                      </Button>
                    </div>
                  </div>

                  {/* Grid View */}
                  {isGridView && (
                    <Card key={`grid-${refreshKey}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">
                            Available Products ({vendorProducts.length} total)
                          </CardTitle>
                          <div className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Products Table */}
                        <div className="border rounded-lg">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Product ID
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Product Details
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pricing
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedVendorProducts.map((product: any) => (
                                  <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {product.product_id || product.productId}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold">
                                      <Input
                                        type="number"
                                        placeholder="Qty"
                                        className="w-20 font-bold"
                                        value={productQuantities[product.id] || ""}
                                        onChange={(e) => {
                                          const qty = parseInt(e.target.value) || 0;
                                          if (qty > 0) {
                                            setProductQuantities(prev => ({
                                              ...prev,
                                              [product.id]: qty
                                            }));
                                          } else {
                                            setProductQuantities(prev => {
                                              const newState = { ...prev };
                                              delete newState[product.id];
                                              return newState;
                                            });
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const qty = parseInt(e.currentTarget.value) || 0;
                                            if (qty > 0) {
                                              handleAddToOrder(product, qty);
                                            }
                                          }
                                        }}
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      <div className="space-y-1">
                                        <div className="font-medium">
                                          {[
                                            product.brand || '',
                                            product.product_description || product.productDescription,
                                            product.case_pack && product.size ? `${product.case_pack}/${product.size}` : product.size || ''
                                          ].filter(Boolean).join(' ')}
                                        </div>
                                        {product.configurationName && (
                                          <div className="text-xs text-blue-600 font-medium">
                                            {product.configurationName}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="space-y-1">
                                        {/* Show unit cost if available and different from purchase cost */}
                                        {product.unit_cost && parseFloat(product.unit_cost) > 0 && parseFloat(product.unit_cost) !== parseFloat(product.purchase_cost || product.purchaseCost || "0") ? (
                                          <>
                                            <div className="text-xs text-gray-600">
                                              Unit Cost: ${parseFloat(product.unit_cost).toFixed(2)}
                                            </div>
                                            <div className="font-medium text-gray-900">
                                              {product.configuration_name || 'Case'}: ${parseFloat(product.purchase_cost || product.purchaseCost || "0").toFixed(2)}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="font-medium text-gray-900">
                                            Cost: ${parseFloat(product.purchase_cost || product.purchaseCost || "0").toFixed(2)}
                                          </div>
                                        )}
                                        {product.off_invoice && parseFloat(product.off_invoice) !== 0 && (
                                          <div className="text-xs text-blue-600">
                                            Off Invoice: ${parseFloat(product.off_invoice).toFixed(2)}
                                          </div>
                                        )}
                                        {product.billback && parseFloat(product.billback) !== 0 && (
                                          <div className="text-xs text-purple-600">
                                            Billback: ${parseFloat(product.billback).toFixed(2)}
                                          </div>
                                        )}
                                        {product.case_allowance && parseFloat(product.case_allowance) !== 0 && (
                                          <div className="text-xs text-green-600">
                                            Case Allowance: ${parseFloat(product.case_allowance).toFixed(2)}
                                          </div>
                                        )}
                                        {product.vendor_allowance && parseFloat(product.vendor_allowance) !== 0 && (
                                          <div className="text-xs text-green-600">
                                            Vendor Allowance: ${parseFloat(product.vendor_allowance).toFixed(2)}
                                          </div>
                                        )}
                                        {(product.off_invoice || product.billback || product.case_allowance || product.vendor_allowance) && (
                                          <div className="text-xs font-medium text-gray-700 pt-1 border-t">
                                            Net Cost: ${(
                                              parseFloat(product.purchase_cost || product.purchaseCost || "0") -
                                              parseFloat(product.off_invoice || "0") -
                                              parseFloat(product.billback || "0") -
                                              parseFloat(product.case_allowance || "0") -
                                              parseFloat(product.vendor_allowance || "0")
                                            ).toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            
                            <div className="flex gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = Math.max(1, currentPage - 2) + i;
                                if (pageNum > totalPages) return null;
                                return (
                                  <Button
                                    key={pageNum}
                                    type="button"
                                    variant={pageNum === currentPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-8 h-8 p-0 text-xs"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* 10-Key Entry */}
                  {!isGridView && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-3">
                          <label className="block text-sm font-medium mb-1">Product ID</label>
                          <Input
                            value={productIdInput}
                            onChange={(e) => setProductIdInput(e.target.value)}
                            placeholder="Enter product ID..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                document.getElementById('quantity-input')?.focus();
                              }
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-1">Quantity</label>
                          <Input
                            id="quantity-input"
                            value={quantityInput}
                            onChange={(e) => setQuantityInput(e.target.value)}
                            placeholder="Enter quantity..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleProductIdSubmit();
                              }
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-1 text-blue-700">Configuration</label>
                          <div className="h-10 px-3 py-2 border-2 border-blue-300 rounded-md bg-blue-50 flex items-center">
                            <span className="font-bold text-blue-900 text-center w-full">
                              {productIdInput ? 
                                (allProducts?.find((p: any) => p.product_id === parseInt(productIdInput))?.configuration_name || 'Unknown') :
                                '—'
                              }
                            </span>
                          </div>
                        </div>
                        <div className="col-span-4">
                          <label className="block text-sm font-medium mb-1">Product Details</label>
                          <div className="h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                            <span className="text-sm text-gray-700 truncate">
                              {productIdInput ? 
                                (allProducts?.find((p: any) => p.product_id === parseInt(productIdInput))?.product_description || 'Product not found') :
                                'Enter product ID above'
                              }
                            </span>
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Button type="button" onClick={handleProductIdSubmit} className="w-full">
                            Add
                          </Button>
                        </div>
                      </div>
                      
                      {/* Vendor Product Reference */}
                      {vendorProducts && vendorProducts.length > 0 && (
                        <Card className="bg-gray-50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              Available Product IDs for {vendors?.find((v: any) => v.id === selectedVendorId)?.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                              {vendorProducts.map((product: any) => (
                                <div key={product.id} className="flex items-center gap-2 p-1 bg-white rounded border">
                                  <span className="font-mono font-bold text-blue-600">
                                    {product.product_id || product.productId}
                                  </span>
                                  <span className="truncate text-gray-600">
                                    {(product.product_description || product.productDescription)?.substring(0, 20)}...
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Selected Products */}
                  {Object.keys(productQuantities).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Selected Products</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {/* Header */}
                          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
                            <div className="col-span-1">ID</div>
                            <div className="col-span-1">Qty</div>
                            <div className="col-span-2 text-blue-700">Config</div>
                            <div className="col-span-6">Product Description</div>
                            <div className="col-span-2 text-right">Action</div>
                          </div>
                          
                          {Object.entries(productQuantities).map(([productId, quantity]) => {
                            const product = allProducts?.find((p: any) => p.id === parseInt(productId));
                            return (
                              <div key={productId} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded border">
                                <div className="col-span-1 text-sm font-mono">
                                  {product?.product_id || product?.productId}
                                </div>
                                <div className="col-span-1 text-sm font-bold">
                                  {quantity}
                                </div>
                                <div className="col-span-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                                    {product?.configuration_name || 'Unknown'}
                                  </span>
                                </div>
                                <div className="col-span-6 text-sm">
                                  {product?.product_description || product?.productDescription}
                                </div>
                                <div className="col-span-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setProductQuantities(prev => {
                                        const newState = { ...prev };
                                        delete newState[productId];
                                        return newState;
                                      });
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* STEP 3: Totals and Review */}
              {currentStep === 'totals' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Review & Totals</h3>
                  
                  {/* Detailed Line Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Line Items Detail
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Product</th>
                              <th className="text-right p-2">Qty</th>
                              <th className="text-right p-2">Unit Cost</th>
                              <th className="text-right p-2">Off Invoice</th>
                              <th className="text-right p-2">Bill Back</th>
                              <th className="text-right p-2">CRV</th>
                              <th className="text-right p-2">Ext List</th>
                              <th className="text-right p-2">Ext Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(productQuantities).map(([productId, quantity]) => {
                              const product = allProducts?.find((p: any) => p.id === parseInt(productId));
                              const unitCost = parseFloat(product?.purchase_cost || product?.purchaseCost || "0");
                              const offInvoice = parseFloat(product?.off_invoice || product?.offInvoice || "0");
                              const billBack = parseFloat(product?.bill_back || product?.billBack || "0");
                              const crv = parseFloat(product?.crv || "0");
                              const extendedList = unitCost * quantity;
                              const netUnitCost = unitCost - offInvoice;
                              const extendedNet = netUnitCost * quantity;
                              
                              return (
                                <tr key={productId} className="border-b">
                                  <td className="p-2">
                                    <div className="font-medium">
                                      {product?.product_description || product?.productDescription}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ID: {product?.product_id || product?.productId}
                                    </div>
                                  </td>
                                  <td className="text-right p-2">{quantity}</td>
                                  <td className="text-right p-2">${unitCost.toFixed(4)}</td>
                                  <td className="text-right p-2">${offInvoice.toFixed(4)}</td>
                                  <td className="text-right p-2">${billBack.toFixed(4)}</td>
                                  <td className="text-right p-2">${crv.toFixed(4)}</td>
                                  <td className="text-right p-2 font-medium">${extendedList.toFixed(2)}</td>
                                  <td className="text-right p-2 font-medium">${extendedNet.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comprehensive Totals Calculation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Purchase Order Totals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          // Calculate all totals
                          const selectedVendor = vendors?.find((v: any) => v.id === selectedVendorId);
                          const earlyPayDiscount = parseFloat(selectedVendor?.discount_percent || selectedVendor?.discountPercent || "0");
                          
                          let extendedListTotal = 0;
                          let extendedNetTotal = 0;
                          let extendedCrvTotal = 0;
                          let extendedBillBackTotal = 0;
                          
                          Object.entries(productQuantities).forEach(([productId, quantity]) => {
                            const product = allProducts?.find((p: any) => p.id === parseInt(productId));
                            const unitCost = parseFloat(product?.purchase_cost || product?.purchaseCost || "0");
                            const offInvoice = parseFloat(product?.off_invoice || product?.offInvoice || "0");
                            const billBack = parseFloat(product?.bill_back || product?.billBack || "0");
                            const crv = parseFloat(product?.crv || "0");
                            

                            
                            extendedListTotal += unitCost * quantity;
                            extendedNetTotal += (unitCost - offInvoice) * quantity;
                            extendedCrvTotal += crv * quantity;
                            extendedBillBackTotal += billBack * quantity;
                          });
                          
                          const lumpSumAllowance = parseFloat(String(form.getValues('lumpSumAllowance') || "0"));
                          const deliveryCharge = parseFloat(String(form.getValues('deliveryCharge') || "0"));
                          const discountAmount = (extendedListTotal * earlyPayDiscount) / 100;
                          

                          
                          // Final total calculation
                          const finalTotal = extendedNetTotal + extendedCrvTotal - extendedBillBackTotal - lumpSumAllowance + deliveryCharge - discountAmount;
                          
                          return (
                            <>
                              <div className="flex justify-between">
                                <span>Extended List Cost:</span>
                                <span className="font-medium">${extendedListTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Extended Net Cost (after off-invoice):</span>
                                <span className="font-medium">${extendedNetTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Extended CRV:</span>
                                <span className="font-medium">${extendedCrvTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Extended Bill Back Allowances:</span>
                                <span className="font-medium text-green-600">-${extendedBillBackTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Lump Sum Allowance:</span>
                                <span className="font-medium text-green-600">-${lumpSumAllowance.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Delivery Charge:</span>
                                <span className="font-medium">${deliveryCharge.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Early Payment Discount ({earlyPayDiscount}%):</span>
                                <span className="font-medium text-green-600">-${discountAmount.toFixed(2)}</span>
                              </div>
                              <div className="border-t pt-2">
                                <div className="flex justify-between text-lg font-bold">
                                  <span>Total Cost:</span>
                                  <span>${finalTotal.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mt-2">
                                <div>Vendor: {selectedVendor?.name}</div>
                                <div>Total Items: {Object.keys(productQuantities).length}</div>
                                <div>Total Quantity: {Object.values(productQuantities).reduce((sum, qty) => sum + qty, 0)}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  {currentStep !== 'header' && (
                    <Button type="button" variant="outline" onClick={() => {
                      if (currentStep === 'products') setCurrentStep('header');
                      if (currentStep === 'totals') setCurrentStep('products');
                    }}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    setSelectedVendorId(0);
                    setProductQuantities({});
                    setCurrentStep('header');
                    form.reset();
                  }}>
                    Cancel
                  </Button>
                  
                  {currentStep === 'header' && (
                    <Button 
                      type="button"
                      disabled={selectedVendorId === 0}
                      onClick={() => setCurrentStep('products')}
                    >
                      Next: Products
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                  
                  {currentStep === 'products' && (
                    <Button 
                      type="button"
                      disabled={Object.keys(productQuantities).length === 0}
                      onClick={() => setCurrentStep('totals')}
                    >
                      Next: Review
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                  
                  {currentStep === 'totals' && (
                    <Button 
                      type="submit" 
                      disabled={createPOMutation.isPending || selectedVendorId === 0 || Object.keys(productQuantities).length === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createPOMutation.isPending ? "Creating..." : "Create Purchase Order"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Standing Orders Dialog */}
      <Dialog open={showStandingOrders} onOpenChange={setShowStandingOrders}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Standing Orders - {vendors?.find((v: any) => v.id === selectedVendorId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {vendorStandingOrders && Array.isArray(vendorStandingOrders) && vendorStandingOrders.length > 0 ? (
              <div className="space-y-3">
                {vendorStandingOrders.map((order: any) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{order.name}</h4>
                        {order.description && (
                          <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Created: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown'}</span>
                          {order.lastUsedAt && (
                            <span>Last used: {new Date(order.lastUsedAt).toLocaleDateString()}</span>
                          )}
                          {order.usageCount && (
                            <span>Used {order.usageCount} times</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Load standing order items into current PO
                              const response = await fetch(`/api/standing-orders/${order.id}/items`);
                              const items = await response.json();
                              
                              // Convert standing order items to product quantities
                              const newQuantities: Record<string, number> = {};
                              items.forEach((item: any) => {
                                newQuantities[item.productId.toString()] = item.defaultQuantity;
                              });
                              
                              setProductQuantities(newQuantities);
                              setShowStandingOrders(false);
                              setCurrentStep('products');
                              
                              // Update usage tracking
                              await fetch(`/api/standing-orders/${order.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ lastUsedAt: new Date().toISOString() })
                              });
                            } catch (error) {
                              console.error('Failed to load standing order:', error);
                            }
                          }}
                        >
                          Use This Order
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Open standing order editor
                            console.log('Edit standing order:', order.id);
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No standing orders found for this vendor.
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      setShowStandingOrders(false);
                      // TODO: Open create standing order dialog
                      console.log('Create new standing order for vendor:', selectedVendorId);
                    }}
                  >
                    Create First Standing Order
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStandingOrders(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}