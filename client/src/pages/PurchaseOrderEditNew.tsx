import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { PurchaseOrderDetailTable } from "@/components/PurchaseOrderDetailTable";

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

export default function PurchaseOrderEditNew() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<PurchaseOrderData>({
    poNumber: '',
    vendorId: 0,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    shipToLocationId: 0,
    billToLocationId: 0,
    lumpSumAllowance: 0,
    deliveryCharge: 0,
    notes: '',
    status: 'Draft',
    items: []
  });

  // Data queries
  const { data: purchaseOrder } = useQuery({
    queryKey: [`/api/purchase-orders/${id}`],
    enabled: !!id && id !== 'new',
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/vendors'],
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: configurations = [] } = useQuery({
    queryKey: ['/api/configurations'],
  });

  // Initialize form data
  useEffect(() => {
    if (purchaseOrder && id !== 'new') {
      setFormData({
        ...purchaseOrder,
        items: purchaseOrder.items || []
      });
    }
  }, [purchaseOrder, id]);

  // Item management functions
  const handleUpdateItem = (index: number, updatedItem: PurchaseOrderItem) => {
    const newItems = [...formData.items];
    newItems[index] = updatedItem;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleDeleteItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleAddItem = () => {
    const newItem: PurchaseOrderItem = {
      productId: 0,
      quantityOrdered: 1,
      listCost: 0,
      offInvoice: 0,
      billBack: 0,
      netCost: 0,
      purchaseWeight: 0,
      purchaseCrv: 0,
      purchaseCfg: undefined
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PurchaseOrderData) => {
      const method = id === 'new' ? 'POST' : 'PUT';
      const url = id === 'new' ? '/api/purchase-orders' : `/api/purchase-orders/${id}`;
      return await apiRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setLocation('/purchase-orders');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save purchase order",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/purchase-orders')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Purchase Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {id === 'new' ? 'Create Purchase Order' : `Edit Purchase Order ${formData.poNumber}`}
            </h1>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving...' : 'Save Purchase Order'}
        </Button>
      </div>

      {/* Purchase Order Header Form */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="poNumber">PO Number</Label>
              <Input
                id="poNumber"
                value={formData.poNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                placeholder="Enter PO number"
              />
            </div>
            
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Select 
                value={formData.vendorId.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name} ({vendor.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderDate">Order Date</Label>
              <Input
                id="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="expectedDate">Expected Date</Label>
              <Input
                id="expectedDate"
                type="date"
                value={formData.expectedDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipToLocation">Ship To Location</Label>
              <Select 
                value={formData.shipToLocationId.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, shipToLocationId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="billToLocation">Bill To Location</Label>
              <Select 
                value={formData.billToLocationId.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, billToLocationId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lumpSumAllowance">Lump Sum Allowance</Label>
              <Input
                id="lumpSumAllowance"
                type="number"
                step="0.01"
                value={formData.lumpSumAllowance}
                onChange={(e) => setFormData(prev => ({ ...prev, lumpSumAllowance: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="deliveryCharge">Delivery Charge</Label>
              <Input
                id="deliveryCharge"
                type="number"
                step="0.01"
                value={formData.deliveryCharge}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryCharge: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter any notes or special instructions"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Purchase Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrderDetailTable
            items={formData.items}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            allProducts={allProducts}
            configurations={configurations}
          />
        </CardContent>
      </Card>
    </div>
  );
}