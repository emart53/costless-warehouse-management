import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Search, Edit, Package, History, Truck, BarCode3, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { queryClient } from '@/lib/queryClient';

interface Product {
  id: number;
  name: string;
  description: string;
  brand: string;
  unitSize: string;
  casePack: number;
  status: string;
  sku: string;
  vendorId: number;
  categoryId: number;
  departmentId: number;
  lastCost?: number;
  avgCost?: number;
  // Purchase configuration
  purchaseCaseQty?: number;
  purchaseUnitCt?: number;
  purchaseWeight?: number;
  // Transfer configuration
  transferCaseQty?: number;
  transferUnitCt?: number;
  transferWeight?: number;
  // Current pricing
  currentPurchaseCost?: number;
  currentTransferCost?: number;
  currentRetailPrice?: number;
  // UPC data
  consumerUpc?: string;
  itemPrice?: number;
}

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  const updateProductMutation = useMutation({
    mutationFn: async (productData: { id: number; lastCost?: number; avgCost?: number }) => {
      const response = await fetch(`/api/products/${productData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setEditingProduct(null);
    },
  });

  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.toString().includes(searchTerm)
  );

  const handleUpdateCost = (product: Product, lastCost: number) => {
    updateProductMutation.mutate({
      id: product.id,
      lastCost,
      avgCost: lastCost // For now, set avg_cost same as last_cost
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'discontinued': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage product catalog and pricing information
          </p>
        </div>
        <Button size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by product ID, name, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{products.length}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {products.filter((p: Product) => p.status?.toLowerCase() === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                Loading products...
              </div>
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Products Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No products match your search criteria.' : 'No products available.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-left p-3 font-medium">Brand</th>
                      <th className="text-left p-3 font-medium">Size</th>
                      <th className="text-left p-3 font-medium">Case Pack</th>
                      <th className="text-left p-3 font-medium">Last Cost</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product: Product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-mono text-sm">{product.id}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground">{product.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">{product.brand || '-'}</td>
                        <td className="p-3 text-sm">{product.unitSize || '-'}</td>
                        <td className="p-3 text-sm">{product.casePack || '-'}</td>
                        <td className="p-3">
                          {editingProduct?.id === product.id ? (
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-24 h-8"
                                defaultValue={product.lastCost || ''}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const value = parseFloat((e.target as HTMLInputElement).value);
                                    if (!isNaN(value)) {
                                      handleUpdateCost(product, value);
                                    }
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingProduct(null);
                                  }
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {product.lastCost ? `$${product.lastCost.toFixed(2)}` : 'No cost'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingProduct(product)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge className={getStatusColor(product.status)}>
                            {product.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Entry Tip */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">
                Product Cost Management
              </h3>
              <p className="text-sm text-blue-700">
                Click the edit icon next to any product cost to update pricing. 
                This cost will be used in purchase orders and inventory calculations.
                Enter the cost and press Enter to save, or Escape to cancel.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}