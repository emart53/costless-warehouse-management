import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
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
    product_description: string;
    case_pack: number;
    size: string;
  };
  configuration?: {
    id: number;
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
  isEditable?: boolean;
}

export function PurchaseOrderDetailTableNew({ 
  items, 
  onUpdateItem, 
  onDeleteItem, 
  onAddItem,
  allProducts,
  configurations,
  isEditable = false
}: Props) {
  
  // Check if any items have bill back or CRV values
  const hasBillBackValues = items.some(item => item.billBack && item.billBack > 0);
  const hasCrvValues = items.some(item => item.purchaseCrv && item.purchaseCrv > 0);
  
  // Calculate extended values per your specifications
  const calculateExtendedValues = (item: PurchaseOrderItem) => {
    const qty = item.quantityOrdered || 0;
    const netCost = item.netCost || 0;
    const weight = item.purchaseWeight || 0;
    const crv = item.purchaseCrv || 0;
    const listCost = item.listCost || 0;
    
    return {
      extNet: qty * netCost,           // Ext. Net -> (net_cost * qty_ordered)
      extWeight: qty * weight,         // Ext. Weight -> purchase_weight * qty_ordered
      extCrv: qty * crv,              // Ext. CRV -> purchase_crv * qty_ordered
      extList: qty * listCost         // Ext. List -> list_cost * qty_ordered
    };
  };

  // Get product description concatenation: product_description, case_pack, /, size
  const getProductDescription = (item: PurchaseOrderItem) => {
    if (!item.product) return "Unknown Product";
    const { product_description, case_pack, size } = item.product;
    return `${product_description} ${case_pack}/${size}`;
  };

  // Get configuration name
  const getConfigurationName = (item: PurchaseOrderItem) => {
    if (!item.configuration) {
      // Find configuration by purchaseCfg ID - check both id and configuration_id
      const config = configurations.find(c => 
        c.id === item.purchaseCfg || 
        c.configuration_id === item.purchaseCfg
      );
      return config ? (config.configurationName || config.configuration_name) : "Case";
    }
    return item.configuration.configurationName;
  };

  const handleFieldUpdate = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    if (!isEditable) return;
    
    const updatedItem = { ...items[index], [field]: value };
    
    // Auto-calculate net cost when list cost or off invoice changes: net_cost = (list_cost - off_invoice)
    if (field === 'listCost' || field === 'offInvoice') {
      updatedItem.netCost = updatedItem.listCost - updatedItem.offInvoice;
    }
    
    onUpdateItem(index, updatedItem);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Qty</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Config</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium min-w-[200px]">Product Description</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">List Cost</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Off Invoice</th>
              {hasBillBackValues && (
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Bill Back</th>
              )}
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Net Cost</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Weight</th>
              {hasCrvValues && (
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium">CRV</th>
              )}
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Ext. Net</th>
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Ext. Weight</th>
              {hasCrvValues && (
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Ext. CRV</th>
              )}
              <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Ext. List</th>
              {isEditable && (
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const extValues = calculateExtendedValues(item);
              
              return (
                <tr key={index} className="hover:bg-gray-50">
                  {/* Qty → quantity_ordered (integer) */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    {isEditable ? (
                      <Input
                        type="number"
                        value={item.quantityOrdered || ''}
                        onChange={(e) => handleFieldUpdate(index, 'quantityOrdered', parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-xs text-right"
                        min="0"
                      />
                    ) : (
                      <span className="text-xs">{item.quantityOrdered || 0}</span>
                    )}
                  </td>
                  
                  {/* Config → configurations.configuration_name via purchase_cfg */}
                  <td className="border border-gray-300 px-1 py-1">
                    {isEditable ? (
                      <select
                        value={item.purchaseCfg || ''}
                        onChange={(e) => handleFieldUpdate(index, 'purchaseCfg', parseInt(e.target.value) || undefined)}
                        className="w-20 h-8 text-xs border rounded px-1"
                      >
                        <option value="">Select</option>
                        {configurations.map(config => (
                          <option key={config.id} value={config.id}>
                            {config.configurationName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs">{getConfigurationName(item)}</span>
                    )}
                  </td>
                  
                  {/* Product Description → concatenated product_description, case_pack, /, size */}
                  <td className="border border-gray-300 px-2 py-1 text-xs">
                    {getProductDescription(item)}
                  </td>
                  
                  {/* List Cost → list_cost (decimal 10,4) */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    {isEditable ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={item.listCost || ''}
                        onChange={(e) => handleFieldUpdate(index, 'listCost', parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-xs text-right"
                        min="0"
                      />
                    ) : (
                      <span className="text-xs">{formatCurrency((item.listCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}</span>
                    )}
                  </td>
                  
                  {/* Off Invoice → off_invoice (decimal 10,4) */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    {isEditable ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={item.offInvoice || ''}
                        onChange={(e) => handleFieldUpdate(index, 'offInvoice', parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-xs text-right"
                        min="0"
                      />
                    ) : (
                      <span className="text-xs">{formatCurrency((item.offInvoice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}</span>
                    )}
                  </td>
                  
                  {/* Bill Back → bill_back (decimal 10,4) */}
                  {hasBillBackValues && (
                    <td className="border border-gray-300 px-1 py-1 text-right">
                      {isEditable ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.billBack || ''}
                          onChange={(e) => handleFieldUpdate(index, 'billBack', parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-xs text-right"
                          min="0"
                        />
                      ) : (
                        <span className="text-xs">{formatCurrency((item.billBack || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}</span>
                      )}
                    </td>
                  )}
                  
                  {/* Net Cost → net_cost (decimal 12,4) (list_cost - off_invoice) */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    <span className="text-xs">{formatCurrency((item.netCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}</span>
                  </td>
                  
                  {/* Weight → purchase_weight (decimal 10,4) */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    {isEditable ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={item.purchaseWeight || ''}
                        onChange={(e) => handleFieldUpdate(index, 'purchaseWeight', parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-xs text-right"
                        min="0"
                      />
                    ) : (
                      <span className="text-xs">{(item.purchaseWeight || 0) % 1 === 0 ? Math.round(item.purchaseWeight || 0).toLocaleString('en-US') : (item.purchaseWeight || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                  </td>
                  
                  {/* CRV → purchase_crv (decimal 10,4) */}
                  {hasCrvValues && (
                    <td className="border border-gray-300 px-1 py-1 text-right">
                      {isEditable ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.purchaseCrv || ''}
                          onChange={(e) => handleFieldUpdate(index, 'purchaseCrv', parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-xs text-right"
                          min="0"
                        />
                      ) : (
                        <span className="text-xs">${(item.purchaseCrv || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </td>
                  )}
                  
                  {/* Ext. Net → (net_cost * qty_ordered) */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    <span className="text-xs font-medium">${extValues.extNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  
                  {/* Ext. Weight → purchase_weight * qty_ordered */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    <span className="text-xs">{extValues.extWeight % 1 === 0 ? Math.round(extValues.extWeight).toLocaleString('en-US') : extValues.extWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  
                  {/* Ext. CRV → purchase_crv * qty_ordered */}
                  {hasCrvValues && (
                    <td className="border border-gray-300 px-1 py-1 text-right">
                      <span className="text-xs">${extValues.extCrv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                  )}
                  
                  {/* Ext. List → list_cost * qty_ordered */}
                  <td className="border border-gray-300 px-1 py-1 text-right">
                    <span className="text-xs">${extValues.extList.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  
                  {/* Actions */}
                  {isEditable && (
                    <td className="border border-gray-300 px-1 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteItem(index)}
                        className="h-6 w-6 p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="bg-gray-50 border-t-2 border-gray-400 font-medium">
              {/* Column 1: Qty - show TOTALS label */}
              <td className="border border-gray-300 px-1 py-2 text-center font-bold">
                <span className="text-xs">TOTALS</span>
              </td>
              {/* Column 2: Config - empty */}
              <td className="border border-gray-300 px-1 py-2"></td>
              {/* Column 3: Product Description - empty */}
              <td className="border border-gray-300 px-1 py-2"></td>
              {/* Column 4: List Cost - empty */}
              <td className="border border-gray-300 px-1 py-2"></td>
              {/* Column 5: Off Invoice - empty */}
              <td className="border border-gray-300 px-1 py-2"></td>
              {/* Column 6: Bill Back (conditional) - empty */}
              {hasBillBackValues && (
                <td className="border border-gray-300 px-1 py-2"></td>
              )}
              {/* Column 7: Net Cost - empty */}
              <td className="border border-gray-300 px-1 py-2"></td>
              {/* Column 8: Weight - empty */}
              <td className="border border-gray-300 px-1 py-2"></td>
              {/* Column 9: CRV (conditional) - empty */}
              {hasCrvValues && (
                <td className="border border-gray-300 px-1 py-2"></td>
              )}
              {/* Column 10: Ext. Net - show total */}
              <td className="border border-gray-300 px-1 py-2 text-right">
                <span className="text-xs font-bold">
                  {formatCurrency(items.reduce((sum, item) => sum + ((item.netCost || 0) * (item.quantityOrdered || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}
                </span>
              </td>
              {/* Column 11: Ext. Weight - show total */}
              <td className="border border-gray-300 px-1 py-2 text-right">
                <span className="text-xs font-bold">
                  {(() => {
                    const totalWeight = items.reduce((sum, item) => sum + ((item.purchaseWeight || 0) * (item.quantityOrdered || 0)), 0);
                    return totalWeight % 1 === 0 ? Math.round(totalWeight).toLocaleString('en-US') : totalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
              </td>
              {/* Column 12: Ext. CRV (conditional) - show total */}
              {hasCrvValues && (
                <td className="border border-gray-300 px-1 py-2 text-right">
                  <span className="text-xs font-bold">
                    ${items.reduce((sum, item) => sum + ((item.purchaseCrv || 0) * (item.quantityOrdered || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
              )}
              {/* Column 13: Ext. List - show total */}
              <td className="border border-gray-300 px-1 py-2 text-right">
                <span className="text-xs font-bold">
                  {formatCurrency(items.reduce((sum, item) => sum + ((item.listCost || 0) * (item.quantityOrdered || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 )})}
                </span>
              </td>
              {/* Column 14: Actions (conditional) - empty */}
              {isEditable && (
                <td className="border border-gray-300 px-1 py-2"></td>
              )}
            </tr>

          </tbody>
        </table>
      </div>
      
      {isEditable && (
        <Button
          onClick={onAddItem}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      )}
    </div>
  );
}