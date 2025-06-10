import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Plus, Search, Filter, Eye, Edit, Printer, Calendar, Save, Grid3X3, Keyboard, BookOpen, Star, ArrowLeft, ArrowRight, CheckCircle, FileText, Package, Calculator } from "lucide-react";
import { format, addDays } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPurchaseOrderSchema, type PurchaseOrder, type Vendor, type Product } from "@shared/schema";
import { z } from "zod";

// Enhanced form schema matching Django form
const createPOSchema = insertPurchaseOrderSchema.extend({
  orderDate: z.date(),
  expectedDate: z.date().optional(),
  vendorId: z.number().min(1, "Please select a vendor"),
  shipTo: z.string().default("Cost Less Warehouse"),
  billTo: z.string().default("Cost Less Accounting"),
  deliveryCharges: z.string().default("0.00"),
  lumpSumAllowance: z.string().default("0.00"),
  deductBillBack: z.boolean().default(false),
  deductLumpSum: z.boolean().default(false),
  specialInstructions: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    quantityOrdered: z.number().min(1),
    unitCost: z.string(),
    config: z.string().default("Default"),
  })).min(1, "At least one item is required"),
});

type CreatePOFormData = z.infer<typeof createPOSchema>;

// Status badge styling
const getStatusBadge = (status: string) => {
  const variants = {
    pending: "default",
    sent: "secondary", 
    partial: "secondary",
    received: "default",
    cancelled: "destructive"
  } as const;
  
  return <Badge variant={variants[status as keyof typeof variants] || "default"}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>;
};

