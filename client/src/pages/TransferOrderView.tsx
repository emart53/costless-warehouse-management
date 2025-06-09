import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ArrowLeft, Package, Truck, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TransferOrderItem {
  id: number;
  productId: number;
  csvProductTransferId: number;
  productName: string;
  fullProductDescription: string;
  departmentName: string;
  quantity: number;
  transferCost: number;
  totalCost: number;
  crvPerUnit?: number;
  totalCrv?: number;
  transferCfg?: string;
  transferWeight?: number;
  transferCaseQty?: number;
  retailPrice?: number;
  gmPercentage?: number;
}

interface TransferOrderDetail {
  id: number;
  transferNumber: string;
  storeId: number;
  storeName: string;
  storeNumber: string;
  orderDate: string;
  shipDate: string | null;
  deliveryDate: string | null;
  status: string;
  totalItems: number | null;
  totalCases: string | null;
  notes: string | null;
  departments: string;
  departmentCount: number;
  items: TransferOrderItem[];
}

export default function TransferOrderView() {
  const params = useParams();
  const transferId = params.id;

  const { data: transferOrder, isLoading, error } = useQuery<TransferOrderDetail>({
    queryKey: [`/api/transfer-orders/${transferId}`],
  });



  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return <Package className="w-4 h-4" />;
    
    switch (status.toLowerCase()) {
      case 'pending':
        return <Package className="w-4 h-4" />;
      case 'in_transit':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Loading Transfer Order...</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!transferOrder) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Transfer Order Not Found</h1>
          <Button variant="outline" asChild>
            <Link href="/transfer-orders">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Transfer Orders
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Transfer order not found or you don't have permission to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transfer #{transferOrder.transferNumber}</h1>
        <Button variant="outline" asChild>
          <Link href="/transfer-orders">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Transfer Orders
          </Link>
        </Button>
      </div>

      {/* Header Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(transferOrder?.status)}
              Transfer Details
            </CardTitle>
            <Badge className={getStatusColor(transferOrder?.status)}>
              {transferOrder?.status || 'Unknown'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Store</div>
              <div className="text-lg">{transferOrder.storeName}</div>
              <div className="text-sm text-muted-foreground">Store #{transferOrder.storeNumber}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Departments</div>
              <div className="text-lg">{transferOrder.departments}</div>
              <div className="text-sm text-muted-foreground">
                {transferOrder.departmentCount} department{transferOrder.departmentCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Order Date</div>
              <div className="text-lg">{new Date(transferOrder.orderDate).toLocaleDateString()}</div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transferOrder.shipDate && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Ship Date</div>
                <div className="text-lg">{new Date(transferOrder.shipDate).toLocaleDateString()}</div>
              </div>
            )}
            {transferOrder.deliveryDate && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Delivery Date</div>
                <div className="text-lg">{new Date(transferOrder.deliveryDate).toLocaleDateString()}</div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total Items</div>
              <div className="text-lg">{transferOrder.totalItems || 0}</div>
            </div>
          </div>

          {transferOrder.notes && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Notes</div>
                <div className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                  {transferOrder.notes}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transferOrder.items && transferOrder.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 w-12">✓</th>
                      <th className="text-left p-3 w-16">Qty</th>
                      <th className="text-left p-3 w-20">Product #</th>
                      <th className="text-left p-3">Product</th>
                      <th className="text-right p-3 w-20">Cost</th>
                      <th className="text-right p-3 w-24">Ext Cost</th>
                      <th className="text-right p-3 w-20">Weight</th>
                      <th className="text-right p-3 w-16">CRV</th>
                      <th className="text-right p-3 w-20">Ext CRV</th>
                      <th className="text-right p-3 w-20">Retail</th>
                      <th className="text-right p-3 w-16">GM%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferOrder.items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-3 font-medium">{item.quantity}</td>
                        <td className="p-3 font-mono text-sm">{item.productId}</td>
                        <td className="p-3">
                          <div className="font-medium">{item.fullProductDescription}</div>
                          {item.transferCfg && (
                            <div className="text-xs text-muted-foreground">
                              {item.transferCfg} • {item.transferCaseQty} cases
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">
                          ${(parseFloat(item.transferCost?.toString() || '0')).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          ${(parseFloat(item.totalCost?.toString() || '0')).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {(parseFloat(item.transferWeight?.toString() || '0')).toFixed(1)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          ${(parseFloat(item.crvPerUnit?.toString() || '0')).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          ${(parseFloat(item.totalCrv?.toString() || '0')).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {item.retailPrice ? `$${(parseFloat(item.retailPrice.toString())).toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {item.gmPercentage ? `${(parseFloat(item.gmPercentage.toString())).toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Transfer Summary */}
              <div className="border-t bg-muted/20 p-4">
                <div className="flex justify-end space-x-8">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Subtotal:</div>
                    <div className="font-medium">
                      ${transferOrder.items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">CRV Total:</div>
                    <div className="font-medium">
                      ${transferOrder.items.reduce((sum, item) => sum + (parseFloat(item.totalCrv) || 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Weight:</div>
                    <div className="font-medium">
                      {transferOrder.items.reduce((sum, item) => sum + ((parseFloat(item.transferWeight) || 0) * item.quantity), 0).toFixed(1)} lbs
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No items found for this transfer order.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}