import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from '@/lib/formatNumber';

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

interface Props {
  items: PurchaseOrderItem[];
  onUpdateItem: (index: number, item: PurchaseOrderItem) => void;
  onDeleteItem: (index: number) => void;
  onAddItem: () => void;
  allProducts: any[];
  configurations: any[];
}

export function PurchaseOrderDetailTable({ 
  items, 
  onUpdateItem, 
  onDeleteItem, 
  onAddItem,
  allProducts,
  configurations 
}: Props) {
  
  // Check if any items have bill back or CRV values
  const hasBillBackValues = items.some(item => item.billBack && item.billBack > 0);
  const hasCrvValues = items.some(item => item.purchaseCrv && item.purchaseCrv > 0);
  
  // Calculate extended values
  const calculateExtendedValues = (item: PurchaseOrderItem) => {
    const qty = item.quantityOrdered || 0;
    const netCost = item.listCost - item.offInvoice;
    
    return {
      extNet: netCost * qty,
      extWeight: item.purchaseWeight * qty,
      extCrv: item.purchaseCrv * qty,
      extList: item.listCost * qty,
      netCost
    };
  };

  // Get product description concatenation
  const getProductDescription = (item: PurchaseOrderItem) => {
    if (!item.product) return "Unknown Product";
    const { productDescription, casePack, size } = item.product;
    return `${productDescription} ${casePack}/${size}`;
  };

  // Get configuration name
  const getConfigurationName = (item: PurchaseOrderItem) => {
    if (!item.configuration) return "Case";
    return item.configuration.configurationName;
  };

  // Handle field updates with automatic calculations
  const handleFieldUpdate = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updatedItem = { ...items[index], [field]: value };
    
    // Auto-calculate net cost when list cost or off invoice changes
    if (field === 'listCost' || field === 'offInvoice') {
      updatedItem.netCost = updatedItem.listCost - updatedItem.offInvoice;
    }
    
    onUpdateItem(index, updatedItem);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 table-fixed">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-16">Qty</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-20">Config</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Product Description</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">List Cost</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">Off Invoice</th>
              {hasBillBackValues && (
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">Bill Back</th>
              )}
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">Net Cost</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-20">Weight</th>
              {hasCrvValues && (
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-20">CRV</th>
              )}
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">Ext. Net</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">Ext. Weight</th>
              {hasCrvValues && (
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">Ext. CRV</th>
              )}
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-24">Ext. List</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const extValues = calculateExtendedValues(item);
              
              return (
                <tr key={index} className="hover:bg-gray-50">
                  {/* Qty → quantity_ordered */}
                  <td className="border border-gray-300 px-1 py-1">
                    <Input
                      type="number"
                      value={item.quantityOrdered || ''}
                      onChange={(e) => handleFieldUpdate(index, 'quantityOrdered', parseInt(e.target.value) || 0)}
                      className="w-full h-8 text-xs"
                      min="0"
                    />
                  </td>
                  
                  {/* Config → configurations.configuration_name via purchase_cfg */}
                  <td className="border border-gray-300 px-1 py-1">
                    <select
                      value={item.purchaseCfg || ''}
                      onChange={(e) => handleFieldUpdate(index, 'purchaseCfg', parseInt(e.target.value) || undefined)}
                      className="w-full h-8 text-xs border rounded px-1"
                    >
                      <option value="">Select</option>
                      {configurations.map(config => (
                        <option key={config.id} value={config.id}>
                          {config.configurationName}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Product Description → concatenated product_description, case_pack, /, size */}
                  <td className="border border-gray-300 px-2 py-1 text-xs">
                    <div className="truncate" title={getProductDescription(item)}>
                      {getProductDescription(item)}
                    </div>
                  </td>
                  
                  {/* List Cost → list_cost */}
                  <td className="border border-gray-300 px-1 py-1">
                    <Input
                      type="number"
                      step="0.0001"
                      value={item.listCost || ''}
                      onChange={(e) => handleFieldUpdate(index, 'listCost', parseFloat(e.target.value) || 0)}
                      className="w-full h-8 text-xs"
                      min="0"
                    />
                  </td>
                  
                  {/* Off Invoice → off_invoice */}
                  <td className="border border-gray-300 px-1 py-1">
                    <Input
                      type="number"
                      step="0.0001"
                      value={item.offInvoice || ''}
                      onChange={(e) => handleFieldUpdate(index, 'offInvoice', parseFloat(e.target.value) || 0)}
                      className="w-full h-8 text-xs"
                      min="0"
                    />
                  </td>
                  
                  {/* Bill Back → bill_back (conditional) */}
                  {hasBillBackValues && (
                    <td className="border border-gray-300 px-1 py-1">
                      <Input
                        type="number"
                        step="0.0001"
                        value={item.billBack || ''}
                        onChange={(e) => handleFieldUpdate(index, 'billBack', parseFloat(e.target.value) || 0)}
                        className="w-full h-8 text-xs"
                        min="0"
                      />
                    </td>
                  )}
                  
                  {/* Net Cost → net_cost (list_cost - off_invoice) */}
                  <td className="border border-gray-300 px-2 py-1 text-xs bg-gray-100">
                    {formatCurrency(extValues.netCost.toFixed(4))}
                  </td>
                  
                  {/* Weight → purchase_weight */}
                  <td className="border border-gray-300 px-1 py-1">
                    <Input
                      type="number"
                      step="0.0001"
                      value={item.purchaseWeight || ''}
                      onChange={(e) => handleFieldUpdate(index, 'purchaseWeight', parseFloat(e.target.value) || 0)}
                      className="w-full h-8 text-xs"
                      min="0"
                    />
                  </td>
                  
                  {/* CRV → purchase_crv (conditional) */}
                  {hasCrvValues && (
                    <td className="border border-gray-300 px-1 py-1">
                      <Input
                        type="number"
                        step="0.0001"
                        value={item.purchaseCrv || ''}
                        onChange={(e) => handleFieldUpdate(index, 'purchaseCrv', parseFloat(e.target.value) || 0)}
                        className="w-full h-8 text-xs"
                        min="0"
                      />
                    </td>
                  )}
                  
                  {/* Ext. Net → (billed_cost * qty_ordered) */}
                  <td className="border border-gray-300 px-2 py-1 text-xs bg-blue-50 font-medium">
                    ${extValues.extNet.toFixed(2)}
                  </td>
                  
                  {/* Ext. Weight → purchase_weight * qty_ordered */}
                  <td className="border border-gray-300 px-2 py-1 text-xs bg-blue-50">
                    {extValues.extWeight.toFixed(4)}
                  </td>
                  
                  {/* Ext. CRV → purchase_crv * qty_ordered (conditional) */}
                  {hasCrvValues && (
                    <td className="border border-gray-300 px-2 py-1 text-xs bg-blue-50">
                      ${extValues.extCrv.toFixed(4)}
                    </td>
                  )}
                  
                  {/* Ext. List → list_cost * qty_ordered */}
                  <td className="border border-gray-300 px-2 py-1 text-xs bg-blue-50">
                    ${extValues.extList.toFixed(2)}
                  </td>
                  
                  {/* Actions */}
                  <td className="border border-gray-300 px-1 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteItem(index)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Add New Item Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onAddItem}
        className="flex items-center gap-2"
      >
        <Plus size={16} />
        Add Item
      </Button>
      
      {/* Totals Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Order Totals</h3>
        <div className={`grid gap-4 text-sm ${hasCrvValues ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <span className="font-medium">Total Ext. Net:</span>
            <div className="text-lg font-bold text-green-600">
              ${items.reduce((sum, item) => sum + calculateExtendedValues(item).extNet, 0).toFixed(2)}
            </div>
          </div>
          <div>
            <span className="font-medium">Total Ext. Weight:</span>
            <div className="text-lg font-bold">
              {items.reduce((sum, item) => sum + calculateExtendedValues(item).extWeight, 0).toFixed(4)}
            </div>
          </div>
          {hasCrvValues && (
            <div>
              <span className="font-medium">Total Ext. CRV:</span>
              <div className="text-lg font-bold">
                ${items.reduce((sum, item) => sum + calculateExtendedValues(item).extCrv, 0).toFixed(4)}
              </div>
            </div>
          )}
          <div>
            <span className="font-medium">Total Ext. List:</span>
            <div className="text-lg font-bold">
              ${items.reduce((sum, item) => sum + calculateExtendedValues(item).extList, 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}