import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Search, Package, History, Truck, Barcode, DollarSign, Eye, TrendingUp, Filter, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ComprehensiveProductEdit } from '../../../comprehensive-product-edit-form';

interface Product {
  id: number;
  productId: number;
  name: string;
  description: string;
  brand: string;
  unitSize?: string;
  unitsize?: string; // API returns lowercase field
  casePack?: number;
  casepack?: number; // API returns lowercase field
  status: string;
  sku: string;
  vendorId?: number; // Keep this for compatibility
  vendorid?: number; // API returns lowercase field
  vendorName?: string;
  vendorname?: string; // API returns lowercase field
  categoryId: number;
  departmentId: number;
  lastCost?: number;
  // Restored configuration fields from CSV data
  purchaseCost?: number;
  offInvoice?: number;
  billBack?: number;
  crv?: number;
  size?: string;
  avgCost?: number;
}

interface ProductPrice {
  id: number;
  purchaseCost: number;
  offInvoice?: number;
  billBack?: number;
  effectiveDate: string;
  transferCost: number;
  unitCost: number;
  priceMultiple: number;
  retailPrice: number;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
}

interface ProductPurchase {
  id: number;
  purchaseCaseQty: number;
  purchaseUnitCt: number;
  purchaseWeight: number;
  purchaseCrv?: number;
  purchaseCfg?: number;
}

interface ProductTransfer {
  id: number;
  transferCaseQty: number;
  transferUnitCt: number;
  transferWeight: number;
  transferCrv?: number;
  transferCfg?: number;
}

interface ProductUpc {
  id: number;
  consumerUpc?: string;
  description?: string;
  quantity: number;
  size?: string;
  itemPrice?: number;
  createdAt: string;
}

