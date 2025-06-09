import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ProductCalculationsProps {
  productId: number;
  purchaseData?: any;
  transferData?: any;
  onPurchaseChange?: (data: any) => void;
  onTransferChange?: (data: any) => void;
}

export default function ProductCalculations({
  productId,
  purchaseData,
  transferData,
  onPurchaseChange,
  onTransferChange
}: ProductCalculationsProps) {
  // Purchase configuration state
  const [purchaseConfig, setPurchaseConfig] = useState({
    purchaseCfg: purchaseData?.purchaseCfg || '',
    purchaseCaseQty: purchaseData?.purchaseCaseQty || 1,
    purchaseUnitCt: purchaseData?.purchaseUnitCt || 1,
    purchaseWeight: purchaseData?.purchaseWeight || 0,
    purchaseCrv: purchaseData?.purchaseCrv || 0,
    listCost: 0,
    offInvoice: 0,
    billBack: 0
  });

  // Transfer configuration state
  const [transferConfig, setTransferConfig] = useState({
    transferCfg: transferData?.transferCfg || '',
    transferCaseQty: transferData?.transferCaseQty || 1,
    transferUnitCt: transferData?.transferUnitCt || 1,
    transferWeight: transferData?.transferWeight || 0,
    transferCrv: transferData?.transferCrv || 0,
    transferCost: 0
  });

  // Calculated values
  const [calculations, setCalculations] = useState({
    netCost: 0,
    calculatedTransferCost: 0,
    ratio: 1,
    isAutoCalculated: false
  });

  // Calculate net cost (purchase cost - off invoice - bill back)
  const calculateNetCost = (listCost: number, offInvoice: number = 0, billBack: number = 0) => {
    return listCost - offInvoice - billBack;
  };

  // Calculate transfer cost based on configuration ratios
  const calculateTransferCost = (
    netCost: number,
    purchaseCaseQty: number,
    transferCaseQty: number,
    purchaseCfg: string,
    transferCfg: string
  ) => {
    if (purchaseCfg === transferCfg) {
      // Same configuration, direct copy
      return netCost;
    } else {
      // Different configuration, calculate ratio
      const ratio = transferCaseQty / purchaseCaseQty;
      return netCost * ratio;
    }
  };

  // Auto-calculate transfer fields when purchase data or transfer config changes
  useEffect(() => {
    const netCost = calculateNetCost(
      purchaseConfig.listCost,
      purchaseConfig.offInvoice,
      purchaseConfig.billBack
    );

    const ratio = purchaseConfig.purchaseCaseQty > 0 
      ? transferConfig.transferCaseQty / purchaseConfig.purchaseCaseQty 
      : 1;

    const calculatedTransferCost = calculateTransferCost(
      netCost,
      purchaseConfig.purchaseCaseQty,
      transferConfig.transferCaseQty,
      purchaseConfig.purchaseCfg,
      transferConfig.transferCfg
    );

    setCalculations({
      netCost,
      calculatedTransferCost,
      ratio,
      isAutoCalculated: purchaseConfig.purchaseCfg !== transferConfig.transferCfg
    });

    // Auto-populate transfer fields if same configuration
    if (purchaseConfig.purchaseCfg === transferConfig.transferCfg && purchaseConfig.purchaseCfg) {
      setTransferConfig(prev => ({
        ...prev,
        transferCaseQty: purchaseConfig.purchaseCaseQty,
        transferUnitCt: purchaseConfig.purchaseUnitCt,
        transferWeight: purchaseConfig.purchaseWeight,
        transferCrv: purchaseConfig.purchaseCrv,
        transferCost: calculatedTransferCost
      }));
    } else if (purchaseConfig.purchaseCfg !== transferConfig.transferCfg && purchaseConfig.purchaseCfg && transferConfig.transferCfg) {
      // Different configurations, update only the cost
      setTransferConfig(prev => ({
        ...prev,
        transferCost: calculatedTransferCost
      }));
    }
  }, [
    purchaseConfig.listCost,
    purchaseConfig.offInvoice,
    purchaseConfig.billBack,
    purchaseConfig.purchaseCaseQty,
    purchaseConfig.purchaseUnitCt,
    purchaseConfig.purchaseWeight,
    purchaseConfig.purchaseCrv,
    purchaseConfig.purchaseCfg,
    transferConfig.transferCaseQty,
    transferConfig.transferCfg
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Purchase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Purchase Configuration
            <Badge variant="outline">Primary Data Entry</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase-cfg">Purchase Config</Label>
              <Select
                value={purchaseConfig.purchaseCfg}
                onValueChange={(value) => setPurchaseConfig(prev => ({ ...prev, purchaseCfg: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select config" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Case">Case</SelectItem>
                  <SelectItem value="Pallet">Pallet</SelectItem>
                  <SelectItem value="Each">Each</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="purchase-case-qty">Purchase Case Qty</Label>
              <Input
                type="number"
                value={purchaseConfig.purchaseCaseQty}
                onChange={(e) => setPurchaseConfig(prev => ({ 
                  ...prev, 
                  purchaseCaseQty: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="purchase-unit-ct">Unit Count</Label>
              <Input
                type="number"
                value={purchaseConfig.purchaseUnitCt}
                onChange={(e) => setPurchaseConfig(prev => ({ 
                  ...prev, 
                  purchaseUnitCt: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="purchase-weight">Weight</Label>
              <Input
                type="number"
                step="0.01"
                value={purchaseConfig.purchaseWeight}
                onChange={(e) => setPurchaseConfig(prev => ({ 
                  ...prev, 
                  purchaseWeight: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="purchase-crv">CRV</Label>
              <Input
                type="number"
                step="0.01"
                value={purchaseConfig.purchaseCrv}
                onChange={(e) => setPurchaseConfig(prev => ({ 
                  ...prev, 
                  purchaseCrv: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="list-cost">List Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={purchaseConfig.listCost}
                onChange={(e) => setPurchaseConfig(prev => ({ 
                  ...prev, 
                  listCost: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="off-invoice">Off Invoice</Label>
              <Input
                type="number"
                step="0.01"
                value={purchaseConfig.offInvoice}
                onChange={(e) => setPurchaseConfig(prev => ({ 
                  ...prev, 
                  offInvoice: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="bill-back">Bill Back</Label>
              <Input
                type="number"
                step="0.01"
                value={purchaseConfig.billBack}
                onChange={(e) => setPurchaseConfig(prev => ({ 
                  ...prev, 
                  billBack: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium">Net Cost: {formatCurrency(calculations.netCost)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Transfer Configuration
            {calculations.isAutoCalculated && (
              <Badge variant="secondary">Auto-calculated</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transfer-cfg">Transfer Config</Label>
              <Select
                value={transferConfig.transferCfg}
                onValueChange={(value) => setTransferConfig(prev => ({ ...prev, transferCfg: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select config" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Case">Case</SelectItem>
                  <SelectItem value="Pallet">Pallet</SelectItem>
                  <SelectItem value="Each">Each</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transfer-case-qty">Transfer Case Qty</Label>
              <Input
                type="number"
                value={transferConfig.transferCaseQty}
                onChange={(e) => setTransferConfig(prev => ({ 
                  ...prev, 
                  transferCaseQty: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="transfer-unit-ct">Unit Count</Label>
              <Input
                type="number"
                value={transferConfig.transferUnitCt}
                onChange={(e) => setTransferConfig(prev => ({ 
                  ...prev, 
                  transferUnitCt: parseInt(e.target.value) || 1 
                }))}
                disabled={purchaseConfig.purchaseCfg === transferConfig.transferCfg}
              />
            </div>
            <div>
              <Label htmlFor="transfer-weight">Weight</Label>
              <Input
                type="number"
                step="0.01"
                value={transferConfig.transferWeight}
                onChange={(e) => setTransferConfig(prev => ({ 
                  ...prev, 
                  transferWeight: parseFloat(e.target.value) || 0 
                }))}
                disabled={purchaseConfig.purchaseCfg === transferConfig.transferCfg}
              />
            </div>
            <div>
              <Label htmlFor="transfer-crv">CRV</Label>
              <Input
                type="number"
                step="0.01"
                value={transferConfig.transferCrv}
                onChange={(e) => setTransferConfig(prev => ({ 
                  ...prev, 
                  transferCrv: parseFloat(e.target.value) || 0 
                }))}
                disabled={purchaseConfig.purchaseCfg === transferConfig.transferCfg}
              />
            </div>
          </div>

          <div className="p-3 bg-green-50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Transfer Cost: {formatCurrency(calculations.calculatedTransferCost)}</p>
            {calculations.isAutoCalculated && (
              <p className="text-xs text-gray-600">
                Ratio: {calculations.ratio.toFixed(2)} (Transfer Qty / Purchase Qty)
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}