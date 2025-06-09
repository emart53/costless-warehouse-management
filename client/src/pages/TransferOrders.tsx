import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, FileText, Search, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderEntry } from '@/components/OrderEntry';
import { RapidTransferEntry } from '@/components/RapidTransferEntry';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import type { TransferOrder } from '@shared/schema';

interface OrderItem {
  productId: string;
  quantity: number;
}

interface TransferItem {
  id: string;
  productId: number;
  productName: string;
  departmentName: string;
  quantity: number;
  transferCost: number;
  totalCost: number;
}

export default function TransferOrders() {
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [showRapidEntry, setShowRapidEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: transferOrders = [], isLoading } = useQuery({
    queryKey: ['/api/transfer-orders'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { storeId: number; items: OrderItem[] }) => {
      const response = await fetch('/api/transfer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to create transfer order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transfer-orders'] });
      setShowOrderEntry(false);
      setShowRapidEntry(false);
      toast({
        title: "Transfer Order Created",
        description: "Pick list generated successfully",
      });
    },
  });

  const handleSaveOrder = (items: OrderItem[]) => {
    createOrderMutation.mutate({
      storeId: 1,
      items
    });
  };

  const handleSaveRapidOrder = (items: TransferItem[]) => {
    const orderItems: OrderItem[] = items.map(item => ({
      productId: item.productId.toString(),
      quantity: item.quantity
    }));
    
    createOrderMutation.mutate({
      storeId: 1,
      items: orderItems
    });
  };

  const filteredOrders = transferOrders.filter((order: TransferOrder) =>
    order.transferNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showRapidEntry) {
    return (
      <RapidTransferEntry
        onSave={handleSaveRapidOrder}
        onCancel={() => setShowRapidEntry(false)}
      />
    );
  }

  if (showOrderEntry) {
    return (
      <OrderEntry
        orderType="transfer"
        onSave={handleSaveOrder}
        onCancel={() => setShowOrderEntry(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transfer Orders</h1>
          <p className="text-muted-foreground">
            Manage store transfers with rapid 10-key entry
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowRapidEntry(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Rapid Entry
          </Button>
          <Button onClick={() => setShowOrderEntry(true)} size="lg" variant="outline">
            <FileText className="w-5 h-5 mr-2" />
            Standard Entry
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by transfer number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredOrders.length} orders found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Orders List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                Loading transfer orders...
              </div>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Transfer Orders Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No orders match your search criteria.' : 'Create your first transfer order to get started.'}
                </p>
                <Button onClick={() => setShowOrderEntry(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Transfer Order
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order: TransferOrder) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium text-lg">Transfer #{order.transferNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        Store: {order.storeName || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Dept: {order.departments || 'Unknown'}
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      {order.totalItems || 0} items
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Ordered: {new Date(order.orderDate).toLocaleDateString()}</div>
                      {order.shipDate && (
                        <div>Shipped: {new Date(order.shipDate).toLocaleDateString()}</div>
                      )}
                      {order.status === 'delivered' && order.deliveryDate && (
                        <div>Delivered: {new Date(order.deliveryDate).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/transfer-orders/${order.id}`}>
                        <FileText className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">
                      {order.items.length} products to transfer
                    </div>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.product?.name || `Product ${item.productId}`}</span>
                          <span>{item.quantityOrdered} units</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.shipDate && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ship Date:</span>
                      <span>{new Date(order.shipDate).toLocaleDateString()}</span>
                    </div>
                    {order.deliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Date:</span>
                        <span>{new Date(order.deliveryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Access Tip */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-900 mb-1">
                Efficient Store Transfers
              </h3>
              <p className="text-sm text-green-700">
                Transfer orders use the same rapid 10-key entry as purchase orders. 
                Perfect for quickly building transfers to your 9 retail locations 
                with the speed you expect from your current system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}