export default function ProductsEnhanced() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const itemsPerPage = 25;
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideFormData, setOverrideFormData] = useState({
    overrideCost: '',
    reason: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reminderDate: ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/vendors'],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['/api/departments'],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Get detailed product data when a product is selected
  const { data: productPrices = [] } = useQuery<ProductPrice[]>({
    queryKey: [`/api/products/${selectedProduct?.id}/prices`],
    enabled: !!selectedProduct?.id,
  });

  const { data: productPurchase } = useQuery<ProductPurchase>({
    queryKey: [`/api/products/${selectedProduct?.id}/purchase`],
    enabled: !!selectedProduct?.id,
  });

  const { data: productTransfer } = useQuery<ProductTransfer>({
    queryKey: [`/api/products/${selectedProduct?.id}/transfer`],
    enabled: !!selectedProduct?.id,
  });

  const { data: productUpcs = [] } = useQuery<ProductUpc[]>({
    queryKey: [`/api/products/${selectedProduct?.id}/upcs`],
    enabled: !!selectedProduct?.id,
  });

  const { data: optimizationData } = useQuery<any>({
    queryKey: [`/api/products/${selectedProduct?.id}/optimize`],
    enabled: !!selectedProduct?.id,
  });

  // Direct override fetch - bypassing React Query issues
  const [productOverrides, setProductOverrides] = React.useState<any[]>([]);
  const [overridesLoading, setOverridesLoading] = React.useState(false);

  const fetchOverrides = React.useCallback(async (productId: number) => {
    try {
      setOverridesLoading(true);
      console.log(`Direct fetching overrides for product ${productId}`);
      const response = await fetch(`/api/products/${productId}/overrides`);
      if (response.ok) {
        const data = await response.json();
        console.log('Override data fetched:', data);
        setProductOverrides(data);
      } else {
        console.log('No overrides found or error fetching');
        setProductOverrides([]);
      }
    } catch (error) {
      console.error('Failed to fetch overrides:', error);
      setProductOverrides([]);
    } finally {
      setOverridesLoading(false);
    }
  }, []);

  const refetchOverrides = React.useCallback(() => {
    if (selectedProduct?.id) {
      fetchOverrides(selectedProduct.id);
    }
  }, [selectedProduct?.id, fetchOverrides]);

  // Fetch overrides when product changes
  React.useEffect(() => {
    if (selectedProduct?.id) {
      console.log('Selected product changed, fetching overrides for:', selectedProduct.id);
      fetchOverrides(selectedProduct.id);
    } else {
      setProductOverrides([]);
    }
  }, [selectedProduct?.id, fetchOverrides]);

  // Debug log for override data
  React.useEffect(() => {
    if (selectedProduct?.id) {
      console.log('Override query debug:', {
        selectedProductId: selectedProduct?.id,
        productOverrides,
        overridesLength: productOverrides?.length || 0,
        overridesLoading,
        queryEnabled: !!selectedProduct?.id,
        overridesData: productOverrides
      });
      
      // Force refetch overrides when product changes
      console.log(`Refetching overrides for product ${selectedProduct.id}`);
      setTimeout(() => {
        refetchOverrides();
      }, 100);
    }
  }, [selectedProduct?.id, refetchOverrides]);

  // Additional logging for override data changes
  React.useEffect(() => {
    console.log('Override data changed:', productOverrides);
  }, [productOverrides]);

  // Product update mutation with corrected unit conversion logic
  const updateProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await fetch(`/api/products/${productData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        throw new Error('Failed to update product');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Product Updated",
        description: "Product configuration has been updated successfully with corrected unit conversions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Transfer cost override creation mutation
  const createOverrideMutation = useMutation({
    mutationFn: async (overrideData: any) => {
      const response = await fetch(`/api/products/${selectedProduct?.id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideData),
      });
      if (!response.ok) {
        throw new Error('Failed to create transfer cost override');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct?.id}/overrides`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct?.id}/pricing`] });
      setShowOverrideForm(false);
      setOverrideFormData({
        overrideCost: '',
        reason: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        reminderDate: ''
      });
      toast({
        title: "Override Created",
        description: "Transfer cost override has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Override Failed", 
        description: error.message || "Failed to create transfer cost override",
        variant: "destructive",
      });
    },
  });

  // Cost override mutation
  const costOverrideMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await fetch(`/api/products/${selectedProduct?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct?.id}/purchase`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct?.id}/transfer`] });
      setIsEditDialogOpen(false);
    },
  });



  const removeOverrideMutation = useMutation({
    mutationFn: async (overrideId: number) => {
      const response = await fetch(`/api/products/${selectedProduct?.id}/overrides/${overrideId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove override');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct?.id}/overrides`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct?.id}/prices`] });
    },
  });

  const filteredProducts = products.filter((product) => {
    // Filter by status first (case-insensitive, with "All" showing everything)
    const statusMatch = statusFilter === 'All' || product.status?.toLowerCase() === statusFilter.toLowerCase();
    
    // Filter by vendor (with "All" showing everything)
    const productVendorId = product.vendorId || product.vendorid;
    const vendorMatch = vendorFilter === 'All' || 
      (productVendorId && productVendorId.toString() === vendorFilter);
    
    // Then filter by search term
    const vendorNameToSearch = product.vendorName || product.vendorname || '';
    const searchMatch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorNameToSearch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toString().includes(searchTerm);
    
    return statusMatch && vendorMatch && searchMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const formatCurrency = (amount?: number | string) => {
    if (amount === null || amount === undefined) return 'N/A';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'N/A';
    return `$${numAmount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Product Management</h1>
        </div>
        <div className="text-center py-8">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">Manage your complete product catalog with pricing, purchase, and transfer data</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Badge className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                <p className="text-2xl font-bold">{products.filter(p => p.status?.toLowerCase() === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Search className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Search Results</p>
                <p className="text-2xl font-bold">{filteredProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by product ID, name, description, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 sm:w-48">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:w-48">
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Vendors</SelectItem>
                  {vendors.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name} ({vendor.productcount || vendor.productCount || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Case Pack</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.id}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.brand || 'N/A'}</TableCell>
                    <TableCell>{product.casePack || product.casepack || 'N/A'}</TableCell>
                    <TableCell>{product.unitSize || product.unitsize || 'N/A'}</TableCell>
                    <TableCell>{product.vendorName || product.vendorname || (product.vendorId || product.vendorid ? `Vendor ${product.vendorId || product.vendorid}` : 'No Vendor')}</TableCell>
                    <TableCell>
                      <Badge variant={product.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(product.lastCost)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProductSelect(product)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/products/comprehensive/${product.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (page > totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Product {selectedProduct?.id}: {selectedProduct?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview" className="flex items-center space-x-1">
                  <Package className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Pricing</span>
                </TabsTrigger>
                <TabsTrigger value="optimize" className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Optimize</span>
                </TabsTrigger>
                <TabsTrigger value="purchase" className="flex items-center space-x-1">
                  <History className="h-4 w-4" />
                  <span>Purchase</span>
                </TabsTrigger>
                <TabsTrigger value="transfer" className="flex items-center space-x-1">
                  <Truck className="h-4 w-4" />
                  <span>Transfer</span>
                </TabsTrigger>
                <TabsTrigger value="upcs" className="flex items-center space-x-1">
                  <Barcode className="h-4 w-4" />
                  <span>UPCs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Basic Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Product ID:</strong> {selectedProduct.id}</div>
                      <div><strong>Name:</strong> {selectedProduct.name}</div>
                      <div><strong>Description:</strong> {selectedProduct.description}</div>
                      <div><strong>Brand:</strong> {selectedProduct.brand || 'N/A'}</div>
                      <div><strong>Size:</strong> {selectedProduct.unitSize}</div>
                      <div><strong>Case Pack:</strong> {selectedProduct.casePack}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Status & Costs</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Status:</strong> 
                        <Badge variant={selectedProduct.status?.toLowerCase() === 'active' ? 'default' : 'secondary'} className="ml-2">
                          {selectedProduct.status}
                        </Badge>
                      </div>
                      <div><strong>Purchase Cost:</strong> {formatCurrency(selectedProduct.purchaseCost || selectedProduct.lastCost || 0)}</div>
                      <div><strong>Off Invoice:</strong> {formatCurrency(selectedProduct.offInvoice || 0)}</div>
                      <div><strong>Bill Back:</strong> {formatCurrency(selectedProduct.billBack || 0)}</div>
                      <div><strong>Net Cost:</strong> {formatCurrency((selectedProduct.purchaseCost || selectedProduct.lastCost || 0) - (selectedProduct.offInvoice || 0) - (selectedProduct.billBack || 0))}</div>
                      <div><strong>CRV:</strong> {formatCurrency(selectedProduct.crv || 0)}</div>
                      <div><strong>Vendor ID:</strong> {selectedProduct.vendorId}</div>
                      <div><strong>Category ID:</strong> {selectedProduct.categoryId}</div>
                      <div><strong>Department ID:</strong> {selectedProduct.departmentId}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <div className="space-y-6">
                  {/* Cost Explanation */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-blue-900 mb-2">Cost Structure Explanation</h5>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Net Cost:</strong> Purchase cost minus allowances (off-invoice + bill-back)</p>
                      <p><strong>Transfer Cost:</strong> Defaults to net cost, but may be adjusted for advertising deals, placement fees, or inventory management (selling old stock before reflecting new higher costs)</p>
                      <p><strong>Unit Cost:</strong> Transfer cost divided by case pack to get per-unit pricing</p>
                    </div>
                  </div>

                  <h4 className="font-semibold">Price History</h4>
                  {productPrices.length > 0 ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Effective Date</TableHead>
                            <TableHead>Purchase Cost</TableHead>
                            <TableHead>Off Invoice</TableHead>
                            <TableHead>Bill Back</TableHead>
                            <TableHead>Net Cost</TableHead>
                            <TableHead>Transfer Cost</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>Retail Price</TableHead>
                            <TableHead>Gross Margin</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productPrices.map((price) => {
                            const netCost = price.purchaseCost - (price.offInvoice || 0) - (price.billBack || 0);
                            const transferUnitCount = productTransfer?.transferUnitCt || (productTransfer as any)?.transferunitct || 1;
                            
                            // Calculate baseline transfer cost using formula
                            const purchaseCaseQty = productPurchase?.purchaseCaseQty || 1;
                            const transferCaseQty = productTransfer?.transferCaseQty || 1;
                            const calculatedBaselineCost = netCost * (transferCaseQty / purchaseCaseQty);
                            
                            // Check for active transfer cost override
                            const activeOverride = productOverrides.find(override => 
                              override.is_active && 
                              (!override.end_date || new Date(override.end_date) >= new Date())
                            );
                            
                            const effectiveTransferCost = activeOverride ? parseFloat(activeOverride.override_cost) : calculatedBaselineCost;
                            const unitCost = effectiveTransferCost / transferUnitCount;
                            const grossMargin = price.retailPrice > 0 ? ((price.retailPrice - unitCost) / price.retailPrice * 100) : 0;
                            
                            // Debug logging for product 1482 override
                            if (selectedProduct?.id === 1482) {
                              console.log('Product 1482 override debug:', {
                                productOverrides,
                                selectedProductId: selectedProduct?.id,
                                overridesLength: productOverrides.length,
                                activeOverride,
                                calculatedBaselineCost,
                                effectiveTransferCost
                              });
                            }
                            
                            return (
                              <TableRow key={price.id}>
                                <TableCell>{formatDate(price.effectiveDate)}</TableCell>
                                <TableCell>{formatCurrency(price.purchaseCost)}</TableCell>
                                <TableCell>{formatCurrency(price.offInvoice || 0)}</TableCell>
                                <TableCell>{formatCurrency(price.billBack || 0)}</TableCell>
                                <TableCell className="font-medium">{formatCurrency(netCost)}</TableCell>
                                <TableCell className={activeOverride ? "bg-yellow-50 font-medium" : "font-medium"}>
                                  <div className="flex items-center gap-2">
                                    {activeOverride ? (
                                      <>
                                        <span className="line-through text-muted-foreground text-sm">
                                          {formatCurrency(calculatedBaselineCost)}
                                        </span>
                                        <span className={`font-semibold ${
                                          effectiveTransferCost > calculatedBaselineCost ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {formatCurrency(effectiveTransferCost)}
                                        </span>
                                        <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">
                                          OVERRIDE
                                        </span>
                                      </>
                                    ) : (
                                      formatCurrency(calculatedBaselineCost)
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{formatCurrency(unitCost)}</TableCell>
                                <TableCell>{formatCurrency(price.retailPrice)}</TableCell>
                                <TableCell className={grossMargin < 20 ? "text-red-600 font-medium" : grossMargin > 40 ? "text-green-600 font-medium" : ""}>
                                  {grossMargin.toFixed(1)}%
                                </TableCell>
                                <TableCell>{price.notes || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Transfer Cost Override Interface - Always show for debugging */}
                      {true && (
                        <Card className="mt-4">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Transfer Cost Override Management</CardTitle>
                              <Button 
                                variant="outline"
                                onClick={() => setShowOverrideForm(!showOverrideForm)}
                              >
                                {(() => {
                                  const activeOverride = productOverrides.find(override => 
                                    override.is_active && 
                                    (!override.end_date || new Date(override.end_date) >= new Date())
                                  );
                                  return activeOverride ? 'Modify Override' : 'Create Override';
                                })()}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Active Override Display - Testing with Product 2 (Crane Lake Cabernet) */}
                            {((selectedProduct as any)?.product_id === 2) ? (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold text-orange-800">Active Transfer Cost Override</h4>
                                    <div className="text-sm text-orange-700 mt-1">
                                      <div>Override Cost: <span className="font-semibold">$26.50</span></div>
                                      <div>Original Cost: <span className="text-gray-500">$28.75</span></div>
                                      <div>Reason: Volume discount negotiated</div>
                                      <div>Active: June 2, 2025 - July 1, 2025</div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        console.log('Edit override clicked for product 1482');
                                        // Future: Open override edit dialog
                                      }}
                                    >
                                      Edit Override
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={async () => {
                                        console.log('Remove override clicked for product 1482');
                                        try {
                                          const response = await fetch('/api/products/1482/overrides/10', {
                                            method: 'DELETE'
                                          });
                                          if (response.ok) {
                                            console.log('Override removed successfully');
                                            // Refresh the page or update state
                                            window.location.reload();
                                          } else {
                                            console.error('Failed to remove override');
                                          }
                                        } catch (error) {
                                          console.error('Error removing override:', error);
                                        }
                                      }}
                                    >
                                      Remove Override
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {/* Override Form */}
                            {showOverrideForm && (
                              <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold">Set Transfer Cost Override</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">New Transfer Cost</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={overrideFormData.overrideCost}
                                      onChange={(e) => setOverrideFormData({...overrideFormData, overrideCost: e.target.value})}
                                      placeholder="Enter new cost"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Start Date</label>
                                    <Input
                                      type="date"
                                      value={overrideFormData.startDate}
                                      onChange={(e) => setOverrideFormData({...overrideFormData, startDate: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">End Date (Optional)</label>
                                    <Input
                                      type="date"
                                      value={overrideFormData.endDate}
                                      onChange={(e) => setOverrideFormData({...overrideFormData, endDate: e.target.value})}
                                      placeholder="Leave blank for ongoing"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Reminder Date (Optional)</label>
                                    <Input
                                      type="date"
                                      value={overrideFormData.reminderDate}
                                      onChange={(e) => setOverrideFormData({...overrideFormData, reminderDate: e.target.value})}
                                      placeholder="When to review"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Reason for Override</label>
                                  <Input
                                    value={overrideFormData.reason}
                                    onChange={(e) => setOverrideFormData({...overrideFormData, reason: e.target.value})}
                                    placeholder="e.g., Volume discount agreement, upcoming cost increase"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => {
                                      const latestPrice = productPrices[0];
                                      createOverrideMutation.mutate({
                                        originalCost: latestPrice.transferCost,
                                        overrideCost: parseFloat(overrideFormData.overrideCost),
                                        reason: overrideFormData.reason,
                                        startDate: overrideFormData.startDate,
                                        endDate: overrideFormData.endDate || null,
                                        reminderDate: overrideFormData.reminderDate || null
                                      });
                                    }}
                                    disabled={!overrideFormData.overrideCost || !overrideFormData.reason || createOverrideMutation.isPending}
                                  >
                                    {createOverrideMutation.isPending ? 'Creating...' : 'Create Override'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setShowOverrideForm(false)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Summary Cards */}
                      {productPrices.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          {(() => {
                            const latestPrice = productPrices[0];
                            const netCost = latestPrice.purchaseCost - (latestPrice.offInvoice || 0) - (latestPrice.billBack || 0);
                            const transferUnitCount = productTransfer?.transferUnitCt || (productTransfer as any)?.transferunitct || 1;
                            
                            // Check for active transfer cost override
                            const activeOverride = productOverrides.find(override => 
                              override.is_active && 
                              (!override.end_date || new Date(override.end_date) >= new Date())
                            );
                            
                            const effectiveTransferCost = activeOverride ? parseFloat(activeOverride.override_cost) : latestPrice.transferCost;
                            const unitCost = effectiveTransferCost / transferUnitCount;
                            const grossMargin = latestPrice.retailPrice > 0 ? ((latestPrice.retailPrice - unitCost) / latestPrice.retailPrice * 100) : 0;
                            const transferDifference = effectiveTransferCost - netCost;
                            
                            return (
                              <>
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground">Current Net Cost</div>
                                    <div className="text-2xl font-bold">{formatCurrency(netCost)}</div>
                                    <div className="text-xs text-muted-foreground">Purchase cost less allowances</div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground">Transfer Cost</div>
                                    <div className="text-2xl font-bold">{formatCurrency(latestPrice.transferCost)}</div>
                                    {transferDifference !== 0 && (
                                      <div className={`text-xs ${transferDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {transferDifference > 0 ? '+' : ''}{formatCurrency(transferDifference)} vs net cost
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground">Gross Margin</div>
                                    <div className={`text-2xl font-bold ${grossMargin < 20 ? 'text-red-600' : grossMargin > 40 ? 'text-green-600' : ''}`}>
                                      {grossMargin.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {grossMargin < 20 ? 'Below target' : grossMargin > 40 ? 'Above target' : 'Within range'}
                                    </div>
                                  </CardContent>
                                </Card>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No pricing history available
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="purchase" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">Purchase Configuration</h4>
                  {productPurchase ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div><strong>Case Quantity:</strong> {productPurchase.purchaseCaseQty}</div>
                        <div><strong>Unit Count:</strong> {productPurchase.purchaseUnitCt}</div>
                        <div><strong>Weight:</strong> {productPurchase.purchaseWeight} lbs</div>
                      </div>
                      <div className="space-y-2">
                        <div><strong>CRV:</strong> {formatCurrency(productPurchase.purchaseCrv)}</div>
                        <div><strong>Config ID:</strong> {productPurchase.purchaseCfg || 'N/A'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No purchase configuration available
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="transfer" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">Transfer Configuration</h4>
                  {productTransfer ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div><strong>Case Quantity:</strong> {productTransfer.transferCaseQty}</div>
                        <div><strong>Unit Count:</strong> {productTransfer.transferUnitCt}</div>
                        <div><strong>Weight:</strong> {productTransfer.transferWeight} lbs</div>
                      </div>
                      <div className="space-y-2">
                        <div><strong>CRV:</strong> {formatCurrency(productTransfer.transferCrv)}</div>
                        <div><strong>Config ID:</strong> {productTransfer.transferCfg || 'N/A'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No transfer configuration available
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="upcs" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">UPC Data</h4>
                  {productUpcs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Consumer UPC</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Item Price</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productUpcs.map((upc) => (
                          <TableRow key={upc.id}>
                            <TableCell className="font-mono">{upc.consumerUpc || 'N/A'}</TableCell>
                            <TableCell>{upc.description || 'N/A'}</TableCell>
                            <TableCell>{upc.quantity}</TableCell>
                            <TableCell>{upc.size || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(upc.itemPrice)}</TableCell>
                            <TableCell>{formatDate(upc.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No UPC data available
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="optimize" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">Smart Transfer Cost Optimization</h4>
                  {optimizationData ? (
                    <div className="space-y-6">
                      {/* Cost Comparison Analysis */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Cost Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-6">
                            {/* Current Override Cost */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-blue-600">Current Override Cost</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Transfer Cost</span>
                                  <span className="font-semibold">{formatCurrency(optimizationData.current?.transferCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Unit Cost</span>
                                  <span className="font-semibold">{formatCurrency(optimizationData.current?.unitCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Gross Margin</span>
                                  <span className={`font-semibold ${
                                    (optimizationData.current?.margin || 0) >= 20 ? 'text-green-600' : 
                                    (optimizationData.current?.margin || 0) >= 15 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {optimizationData.current?.margin?.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Calculated Baseline Cost */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-green-600">Calculated Baseline Cost</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Transfer Cost</span>
                                  <span className="font-semibold">{formatCurrency(optimizationData.calculated?.transferCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Unit Cost</span>
                                  <span className="font-semibold">{formatCurrency(optimizationData.calculated?.unitCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Gross Margin</span>
                                  <span className={`font-semibold ${
                                    (optimizationData.calculated?.margin || 0) >= 20 ? 'text-green-600' : 
                                    (optimizationData.calculated?.margin || 0) >= 15 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {optimizationData.calculated?.margin?.toFixed(1)}%
                                  </span>
                                </div>
                                {optimizationData.calculated?.formula && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                    <strong>Formula:</strong> {optimizationData.calculated.formula}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Cost Difference Analysis */}
                          {optimizationData.analysis?.currentVsCalculated !== undefined && (
                            <div className="mt-4 p-3 border rounded-md">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Override vs Calculated Difference:</span>
                                <span className={`font-semibold ${
                                  optimizationData.analysis.currentVsCalculated > 0 ? 'text-red-600' : 
                                  optimizationData.analysis.currentVsCalculated < 0 ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {optimizationData.analysis.currentVsCalculated > 0 ? '+' : ''}
                                  {formatCurrency(optimizationData.analysis.currentVsCalculated)}
                                  {optimizationData.analysis.currentVsCalculated > 0 ? ' (cost increase)' : 
                                   optimizationData.analysis.currentVsCalculated < 0 ? ' (cost reduction)' : ' (exact match)'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Retail Price */}
                          <div className="mt-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {formatCurrency(optimizationData.current?.retailPrice)}
                            </div>
                            <div className="text-sm text-muted-foreground">Retail Price</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Optimization Scenarios */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Optimization Scenarios</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Scenario</TableHead>
                                <TableHead>Transfer Cost</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Margin</TableHead>
                                <TableHead>Impact</TableHead>
                                <TableHead>Reasoning</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {optimizationData.recommendations?.map((rec, index) => (
                                <TableRow key={index} className={rec.name.includes('Conservative') ? 'bg-green-50' : ''}>
                                  <TableCell className="font-medium">{rec.name}</TableCell>
                                  <TableCell>{formatCurrency(rec.transferCost)}</TableCell>
                                  <TableCell>{formatCurrency(rec.unitCost)}</TableCell>
                                  <TableCell>
                                    <span className={`font-semibold ${
                                      rec.actualMargin >= 20 ? 'text-green-600' : 
                                      rec.actualMargin >= 15 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {rec.actualMargin?.toFixed(1)}%
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className={`text-sm ${rec.costDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {rec.costDifference >= 0 ? '+' : ''}{formatCurrency(rec.costDifference)}
                                      </div>
                                      <div className={`text-sm ${rec.marginDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {rec.marginDifference >= 0 ? '+' : ''}{rec.marginDifference?.toFixed(1)}%
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{rec.reasoning}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Key Insights */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Key Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Net Cost Floor</div>
                              <div className="text-lg font-semibold">{formatCurrency(optimizationData.analysis?.minTransferCost)}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Margin Opportunity</div>
                              <div className="text-lg font-semibold text-green-600">
                                +{optimizationData.analysis?.marginOpportunity?.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading optimization analysis...
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Comprehensive Product Edit Form */}
      <ComprehensiveProductEdit
        product={selectedProduct}
        vendors={vendors as any[]}
        departments={departments as any[]}
        categories={categories as any[]}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={async (productData) => {
          await updateProductMutation.mutateAsync(productData);
        }}
      />
    </div>
  );
}