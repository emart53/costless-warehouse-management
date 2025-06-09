import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Calculator, Package, DollarSign, Calendar, Building2, User, Save, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPurchaseOrderSchema, type PurchaseOrder, type Vendor, type Product } from "@shared/schema";
import { z } from "zod";

// Enhanced form schema for comprehensive purchase order management
const purchaseOrderFormSchema = insertPurchaseOrderSchema.extend({
  orderDate: z.date(),
  expectedDate: z.date().optional(),
  vendorId: z.number().min(1, "Please select a vendor"),
  status: z.enum(["PENDING", "SENT", "RECEIVED", "CANCELLED"]).default("PENDING"),
  orderType: z.string().default("STANDARD"),
  shipToLocationId: z.number().optional(),
  billToLocationId: z.number().optional(),
  deliveryCharge: z.string().default("0.00"),
  lumpSumAllowance: z.string().default("0.00"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    quantityOrdered: z.number().min(1),
    unitCost: z.string(),
    notes: z.string().optional(),
  })).min(1, "At least one item is required"),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder & { items?: any[] };
  onSubmit: (data: PurchaseOrderFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PurchaseOrderForm({ purchaseOrder, onSubmit, onCancel, isLoading }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Form setup with default values
  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      orderDate: purchaseOrder ? new Date(purchaseOrder.orderDate) : new Date(),
      expectedDate: purchaseOrder?.expectedDate ? new Date(purchaseOrder.expectedDate) : undefined,
      vendorId: purchaseOrder?.vendorId || 0,
      status: purchaseOrder?.status || "PENDING",
      orderType: purchaseOrder?.orderType || "STANDARD",
      deliveryCharge: purchaseOrder?.deliveryCharge || "0.00",
      lumpSumAllowance: purchaseOrder?.lumpSumAllowance || "0.00",
      notes: purchaseOrder?.notes || "",
      items: purchaseOrder?.items?.map(item => ({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        unitCost: item.unitCost,
        notes: item.notes || "",
      })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["/api/locations"],
  });

  // Fetch products for vendor
  const { data: vendorProducts } = useQuery({
    queryKey: ["/api/vendors", selectedVendor?.id, "products"],
    enabled: !!selectedVendor?.id,
  });

  // Product search with vendor filtering
  const { data: searchedProducts } = useQuery({
    queryKey: ["/api/products/search", { q: productSearch, vendorId: selectedVendor?.id }],
    enabled: productSearch.length >= 2 && !!selectedVendor?.id,
  });

  // Fetch vendor details when vendor changes
  const { data: vendorDetails } = useQuery({
    queryKey: ["/api/vendors", selectedVendor?.id],
    enabled: !!selectedVendor?.id,
  });

  // Update selected vendor when vendor ID changes or when initial data loads
  useEffect(() => {
    const vendorId = form.watch("vendorId");
    if (vendors && vendorId && vendorId !== 0) {
      const vendor = (vendors as Vendor[]).find(v => v.id === vendorId);
      setSelectedVendor(vendor || null);
      
      // Auto-calculate expected delivery date based on vendor lead time (only for new orders)
      if (vendor?.leadTime && !purchaseOrder) {
        const orderDate = form.getValues("orderDate");
        const expectedDate = new Date(orderDate);
        expectedDate.setDate(expectedDate.getDate() + vendor.leadTime);
        form.setValue("expectedDate", expectedDate);
      }
    }
  }, [form.watch("vendorId"), vendors, form, purchaseOrder]);

  // Set initial vendor when editing existing purchase order
  useEffect(() => {
    if (purchaseOrder && vendors && !selectedVendor) {
      const vendor = (vendors as Vendor[]).find(v => v.id === purchaseOrder.vendorId);
      if (vendor) {
        setSelectedVendor(vendor);
      }
    }
  }, [purchaseOrder, vendors, selectedVendor]);

  // Calculate line totals and overall totals
  const watchedItems = form.watch("items");
  const deliveryCharge = parseFloat(form.watch("deliveryCharge") || "0");
  const lumpSumAllowance = parseFloat(form.watch("lumpSumAllowance") || "0");

  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + (item.quantityOrdered * parseFloat(item.unitCost || "0"));
  }, 0);

  const totalAmount = subtotal + deliveryCharge - lumpSumAllowance;

  // Add product to items
  const addProduct = (product: any) => {
    const existingIndex = watchedItems.findIndex(item => item.productId === product.id);
    
    if (existingIndex >= 0) {
      // Update existing item quantity
      const currentQty = watchedItems[existingIndex].quantityOrdered;
      form.setValue(`items.${existingIndex}.quantityOrdered`, currentQty + 1);
    } else {
      // Add new item
      append({
        productId: product.id,
        quantityOrdered: 1,
        unitCost: product.lastCost || product.purchaseCost || "0.00",
        notes: "",
      });
    }
    setProductSearch("");
  };

  // Quick add by product ID (10-key entry)
  const [quickProductId, setQuickProductId] = useState("");
  const [quickQuantity, setQuickQuantity] = useState("");

  const handleQuickAdd = () => {
    const productId = parseInt(quickProductId);
    const quantity = parseInt(quickQuantity) || 1;
    
    if (!productId) {
      toast({
        title: "Error",
        description: "Please enter a valid product ID",
        variant: "destructive",
      });
      return;
    }

    // Find product in vendor products or search all products
    const product = vendorProducts?.find((p: any) => p.productId === productId);
    
    if (product) {
      const existingIndex = watchedItems.findIndex(item => item.productId === productId);
      
      if (existingIndex >= 0) {
        const currentQty = watchedItems[existingIndex].quantityOrdered;
        form.setValue(`items.${existingIndex}.quantityOrdered`, currentQty + quantity);
      } else {
        append({
          productId: productId,
          quantityOrdered: quantity,
          unitCost: product.lastCost || product.purchaseCost || "0.00",
          notes: "",
        });
      }
      
      setQuickProductId("");
      setQuickQuantity("");
    } else {
      toast({
        title: "Error",
        description: "Product not found or not available from this vendor",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {purchaseOrder ? `Edit Purchase Order #${purchaseOrder.poNumber}` : "Create New Purchase Order"}
            </CardTitle>
            <CardDescription>
              {purchaseOrder ? "Modify purchase order details and items" : "Enter vendor, delivery information, and select products"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Vendor Selection with Address Display */}
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Vendor
                      </FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(vendors as Vendor[])?.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                              {vendor.code} - {vendor.name}
                              {!vendor.isActive && <span className="text-orange-600 ml-2">(Inactive)</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Vendor Address Display */}
                {selectedVendor && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 border rounded-md text-sm">
                    <div className="font-medium">{selectedVendor.name}</div>
                    {selectedVendor.address && <div>{selectedVendor.address}</div>}
                    <div>
                      {selectedVendor.city && `${selectedVendor.city}, `}
                      {selectedVendor.state && `${selectedVendor.state} `}
                      {selectedVendor.zipCode}
                    </div>
                    {selectedVendor.phone && (
                      <div>
                        <abbr title="Phone">P:</abbr> {selectedVendor.phone}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Order Date
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bill To Address */}
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="billToLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill To</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(locations as any[])?.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Ship To Address */}
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="shipToLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ship To</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(locations as any[])?.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Status and Financial Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="RECEIVED">Received</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Delivery Charge
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
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
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end">
                <div className="w-full">
                  <FormLabel>Total Amount</FormLabel>
                  <div className="px-3 py-2 bg-muted rounded-md text-lg font-semibold">
                    ${totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Special instructions or notes..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Product Selection
            </CardTitle>
            <CardDescription>
              Add products using 10-key entry (Product ID + Quantity) or search by name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Add - 10-key Entry */}
            <div className="flex gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex-1">
                <label className="text-sm font-medium text-blue-700 dark:text-blue-300">Product ID</label>
                <Input
                  value={quickProductId}
                  onChange={(e) => setQuickProductId(e.target.value)}
                  placeholder="Enter product ID"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-blue-700 dark:text-blue-300">Quantity</label>
                <Input
                  value={quickQuantity}
                  onChange={(e) => setQuickQuantity(e.target.value)}
                  placeholder="1"
                  type="number"
                  min="1"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleQuickAdd} type="button" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Vendor Products Display */}
            {selectedVendor && vendorProducts && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Available Vendor Products</label>
                <div className="max-h-60 overflow-y-auto border rounded-md bg-gray-50 dark:bg-gray-800">
                  <div className="grid grid-cols-1 gap-1 p-2">
                    {(vendorProducts as any[]).slice(0, 20).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 border rounded hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer"
                        onClick={() => addProduct(product)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {product.productId} - {product.name || product.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.brand && `${product.brand} • `}
                            {product.unitSize} • Case Pack: {product.casePack}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">${product.lastCost || product.purchaseCost || "0.00"}</div>
                          <div className="text-xs text-muted-foreground">per case</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {(vendorProducts as any[]).length > 20 && (
                  <p className="text-sm text-muted-foreground">
                    Showing first 20 of {(vendorProducts as any[]).length} products. Use search below to find specific items.
                  </p>
                )}
              </div>
            )}

            {/* Product Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Products {selectedVendor ? `from ${selectedVendor.name}` : "(Select vendor first)"}</label>
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by product name, description, or UPC..."
                disabled={!selectedVendor}
              />
              {searchedProducts && productSearch.length >= 2 && (
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {(searchedProducts as any[]).slice(0, 10).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
                      onClick={() => addProduct(product)}
                    >
                      <div>
                        <div className="font-medium">{product.productId} - {product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.description}</div>
                      </div>
                      <Badge variant="outline">${product.lastCost || "0.00"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
            <CardDescription>
              Review and modify quantities and costs for selected products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items added yet. Use the product selection above to add items.
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Line Total</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const item = watchedItems[index];
                      const lineTotal = item.quantityOrdered * parseFloat(item.unitCost || "0");
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{item.productId}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Product {item.productId}</div>
                              <div className="text-muted-foreground">Available from vendor</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantityOrdered`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="1"
                                      className="w-20"
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitCost`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="w-24"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            ${lineTotal.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Item notes..."
                                      className="w-32"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Order Summary */}
                <div className="flex justify-end">
                  <div className="space-y-2 text-right min-w-48">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Charge:</span>
                      <span>${deliveryCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lump Sum Allowance:</span>
                      <span>-${lumpSumAllowance.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : purchaseOrder ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}