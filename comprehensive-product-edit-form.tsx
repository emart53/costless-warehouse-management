/**
 * Comprehensive Product Edit Form
 * Single-page horizontal card layout for product configuration editing
 * Includes corrected unit conversion logic and CRV calculations
 */

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, ShoppingCart, Truck, Calculator, DollarSign, TrendingUp } from 'lucide-react';

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
      transferCost: 0
    },
    
    // Product Pricing
    purchaseCost: 0,
    offInvoice: 0,
    billBack: 0,
    listCost: 0,
    retailPrice: 0
  });

  const [isSaving, setIsSaving] = useState(false);

  // Fetch configuration data when product changes
  useEffect(() => {
    if (product?.id) {
      const fetchConfigurations = async () => {
        try {
          // Fetch purchase, transfer configurations and pricing data from separate endpoints using productId
          const [purchaseResponse, transferResponse, pricingResponse] = await Promise.all([
            fetch(`/api/products/${product.productId}/purchase`),
            fetch(`/api/products/${product.productId}/transfer`),
            fetch(`/api/products/${product.productId}/pricing`)
          ]);
          
          const purchaseConfig = purchaseResponse.ok ? await purchaseResponse.json() : null;
          const transferConfig = transferResponse.ok ? await transferResponse.json() : null;
          const pricingData = pricingResponse.ok ? await pricingResponse.json() : null;
          
          // Determine configuration names based on business logic
          const determinePurchaseConfig = (config) => {
            if (config?.purchaseCfg) return config.purchaseCfg;
            const caseQty = config?.purchaseCaseQty || 1;
            return caseQty > 24 ? 'Pallet' : 'Case';
          };
          
          const determineTransferConfig = (config) => {
            if (config?.transferCfg) return config.transferCfg;
            const caseQty = config?.transferCaseQty || 1;
            return caseQty > 24 ? 'Pallet' : 'Case';
          };
          
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
              configName: determinePurchaseConfig(purchaseConfig),
              purchaseCaseQty: purchaseConfig?.purchaseCaseQty || 1,
              purchaseUnitCt: purchaseConfig?.purchaseUnitCt || product.casePack || 1,
              purchaseWeight: Number(purchaseConfig?.purchaseWeight || 0),
              purchaseCrv: Number(purchaseConfig?.purchaseCrv || 0)
            },
            transferConfig: {
              configName: determineTransferConfig(transferConfig),
              transferCaseQty: transferConfig?.transferCaseQty || 1,
              transferUnitCt: transferConfig?.transferUnitCt || 1,
              transferWeight: Number(transferConfig?.transferWeight || 0),
              transferCost: 0, // Will be calculated
              transferCrv: Number(transferConfig?.transferCrv || 0)
            },
            
            // Product Pricing - using fetched pricing data
            purchaseCost: Number(pricingData?.purchaseCost || 0),
            offInvoice: Number(pricingData?.offInvoice || 0),
            billBack: Number(pricingData?.billBack || 0),
            retailPrice: Number(pricingData?.retailPrice || 0)
          });
        } catch (error) {
          console.error('Error fetching product configurations:', error);
          // Fallback to basic product data
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
              configName: 'Case',
              purchaseCaseQty: 1,
              purchaseUnitCt: 0,
              purchaseWeight: 0,
            },
            transferConfig: {
              configName: 'Case',
              transferCaseQty: 1,
              transferUnitCt: 0,
              transferWeight: 0,
              transferCost: 0,
              transferCrv: 0
            },
            purchaseCost: Number(product.purchaseCost || 0),
            offInvoice: Number(product.offInvoice || 0),
            billBack: Number(product.billBack || 0),
            retailPrice: Number(product.retailPrice || 0)
          });
        }
      };
      
      fetchConfigurations();
    }
  }, [product]);



  // Calculate purchase unit count when case qty or case pack changes
  useEffect(() => {
    const purchaseUnitCt = formData.purchaseConfig.purchaseCaseQty * formData.casePack;
    setFormData(prev => ({
      ...prev,
      purchaseConfig: {
        ...prev.purchaseConfig,
        purchaseUnitCt
      }
    }));
  }, [formData.purchaseConfig.purchaseCaseQty, formData.casePack]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prepare data with corrected unit conversion logic
      const saveData = {
        ...formData,
        // Apply corrected unit conversion formulas
        purchaseConfig: {
          ...formData.purchaseConfig,
          purchaseUnitCt: formData.purchaseConfig.purchaseCaseQty * formData.casePack
        },
        transferConfig: {
          ...formData.transferConfig,
          transferUnitCt: formData.transferConfig.transferCaseQty * formData.casePack,
          transferCrv: formData.crv * formData.transferConfig.transferCaseQty
        }
      };
      
      await onSave(saveData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          Edit Product Configuration
          <Badge variant="outline">
            ID: {formData.productId}
          </Badge>
        </h2>
      </div>

      {/* Horizontal Card Layout - 25% width each for 4 containers */}
      <div className="flex gap-3">
          
          {/* Product Information Card */}
          <Card className="flex-1 w-1/4 min-w-60">
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
                    placeholder="Enter product ID"
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
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
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <Label htmlFor="description">Product Description</Label>
                <Input
                  id="description"
                  value={formData.productDescription}
                  onChange={(e) => setFormData({...formData, productDescription: e.target.value})}
                  placeholder="Enter detailed description"
                />
              </div>

              <div>
                <Label htmlFor="caseUpc">Case UPC</Label>
                <Input
                  id="caseUpc"
                  value={formData.caseUpc}
                  onChange={(e) => setFormData({...formData, caseUpc: e.target.value})}
                  placeholder="Case UPC"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="casePack">Case Pack</Label>
                  <Input
                    id="casePack"
                    type="number"
                    value={formData.casePack}
                    onChange={(e) => setFormData({...formData, casePack: parseInt(e.target.value) || 1})}
                    placeholder="Units per case"
                  />
                </div>
                
                <div>
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                    placeholder="Product size"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(value) => setFormData({...formData, vendorId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => setFormData({...formData, departmentId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({...formData, categoryId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Configuration Card */}
          <Card className="flex-1 w-1/4 min-w-60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Purchase Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="purchaseConfigName">Configuration Name</Label>
                <Input
                  id="purchaseConfigName"
                  value={formData.purchaseConfig.configName}
                  onChange={(e) => setFormData({
                    ...formData,
                    purchaseConfig: {...formData.purchaseConfig, configName: e.target.value}
                  })}
                  placeholder="e.g., Case, Each, Pack"
                />
              </div>

              <div>
                <Label htmlFor="purchaseCaseQty">Case Quantity</Label>
                <Input
                  id="purchaseCaseQty"
                  type="number"
                  value={formData.purchaseConfig.purchaseCaseQty}
                  onChange={(e) => setFormData({
                    ...formData,
                    purchaseConfig: {...formData.purchaseConfig, purchaseCaseQty: parseInt(e.target.value) || 1}
                  })}
                  placeholder="1"
                />
              </div>
              
              <div>
                <Label htmlFor="purchaseUnitCt">Unit Count</Label>
                <Input
                  id="purchaseUnitCt"
                  type="number"
                  value={formData.purchaseConfig.purchaseUnitCt}
                  disabled
                  className="bg-gray-50"
                  title="Calculated: Case Qty × Case Pack"
                />
              </div>

              <div>
                <Label htmlFor="purchaseWeight">Weight (lbs)</Label>
                <Input
                  id="purchaseWeight"
                  type="number"
                  step="0.01"
                  value={formData.purchaseConfig.purchaseWeight}
                  onChange={(e) => setFormData({
                    ...formData,
                    purchaseConfig: {...formData.purchaseConfig, purchaseWeight: parseFloat(e.target.value) || 0}
                  })}
                  placeholder="0.00"
                />
              </div>
              


              <div>
                <Label htmlFor="crv">CRV (per unit)</Label>
                <Input
                  id="crv"
                  type="number"
                  step="0.01"
                  value={formData.crv}
                  onChange={(e) => setFormData({...formData, crv: parseFloat(e.target.value) || 0})}
                  placeholder="$0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Transfer Configuration Card */}
          <Card className="flex-1 w-1/4 min-w-60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Transfer Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="transferConfigName">Configuration Name</Label>
                <Input
                  id="transferConfigName"
                  value={formData.transferConfig.configName}
                  onChange={(e) => {
                    const newConfigName = e.target.value;
                    const isSameConfig = newConfigName === formData.purchaseConfig.configName;
                    
                    setFormData({
                      ...formData,
                      transferConfig: {
                        ...formData.transferConfig, 
                        configName: newConfigName,
                        // Auto-sync if same configuration
                        ...(isSameConfig ? {
                          transferCaseQty: formData.purchaseConfig.purchaseCaseQty,
                          transferUnitCt: formData.purchaseConfig.purchaseUnitCt,
                          transferWeight: formData.purchaseConfig.purchaseWeight,
                          transferCrv: formData.purchaseConfig.purchaseCrv
                        } : {})
                      }
                    });
                  }}
                  placeholder="e.g., Case, Each, Pack"
                />
                {formData.transferConfig.configName === formData.purchaseConfig.configName && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Same as purchase configuration - values will auto-sync
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="transferCaseQty">Case Quantity</Label>
                <Input
                  id="transferCaseQty"
                  type="number"
                  value={formData.transferConfig.transferCaseQty}
                  onChange={(e) => {
                    const newCaseQty = parseInt(e.target.value) || 1;
                    const isSameConfig = formData.transferConfig.configName === formData.purchaseConfig.configName;
                    
                    // Calculate ratio for different configurations
                    const ratio = isSameConfig ? 1 : (newCaseQty / (formData.purchaseConfig.purchaseCaseQty || 1));
                    
                    setFormData({
                      ...formData,
                      transferConfig: {
                        ...formData.transferConfig,
                        transferCaseQty: newCaseQty,
                        transferUnitCt: newCaseQty * formData.casePack,
                        transferWeight: isSameConfig ? formData.purchaseConfig.purchaseWeight : formData.purchaseConfig.purchaseWeight * ratio,
                        transferCrv: (formData.crv || 0) * newCaseQty
                      }
                    });
                  }}
                  disabled={formData.transferConfig.configName === formData.purchaseConfig.configName}
                  placeholder="1"
                />
                {formData.transferConfig.configName === formData.purchaseConfig.configName && (
                  <div className="text-xs text-blue-600 mt-1">Auto-synced from purchase configuration</div>
                )}
              </div>
              
              <div>
                <Label htmlFor="transferUnitCt">Unit Count</Label>
                <Input
                  id="transferUnitCt"
                  type="number"
                  value={formData.transferConfig.transferUnitCt}
                  disabled
                  className="bg-gray-50"
                  title="Calculated: Case Qty × Case Pack"
                />
              </div>

              <div>
                <Label htmlFor="transferWeight">Weight (lbs)</Label>
                <Input
                  id="transferWeight"
                  type="number"
                  step="0.01"
                  value={formData.transferConfig.transferWeight}
                  onChange={(e) => setFormData({
                    ...formData,
                    transferConfig: {...formData.transferConfig, transferWeight: parseFloat(e.target.value) || 0}
                  })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="transferCrv">Transfer CRV</Label>
                <Input
                  id="transferCrv"
                  type="number"
                  step="0.01"
                  value={formData.transferConfig.transferCrv}
                  disabled
                  className="bg-gray-50"
                  title="Calculated: CRV × Transfer Case Qty"
                />
              </div>


            </CardContent>
          </Card>

          {/* Product Pricing Card */}
          <Card className="flex-1 w-1/4 min-w-60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Product Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Purchase Cost Fields */}
              <div>
                <Label htmlFor="purchaseCost">Purchase Cost</Label>
                <Input
                  id="purchaseCost"
                  type="number"
                  step="0.01"
                  value={formData.purchaseCost}
                  onChange={(e) => setFormData({...formData, purchaseCost: parseFloat(e.target.value) || 0})}
                  placeholder="$0.00"
                />
              </div>

              <div>
                <Label htmlFor="offInvoice">Off Invoice</Label>
                <Input
                  id="offInvoice"
                  type="number"
                  step="0.01"
                  value={formData.offInvoice}
                  onChange={(e) => setFormData({...formData, offInvoice: parseFloat(e.target.value) || 0})}
                  placeholder="$0.00"
                />
              </div>

              <div>
                <Label htmlFor="billBack">Bill Back</Label>
                <Input
                  id="billBack"
                  type="number"
                  step="0.01"
                  value={formData.billBack}
                  onChange={(e) => setFormData({...formData, billBack: parseFloat(e.target.value) || 0})}
                  placeholder="$0.00"
                />
              </div>

              <div>
                <Label htmlFor="transferCost">Transfer Cost</Label>
                <Input
                  id="transferCost"
                  type="number"
                  step="0.01"
                  value={(() => {
                    const netCost = formData.purchaseCost - formData.offInvoice - formData.billBack;
                    const ratio = formData.purchaseConfig.purchaseCaseQty > 0 ? (formData.transferConfig.transferCaseQty / formData.purchaseConfig.purchaseCaseQty) : 1;
                    return (netCost * ratio).toFixed(2);
                  })()}
                  readOnly
                  className="bg-gray-50"
                  placeholder="$0.00"
                />
              </div>

              <div>
                <Label htmlFor="retailPrice">Retail Price</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  step="0.01"
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({...formData, retailPrice: parseFloat(e.target.value) || 0})}
                  placeholder="$0.00"
                />
              </div>

              <div>
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.0001"
                  value={(() => {
                    const netCost = formData.purchaseCost - formData.offInvoice - formData.billBack;
                    const ratio = formData.purchaseConfig.purchaseCaseQty > 0 ? (formData.transferConfig.transferCaseQty / formData.purchaseConfig.purchaseCaseQty) : 1;
                    const transferCost = netCost * ratio;
                    return formData.transferConfig.transferUnitCt > 0 ? (transferCost / formData.transferConfig.transferUnitCt).toFixed(4) : transferCost.toFixed(4);
                  })()}
                  readOnly
                  className="bg-gray-50"
                  placeholder="$0.0000"
                />
              </div>

              <div>
                <Label htmlFor="grossMargin">Gross Margin %</Label>
                <Input
                  id="grossMargin"
                  type="number"
                  step="0.1"
                  value={(() => {
                    const netCost = formData.purchaseCost - formData.offInvoice - formData.billBack;
                    const ratio = formData.purchaseConfig.purchaseCaseQty > 0 ? (formData.transferConfig.transferCaseQty / formData.purchaseConfig.purchaseCaseQty) : 1;
                    const transferCost = netCost * ratio;
                    const transferUnitCost = formData.transferConfig.transferUnitCt > 0 ? transferCost / formData.transferConfig.transferUnitCt : transferCost;
                    return formData.retailPrice > 0 && transferUnitCost > 0 ? (((formData.retailPrice - transferUnitCost) / formData.retailPrice) * 100).toFixed(1) : '0.0';
                  })()}
                  readOnly
                  className="bg-gray-50"
                  placeholder="0.0"
                />
              </div>


            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="min-w-24"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
    </div>
  );
}