export default function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number>(0);
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const [productSearch, setProductSearch] = useState("");
  const [productIdInput, setProductIdInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [forceGridView, setForceGridView] = useState(false);
  const [force10KeyView, setForce10KeyView] = useState(false);
  const { toast } = useToast();

  // Multi-stage workflow state
  const [currentStep, setCurrentStep] = useState<'header' | 'products' | 'totals'>('header');
  const [headerData, setHeaderData] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    productId: number;
    quantity: number;
    unitCost: string;
    notes?: string;
  }>>([]);

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["/api/purchase-orders"],
  });

  // Fetch vendors for dropdown
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Fetch all products
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch standing orders
  const { data: standingOrders = [] } = useQuery({
    queryKey: ["/api/standing-orders"],
  });

  // Fetch standing orders for selected vendor
  const { data: vendorStandingOrders = [] } = useQuery({
    queryKey: ["/api/vendors", selectedVendorId, "standing-orders"],
    enabled: selectedVendorId > 0,
  });

  // Filter products by selected vendor and search term
  const vendorProducts = useMemo(() => {
    if (!selectedVendorId) return [];
    let filtered = allProducts.filter((product: any) => product.vendorid === selectedVendorId && product.status === 'Active');
    
    // Apply search filter
    if (productSearch) {
      const searchLower = productSearch.toLowerCase();
      filtered = filtered.filter((product: any) => 
        product.productId?.toString().includes(searchLower) ||
        product.product_id?.toString().includes(searchLower) ||
        product.productDescription?.toLowerCase().includes(searchLower) ||
        product.product_description?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.productName?.toLowerCase().includes(searchLower) ||
        product.product_name?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [allProducts, selectedVendorId, productSearch]);

  // Find matching products for real-time preview (show all matches, no limit)
  const matchingProducts = useMemo(() => {
    if (!selectedVendorId || !productIdInput) return [];
    const searchId = productIdInput.toLowerCase();
    return allProducts.filter((product: any) => 
      product.vendorid === selectedVendorId && 
      product.status === 'Active' &&
      ((product.product_id?.toString().startsWith(searchId)) || 
       (product.productId?.toString().startsWith(searchId)))
    ).sort((a: any, b: any) => {
      // Sort by product ID numerically
      const aId = parseInt((a.product_id || a.productId).toString());
      const bId = parseInt((b.product_id || b.productId).toString());
      return aId - bId;
    });
  }, [allProducts, selectedVendorId, productIdInput]);

  // Reset selected index when matching products change
  useEffect(() => {
    setSelectedProductIndex(0);
  }, [matchingProducts.length]);

  // Determine which interface to show
  const shouldUseGridView = useMemo(() => {
    if (force10KeyView) return false;
    if (forceGridView) return true;
    return vendorProducts.length <= 12 && vendorProducts.length > 0;
  }, [vendorProducts.length, forceGridView, force10KeyView]);

  // Reset view toggles when vendor changes
  useEffect(() => {
    setForceGridView(false);
    setForce10KeyView(false);
  }, [selectedVendorId]);

  // Get selected vendor details for auto-population
  const selectedVendor = useMemo(() => {
    return vendors.find((vendor: any) => vendor.id === selectedVendorId);
  }, [vendors, selectedVendorId]);

  const form = useForm<CreatePOFormData>({
    resolver: zodResolver(createPOSchema),
    defaultValues: {
      vendorId: 0,
      orderDate: new Date(),
      expectedDate: new Date(),
      shipTo: "Cost Less Warehouse",
      billTo: "Cost Less Accounting", 
      deliveryCharges: "0.00",
      lumpSumAllowance: "0.00",
      deductBillBack: false,
      deductLumpSum: false,
      specialInstructions: "",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Auto-calculate expected delivery date when vendor or order date changes
  useEffect(() => {
    if (selectedVendor?.leadTime && form.getValues("orderDate")) {
      const orderDate = new Date(form.getValues("orderDate"));
      const expectedDate = new Date(orderDate);
      expectedDate.setDate(expectedDate.getDate() + selectedVendor.leadTime);
      form.setValue("expectedDate", expectedDate);
    }
  }, [selectedVendor?.leadTime, form.watch("orderDate"), selectedVendor, form]);

  // Auto-populate fields when vendor is selected
  useEffect(() => {
    if (selectedVendor) {
      form.setValue("vendorId", selectedVendor.id);
      
      // Calculate expected delivery date based on vendor lead time
      const leadTime = selectedVendor.leadTime || 7; // Default 7 days if not specified
      const expectedDate = addDays(new Date(), leadTime);
      form.setValue("expectedDate", expectedDate);
      
      // Set payment terms from vendor
      if (selectedVendor.paymentTerms) {
        // Payment terms would be used in the PO but not in this simplified form
      }
    }
  }, [selectedVendor, form]);

  // Auto-populate line items with all vendor products when vendor changes
  useEffect(() => {
    if (selectedVendorId && vendorProducts.length > 0) {
      // Clear existing items and populate with all vendor products
      form.setValue("items", vendorProducts.map((product: any) => ({
        productId: product.id,
        quantityOrdered: 0, // Start with 0, user will enter quantities for items they want
        unitCost: product.lastcost || "0.00",
        config: "case" // Default to case
      })));
    }
  }, [selectedVendorId, vendorProducts, form]);

  // Handle quantity changes
  const handleQuantityChange = (productId: number, quantity: string) => {
    const qty = parseInt(quantity) || 0;
    if (qty > 0) {
      setProductQuantities(prev => ({ ...prev, [productId]: qty }));
    } else {
      setProductQuantities(prev => {
        const { [productId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // Create purchase order mutation
  const createPOMutation = useMutation({
    mutationFn: async (data: CreatePOFormData) => {
      return await apiRequest("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  // Filter purchase orders
  const filteredPOs = purchaseOrders.filter((po: any) => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle different status filters
    let matchesStatus = false;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "active") {
      // Show only Scheduled and Pending orders (excluding Received)
      matchesStatus = po.status?.toLowerCase() === "scheduled" || po.status?.toLowerCase() === "pending";
    } else {
      matchesStatus = po.status?.toLowerCase() === statusFilter.toLowerCase();
    }
    
    return matchesSearch && matchesStatus;
  });

  // Function to add product by ID
  const addProductById = () => {
    const productId = parseInt(productIdInput);
    const quantity = parseInt(quantityInput || "1");
    
    if (!productId || !quantity || quantity < 1) {
      toast({
        title: "Error",
        description: "Please enter a valid product ID and quantity",
        variant: "destructive",
      });
      return;
    }
    
    const product = allProducts.find((p: any) => p.product_id === productId || p.productId === productId);
    if (!product) {
      toast({
        title: "Error",
        description: `Product ID ${productId} not found`,
        variant: "destructive",
      });
      return;
    }
    
    if (product.vendorid !== selectedVendorId) {
      toast({
        title: "Error",
        description: `Product ID ${productId} belongs to a different vendor`,
        variant: "destructive",
      });
      return;
    }
    
    setProductQuantities(prev => ({
      ...prev,
      [product.id]: quantity
    }));
    
    setProductIdInput("");
    setQuantityInput("");
    
    toast({
      title: "Success",
      description: `Added ${product.product_description || product.productDescription} (Qty: ${quantity})`,
    });

    // Return focus to product ID field for next entry
    setTimeout(() => {
      const productIdField = document.querySelector('input[placeholder="Enter ID"]') as HTMLInputElement;
      if (productIdField) {
        productIdField.focus();
      }
    }, 100);
  };

  const onSubmit = (data: CreatePOFormData) => {
    // Build items array from product quantities
    const items = Object.entries(productQuantities).map(([productId, quantity]) => {
      const product = allProducts.find((p: any) => p.id === parseInt(productId));
      return {
        productId: parseInt(productId),
        quantityOrdered: quantity,
        unitCost: product?.purchase_cost || product?.purchaseCost || "0.00",
        config: "Default",
      };
    });

    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please enter quantities for at least one product",
        variant: "destructive",
      });
      return;
    }

    const poData = {
      ...data,
      items,
      status: "pending",
    };

    createPOMutation.mutate(poData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage orders from vendors and track deliveries
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {currentStep === 'header' && <FileText className="h-5 w-5 text-blue-600" />}
                  {currentStep === 'products' && <Package className="h-5 w-5 text-green-600" />}
                  {currentStep === 'totals' && <Calculator className="h-5 w-5 text-purple-600" />}
                  <span>
                    {currentStep === 'header' && 'Purchase Order - Header Information'}
                    {currentStep === 'products' && 'Purchase Order - Product Selection'}
                    {currentStep === 'totals' && 'Purchase Order - Review & Totals'}
                  </span>
                </div>
                <span className="text-sm font-normal">PO #: Auto-Generated</span>
              </DialogTitle>
            </DialogHeader>

            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center space-x-8 mb-6 py-4 border-b">
              <div className={`flex items-center space-x-2 ${currentStep === 'header' ? 'text-blue-600' : currentStep === 'products' || currentStep === 'totals' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'header' ? 'bg-blue-600 text-white' : currentStep === 'products' || currentStep === 'totals' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep === 'products' || currentStep === 'totals' ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span className="font-medium">Header</span>
              </div>
              
              <div className={`w-12 h-0.5 ${currentStep === 'products' || currentStep === 'totals' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
              
              <div className={`flex items-center space-x-2 ${currentStep === 'products' ? 'text-blue-600' : currentStep === 'totals' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'products' ? 'bg-blue-600 text-white' : currentStep === 'totals' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep === 'totals' ? <CheckCircle className="h-4 w-4" /> : '2'}
                </div>
                <span className="font-medium">Products</span>
              </div>
              
              <div className={`w-12 h-0.5 ${currentStep === 'totals' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
              
              <div className={`flex items-center space-x-2 ${currentStep === 'totals' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'totals' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="font-medium">Totals</span>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* STEP 1: Header Information */}
                {currentStep === 'header' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                    <label className="block text-sm font-medium mb-2">Vendor</label>
                    <Select 
                      value={selectedVendorId.toString()} 
                      onValueChange={(value) => {
                        const vendorId = parseInt(value);
                        setSelectedVendorId(vendorId);
                        form.setValue("vendorId", vendorId);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendorsLoading ? (
                          <SelectItem value="loading" disabled>Loading vendors...</SelectItem>
                        ) : vendors.length === 0 ? (
                          <SelectItem value="none" disabled>No vendors available</SelectItem>
                        ) : (
                          vendors.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                              {vendor.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedVendor && (
                      <div className="mt-2 p-3 bg-white border rounded text-sm">
                        <div className="font-semibold text-blue-700">{selectedVendor.name}</div>
                        {selectedVendor.address && (
                          <div className="text-gray-700">{selectedVendor.address}</div>
                        )}
                        {(selectedVendor.city || selectedVendor.state || selectedVendor.zip_code) && (
                          <div className="text-gray-700">
                            {[selectedVendor.city, selectedVendor.state, selectedVendor.zip_code].filter(Boolean).join(", ")}
                          </div>
                        )}
                        {selectedVendor.phone && (
                          <div className="text-gray-700">📞 {selectedVendor.phone}</div>
                        )}
                        {selectedVendor.leadTime && (
                          <div className="text-gray-500 text-xs mt-1">Lead Time: {selectedVendor.leadTime} days</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="orderDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PO Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
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
                          <FormLabel>Expected Delivery</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="billTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill To</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cost Less Accounting">Cost Less Accounting</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="mt-2 p-3 bg-white border rounded text-sm">
                          <div className="font-semibold">Cost Less Accounting</div>
                          <div className="text-gray-700">102 S. 11th Ave</div>
                          <div className="text-gray-700">Hanford, CA 93230</div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ship To</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cost Less Warehouse">Cost Less Warehouse</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="mt-2 p-3 bg-white border rounded text-sm">
                          <div className="font-semibold">Cost Less Warehouse</div>
                          <div className="text-gray-700">2905 Railroad Ave</div>
                          <div className="text-gray-700">Ceres, CA 95307</div>
                          <div className="text-gray-700">📞 209-537-4472</div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Financial Fields Row */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="deliveryCharges"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Charges</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deductBillBack"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Deduct Bill Back</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="lumpSumAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lump Sum Allowance</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deductLumpSum"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Deduct Lump Sum</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3 bg-white border rounded">
                    <div className="text-sm font-medium">Payment Terms:</div>
                    <div className="text-sm text-gray-700">
                      {selectedVendor?.discountPercent && selectedVendor?.epDays && selectedVendor?.netDays 
                        ? `${(parseFloat(selectedVendor.discountPercent) * 100).toFixed(2)}% in ${selectedVendor.epDays} days Net ${selectedVendor.netDays}`
                        : selectedVendor?.paymentTerms || "2.00% in 10 days Net 30"
                      }
                    </div>
                  </div>
                </div>

                {/* Special Instructions and Notes */}
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions (For Vendor)</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[100px]"
                            placeholder="Instructions that will appear on the PO sent to vendor..."
                            {...field}
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
                        <FormLabel>Notes (For internal use only)</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[100px]"
                            placeholder="Internal notes - not visible to vendor..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Line Items - Adaptive Interface */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Line Items {selectedVendor ? `- ${selectedVendor.name}` : ''}
                      {selectedVendorId && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({vendorProducts.length} available products)
                        </span>
                      )}
                    </h3>
                    
                    {/* Interface Toggle Controls */}
                    {selectedVendorId && vendorProducts.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={shouldUseGridView ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setForceGridView(true);
                            setForce10KeyView(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Grid3X3 className="h-4 w-4" />
                          Grid View
                        </Button>
                        <Button
                          type="button"
                          variant={!shouldUseGridView ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setForce10KeyView(true);
                            setForceGridView(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Keyboard className="h-4 w-4" />
                          10-Key Entry
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Standing Orders Section */}
                  {selectedVendorId && vendorStandingOrders.length > 0 && (
                    <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                      <h4 className="font-medium mb-3 text-amber-900 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Standing Orders - Quick Replenishment
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {vendorStandingOrders.map((standingOrder: any) => (
                          <div 
                            key={standingOrder.id}
                            className="border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md bg-white border-amber-300 hover:border-amber-400"
                            onClick={() => {
                              // Load standing order items into product quantities
                              const newQuantities: Record<number, number> = {};
                              standingOrder.items?.forEach((item: any) => {
                                newQuantities[item.productId] = item.defaultQuantity;
                              });
                              setProductQuantities(newQuantities);
                              
                              toast({
                                title: "Standing Order Loaded",
                                description: `${standingOrder.name} (${standingOrder.items?.length || 0} items)`,
                              });
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium text-amber-900">
                                {standingOrder.name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-amber-500" />
                                <span className="text-xs text-amber-700">
                                  {standingOrder.usageCount || 0}
                                </span>
                              </div>
                            </div>
                            {standingOrder.description && (
                              <div className="text-xs text-gray-600 mb-2">
                                {standingOrder.description}
                              </div>
                            )}
                            <div className="text-xs text-amber-700">
                              {standingOrder.items?.length || 0} products
                              {standingOrder.lastUsedAt && (
                                <span className="ml-2">
                                  • Last used {format(new Date(standingOrder.lastUsedAt), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grid View for Small Catalogs (≤12 products) */}
                  {selectedVendorId && shouldUseGridView && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3 text-gray-900">All Products - Click to Add</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {vendorProducts.map((product: any) => {
                          const quantity = productQuantities[product.id] || 0;
                          const listCost = parseFloat(product.purchase_cost || product.purchaseCost || "0");
                          const offInvoice = parseFloat(product.off_invoice || product.offInvoice || "0");
                          const netCost = listCost - offInvoice;
                          
                          return (
                            <div 
                              key={product.id}
                              className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                                quantity > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-blue-300'
                              }`}
                              onClick={() => {
                                const newQty = quantity + 1;
                                setProductQuantities(prev => ({
                                  ...prev,
                                  [product.id]: newQty
                                }));
                                toast({
                                  title: "Added",
                                  description: `${product.product_description || product.productDescription} (Qty: ${newQty})`,
                                });
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {product.product_id || product.productId}
                                </div>
                                {quantity > 0 && (
                                  <div className="bg-green-500 text-white text-xs px-2 py-1 rounded font-bold">
                                    Qty: {quantity}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {product.brand} {(product.product_description || product.productDescription)}
                              </div>
                              <div className="text-xs text-gray-600 mb-2">
                                {product.case_pack || product.casePack}/{product.size}
                              </div>
                              <div className="text-xs text-gray-700">
                                <div>List: {formatCurrency(listCost.toFixed(2))}</div>
                                <div>Net: {formatCurrency(netCost.toFixed(2))}</div>
                                {quantity > 0 && (
                                  <div className="font-medium text-green-700">
                                    Total: {formatCurrency((quantity * netCost).toFixed(2))}
                                  </div>
                                )}
                              </div>
                              {quantity > 0 && (
                                <div className="mt-2 flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newQty = Math.max(0, quantity - 1);
                                      if (newQty === 0) {
                                        const newQuantities = { ...productQuantities };
                                        delete newQuantities[product.id];
                                        setProductQuantities(newQuantities);
                                      } else {
                                        setProductQuantities(prev => ({
                                          ...prev,
                                          [product.id]: newQty
                                        }));
                                      }
                                    }}
                                  >
                                    -
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProductQuantities(prev => ({
                                        ...prev,
                                        [product.id]: quantity + 1
                                      }));
                                    }}
                                  >
                                    +
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 10-Key Entry Section with Real-time Preview */}
                  {selectedVendorId && !shouldUseGridView && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium mb-3 text-blue-900">10-Key Entry System</h4>
                      <div className="grid grid-cols-2 gap-6">
                        {/* Entry Fields */}
                        <div>
                          <div className="flex gap-4 items-end mb-3">
                            <div className="w-32">
                              <label className="block text-sm font-medium mb-1">Product ID</label>
                              <Input 
                                type="text"
                                value={productIdInput}
                                onChange={(e) => setProductIdInput(e.target.value)}
                                placeholder="Enter ID"
                                className="text-center"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (matchingProducts.length > 0) {
                                      const selectedProduct = matchingProducts[selectedProductIndex];
                                      setProductIdInput((selectedProduct.product_id || selectedProduct.productId).toString());
                                    }
                                    document.getElementById('quantity-input')?.focus();
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedProductIndex(prev => 
                                      prev < matchingProducts.length - 1 ? prev + 1 : 0
                                    );
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedProductIndex(prev => 
                                      prev > 0 ? prev - 1 : matchingProducts.length - 1
                                    );
                                  } else if (e.key === 'Tab') {
                                    if (matchingProducts.length > 0) {
                                      const selectedProduct = matchingProducts[selectedProductIndex];
                                      setProductIdInput((selectedProduct.product_id || selectedProduct.productId).toString());
                                    }
                                  }
                                }}
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-sm font-medium mb-1">Quantity</label>
                              <Input 
                                id="quantity-input"
                                type="number"
                                value={quantityInput || "1"}
                                onChange={(e) => setQuantityInput(e.target.value)}
                                placeholder="1"
                                className="text-center"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addProductById();
                                  }
                                }}
                                onFocus={(e) => {
                                  if (!quantityInput) {
                                    setQuantityInput("1");
                                  }
                                  e.target.select();
                                }}
                              />
                            </div>
                            <Button type="button" onClick={addProductById}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Item
                            </Button>
                          </div>
                          <div className="text-xs text-blue-700">
                            Enter Product ID → Tab/Enter → Enter Quantity → Enter to add
                          </div>
                        </div>

                        {/* Real-time Product Preview - Access-style Autocomplete */}
                        <div>
                          <label className="block text-sm font-medium mb-1">Product Preview ({matchingProducts.length} found)</label>
                          <div className="bg-white border rounded-lg min-h-[120px] max-h-[300px] overflow-y-auto">
                            {productIdInput && matchingProducts.length > 0 ? (
                              <div className="space-y-0">
                                {matchingProducts.map((product: any, index: number) => {
                                  const isExactMatch = (product.product_id || product.productId).toString() === productIdInput;
                                  const isSelected = index === selectedProductIndex;
                                  return (
                                    <div 
                                      key={product.id}
                                      className={`p-2 text-xs border-b cursor-pointer transition-colors ${
                                        isSelected 
                                          ? 'bg-blue-100 border-blue-300' 
                                          : isExactMatch 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'hover:bg-gray-50'
                                      } ${index === 0 ? 'border-t-0' : ''}`}
                                      onClick={() => {
                                        setSelectedProductIndex(index);
                                        setProductIdInput((product.product_id || product.productId).toString());
                                        if (!quantityInput) {
                                          setQuantityInput("1");
                                        }
                                        document.getElementById('quantity-input')?.focus();
                                      }}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium flex items-center gap-2 mb-1">
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                                              isExactMatch ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                              {product.product_id || product.productId}
                                            </span>
                                            {isExactMatch && (
                                              <span className="bg-green-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                                                EXACT MATCH
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-gray-700 mb-1 leading-tight">
                                            <span className="font-medium">{product.brand}</span> {(product.product_description || product.productDescription)}
                                          </div>
                                          <div className="text-gray-600 text-xs">
                                            {product.case_pack || product.casePack}/{product.size} • {formatCurrency(parseFloat(product.purchase_cost || product.purchaseCost || "0").toFixed(2))} each
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : productIdInput ? (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                <div className="text-red-600 font-medium">No products found for ID: {productIdInput}</div>
                                <div className="text-xs mt-1">Check the product ID or try a different vendor</div>
                              </div>
                            ) : (
                              <div className="p-4 text-center text-gray-400 text-sm">
                                <div className="mb-2">Enter a product ID to see matching products</div>
                                <div className="text-xs">Available: {vendorProducts.length} products for this vendor</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Search */}
                  {selectedVendorId && (
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search products by ID, name, or brand..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendorProducts.length} products found
                      </div>
                    </div>
                  )}

                  {/* Selected Products Table */}
                  {Object.keys(productQuantities).length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 p-2 text-sm font-medium">Selected Products</div>
                      {(() => {
                        const selectedProducts = Object.entries(productQuantities).map(([productId, quantity]) => {
                          const product = allProducts.find((p: any) => p.id === parseInt(productId));
                          return { product, quantity };
                        }).filter(item => item.product);

                        const hasCrv = selectedProducts.some(item => parseFloat(item.product.crv || "0") > 0);
                        
                        return (
                          <div className="min-w-full">
                            {/* Header row */}
                            <div className="bg-gray-50 grid gap-1 p-2 text-xs font-medium border-b" style={{gridTemplateColumns: hasCrv ? '80px 50px 1fr 80px 80px 80px 80px 80px 80px 80px 60px' : '80px 50px 1fr 80px 80px 80px 80px 80px 80px 60px'}}>
                              <div className="text-center">Qty</div>
                              <div className="text-center">ID</div>
                              <div className="pl-2">Product Description / Pack Size</div>
                              <div className="text-right pr-2">List Cost</div>
                              <div className="text-right pr-2">Off Invoice</div>
                              <div className="text-right pr-2">Net Cost</div>
                              <div className="text-right pr-2">Ext. Cost</div>
                              <div className="text-right pr-2">Ext. Weight</div>
                              {hasCrv && <div className="text-right pr-2">CRV Ext.</div>}
                              <div className="text-center">Action</div>
                            </div>
                            
                            {/* Data rows */}
                            {selectedProducts.map(({ product, quantity }) => {
                              const listCost = parseFloat(product.purchase_cost || product.purchaseCost || "0");
                              const offInvoice = parseFloat(product.off_invoice || product.offInvoice || "0");
                              const netCost = listCost - offInvoice;
                              const extCost = quantity * netCost;
                              const purchaseWeight = parseFloat(product.purchase_weight || product.purchaseWeight || "0");
                              const extWeight = quantity * purchaseWeight;
                              const crv = parseFloat(product.crv || "0");
                              const crvExt = quantity * crv;
                              
                              return (
                                <div key={product.id} className="grid gap-1 p-2 border-b hover:bg-gray-50 items-center" style={{gridTemplateColumns: hasCrv ? '80px 50px 1fr 80px 80px 80px 80px 80px 80px 80px 60px' : '80px 50px 1fr 80px 80px 80px 80px 80px 80px 60px'}}>
                                  <div className="text-center font-medium">{quantity}</div>
                                  <div className="text-xs text-center">
                                    {product.product_id || product.productId}
                                  </div>
                                  <div className="text-xs pl-2" title={`${(product.product_description || product.productDescription)} ${product.case_pack || product.casePack}/${product.size}`}>
                                    {(product.product_description || product.productDescription)} {product.case_pack || product.casePack}/{product.size}
                                  </div>
                                  <div className="text-xs text-right pr-2">
                                    {formatCurrency(listCost.toFixed(2))}
                                  </div>
                                  <div className="text-xs text-right pr-2">
                                    {formatCurrency(offInvoice.toFixed(2))}
                                  </div>
                                  <div className="text-xs text-right pr-2 font-medium">
                                    {formatCurrency(netCost.toFixed(2))}
                                  </div>
                                  <div className="text-xs text-right pr-2 font-medium">
                                    ${extCost.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-right pr-2">
                                    {extWeight > 0 ? `${extWeight.toFixed(1)} lbs` : '-'}
                                  </div>
                                  {hasCrv && (
                                    <div className="text-xs text-right pr-2">
                                      {crv > 0 ? `$${crvExt.toFixed(2)}` : '-'}
                                    </div>
                                  )}
                                  <div className="text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newQuantities = { ...productQuantities };
                                        delete newQuantities[product.id];
                                        setProductQuantities(newQuantities);
                                      }}
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Available Products (when searching) */}
                  {selectedVendorId && productSearch && vendorProducts.length > 0 && (
                    <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <div className="bg-gray-100 p-2 text-sm font-medium">Available Products (Click to add)</div>
                      {vendorProducts.slice(0, 20).map((product: any) => (
                        <div 
                          key={product.id}
                          className="p-2 border-b hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                          onClick={() => {
                            setProductIdInput((product.product_id || product.productId).toString());
                            setQuantityInput("1");
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 text-xs text-center font-mono bg-gray-100 px-1 py-0.5 rounded">
                              {product.product_id || product.productId}
                            </div>
                            <div className="text-sm">
                              {(product.product_description || product.productDescription)} {product.case_pack || product.casePack}/{product.size}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">{formatCurrency(parseFloat(product.purchase_cost || product.purchaseCost || "0").toFixed(2))}</div>
                        </div>
                      ))}
                      {vendorProducts.length > 20 && (
                        <div className="p-2 text-center text-sm text-gray-500">
                          ...and {vendorProducts.length - 20} more. Refine search to see all.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedVendorId && Object.keys(productQuantities).length === 0 && (
                    <div className="border rounded-lg p-8 text-center text-gray-500">
                      {vendorProducts.length > 0 
                        ? "Use the 10-key entry system above to add products to this order"
                        : "No active products found for this vendor"
                      }
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Order Summary</h4>
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          Extended List Cost: <span className="ml-4">$14653.44</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}

                {/* STEP 2: Product Selection */}
                {currentStep === 'products' && (
                  <div className="space-y-6">
                    <div className="text-center text-gray-500">
                      Product selection interface will be implemented here
                    </div>
                  </div>
                )}

                {/* STEP 3: Totals and Review */}
                {currentStep === 'totals' && (
                  <div className="space-y-6">
                    <div className="text-center text-gray-500">
                      Totals and review interface will be implemented here
                    </div>
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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number or vendor"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Orders (Scheduled & Pending)</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            {filteredPOs.length} purchase orders found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">Loading purchase orders...</div>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">No purchase orders found</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Purchase Order
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-16">
                  <TableHead className="text-lg font-bold py-4">PO Number</TableHead>
                  <TableHead className="text-lg font-bold py-4">Vendor</TableHead>
                  <TableHead className="text-lg font-bold py-4">Order Date</TableHead>
                  <TableHead className="text-lg font-bold py-4">Expected Date</TableHead>
                  <TableHead className="text-lg font-bold py-4">Status</TableHead>
                  <TableHead className="text-lg font-bold py-4">Total Amount</TableHead>
                  <TableHead className="text-lg font-bold py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po: any) => (
                  <TableRow key={po.id} className="h-16 hover:bg-gray-50">
                    <TableCell className="font-bold text-lg py-4">{po.poNumber}</TableCell>
                    <TableCell className="text-lg py-4">{po.vendor?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-lg py-4">{po.orderDate ? format(new Date(po.orderDate), "MM/dd/yyyy") : 'N/A'}</TableCell>
                    <TableCell className="text-lg py-4">{po.expectedDate ? format(new Date(po.expectedDate), "MM/dd/yyyy") : 'TBD'}</TableCell>
                    <TableCell className="text-lg py-4">{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-lg font-bold py-4">${po.totalAmount ? parseFloat(po.totalAmount).toFixed(2) : '0.00'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link href={`/purchase-orders/view/${po.id}`}>
                          <Button variant="ghost" size="sm" title="View Purchase Order">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/purchase-orders/edit/${po.id}`}>
                          <Button variant="ghost" size="sm" title="Edit Purchase Order">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Print Purchase Order"
                          onClick={() => {
                            // Handle print functionality - will implement with PDF generator
                            toast({
                              title: "Print",
                              description: `Printing PO #${po.poNumber}`,
                            });
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}