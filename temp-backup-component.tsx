/**
 * Backup of working component structure for restoration
 */

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Package, ShoppingCart, Truck, Calculator, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface ComprehensiveProductEditProps {
  product: any;
  vendors: any[];
  departments: any[];
  categories: any[];
  isOpen?: boolean;
  onClose?: () => void;
  onSave: (productData: any) => Promise<void>;
}

export function ComprehensiveProductEdit({
  product,
  vendors,
  departments,
  categories,
  isOpen,
  onClose,
  onSave
}: ComprehensiveProductEditProps) {
  const [formData, setFormData] = useState({
    // Product Information
    id: '',
    productId: '',
    name: '',
    productDescription: '',
    caseUpc: '',
    casePack: 1,
    size: '',
    status: 'Active',
    vendorId: '',
    departmentId: '',
    categoryId: '',
    crv: 0,
    
    // Purchase Configuration
    purchaseConfig: {
      configName: 'Case',
      purchaseCaseQty: 1,
      purchaseUnitCt: 0,
      purchaseWeight: 0,
      purchaseCrv: 0
    },
    
    // Transfer Configuration
    transferConfig: {
      configName: 'Case',
      transferCaseQty: 1,
      transferUnitCt: 0,
      transferWeight: 0,
      transferCrv: 0,
      transferCost: 0,
      transferCostOverride: false
    },
    
    // Product Pricing
    purchaseCost: 0,
    offInvoice: 0,
    billBack: 0,
    listCost: 0,
    retailPrice: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Optimized data fetching with loading state
  useEffect(() => {
    if (product?.id) {
      const fetchConfigurations = async () => {
        setIsLoading(true);
        try {
          // Use Promise.all for faster parallel loading
          const [purchaseResponse, transferResponse, pricingResponse, overrideResponse] = await Promise.all([
            fetch(`/api/products/${product.productId}/purchase`),
            fetch(`/api/products/${product.productId}/transfer`),
            fetch(`/api/products/${product.productId}/pricing`),
            fetch(`/api/products/${product.productId}/overrides`)
          ]);
          
          const purchaseConfig = purchaseResponse.ok ? await purchaseResponse.json() : null;
          const transferConfig = transferResponse.ok ? await transferResponse.json() : null;
          const pricingData = pricingResponse.ok ? await pricingResponse.json() : null;
          const overrideArray = overrideResponse.ok ? await overrideResponse.json() : null;
          const overrideData = overrideArray && overrideArray.length > 0 ? overrideArray[0] : null;
          
          // Populate form immediately with fetched data
          setFormData({
            id: product.id || '',
            productId: product.productId || '',
            name: product.name || '',
            productDescription: product.description || '',
            caseUpc: product.caseUpc || '',
            casePack: product.casePack || 1,
            size: product.size || '',
            status: product.status || 'Active',
            vendorId: product.vendorId?.toString() || '',
            departmentId: product.departmentId?.toString() || '',
            categoryId: product.categoryId?.toString() || '',
            crv: Number(product.crv || 0),
            
            purchaseConfig: {
              configName: purchaseConfig?.purchaseCfg || 'Case',
              purchaseCaseQty: purchaseConfig?.purchaseCaseQty || 1,
              purchaseUnitCt: purchaseConfig?.purchaseUnitCt || product.casePack || 1,
              purchaseWeight: Number(purchaseConfig?.purchaseWeight || 0),
              purchaseCrv: Number(purchaseConfig?.purchaseCrv || 0)
            },
            
            transferConfig: {
              configName: transferConfig?.transferCfg || transferConfig?.transfer_cfg || 'Case',
              transferCaseQty: Number(transferConfig?.transferCaseQty || 1),
              transferUnitCt: Number(transferConfig?.transferUnitCt || 1),
              transferWeight: Number(transferConfig?.transferWeight || 0),
              transferCost: Number(overrideData?.override_cost || 0),
              transferCrv: Number(transferConfig?.transferCrv || 0),
              transferCostOverride: !!overrideData?.override_cost
            },
            
            purchaseCost: Number(pricingData?.purchaseCost || 0),
            offInvoice: Number(pricingData?.offInvoice || 0),
            billBack: Number(pricingData?.billBack || 0),
            listCost: Number(pricingData?.listCost || 0),
            retailPrice: Number(pricingData?.retailPrice || 0)
          });
        } catch (error) {
          console.error('Error fetching product configurations:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchConfigurations();
    }
  }, [product]);

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border max-w-7xl mx-auto">
      {/* Header with loading indicator */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Product Configuration</h2>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Loading product data...
              </div>
            ) : (
              <span className="text-sm text-gray-600 max-w-md truncate">
                {formData.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form Cards */}
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        
        {/* Product Information Card - 30% width */}
        <Card className="lg:w-[30%] flex-shrink-0 min-w-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productId">Product ID</Label>
                <Input
                  id="productId"
                  value={formData.productId}
                  onChange={(e) => setFormData({...formData, productId: e.target.value})}
                  disabled={isLoading}
                  placeholder="Enter product ID"
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={isLoading}
                placeholder="Enter product name"
              />
            </div>

            <div>
              <Label htmlFor="description">Product Description</Label>
              <Input
                id="description"
                value={formData.productDescription}
                onChange={(e) => setFormData({...formData, productDescription: e.target.value})}
                disabled={isLoading}
                placeholder="Enter detailed description"
              />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button 
          onClick={() => onSave(formData)} 
          disabled={isSaving || isLoading}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}