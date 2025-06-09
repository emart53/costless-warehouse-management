import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ProductCalculations from '@/components/ProductCalculations';

interface Product {
  id: number;
  productId: number;
  name: string;
  description: string;
  brand: string;
  unitSize: string;
  casePack: number;
  status: string;
  sku: string;
  isActive: boolean;
}

export default function ProductEdit() {
  const [match, params] = useRoute('/products/edit/:id');
  const productId = params?.id ? parseInt(params.id) : 0;

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  const { data: productPurchase } = useQuery({
    queryKey: [`/api/products/${productId}/purchase`],
    enabled: !!productId,
  });

  const { data: productTransfer } = useQuery({
    queryKey: [`/api/products/${productId}/transfer`],
    enabled: !!productId,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    unitSize: '',
    casePack: 1,
    status: 'active',
    isActive: true,
  });

  React.useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        unitSize: product.unitSize || '',
        casePack: product.casePack || 1,
        status: product.status || 'active',
        isActive: product.isActive ?? true,
      });
    }
  }, [product]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' },
      inactive: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      discontinued: { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
          <p className="text-gray-600 mt-2">The requested product could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        <a href="/products" className="hover:text-gray-900">Products</a>
        <span>/</span>
        <span className="text-gray-900">Edit Product #{product.productId}</span>
      </nav>

      {/* Main Card */}
      <Card className="w-full">
        {/* Card Header */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Edit Product
            </CardTitle>
            <div className="flex items-center space-x-3">
              {getStatusBadge(formData.status)}
              <span className="text-sm text-gray-500">Active</span>
            </div>
          </div>
        </CardHeader>

        {/* Card Body */}
        <CardContent className="p-6 space-y-8">
          {/* Product Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-id">Product ID</Label>
                  <Input
                    id="product-id"
                    value={product.productId}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger 
                      className={`status-select ${
                        formData.status === 'active' ? 'bg-green-50 border-green-300 text-green-800' :
                        formData.status === 'inactive' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                        'bg-red-50 border-red-300 text-red-800'
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="unit-size">Unit Size</Label>
                  <Input
                    id="unit-size"
                    value={formData.unitSize}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitSize: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="case-pack">Case Pack</Label>
                  <Input
                    id="case-pack"
                    type="number"
                    value={formData.casePack}
                    onChange={(e) => setFormData(prev => ({ ...prev, casePack: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Purchase and Transfer Configuration */}
          <ProductCalculations
            productId={productId}
            purchaseData={productPurchase}
            transferData={productTransfer}
          />
        </CardContent>

        {/* Card Footer */}
        <div className="border-t px-6 py-4 flex justify-between">
          <Button variant="outline" className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Products</span>
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save Product</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}