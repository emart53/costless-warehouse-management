import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { 
  FileText, 
  Download, 
  BarChart3, 
  Package, 
  Truck,
  MapPin,
  TrendingUp,
  Calendar,
  RefreshCw
} from "lucide-react";
import type { 
  Product, 
  Transaction, 
  InventoryItem, 
  Location,
  DashboardMetrics 
} from "@/lib/types";

interface CategorySummary {
  category: string;
  itemCount: number;
  totalQuantity: number;
  averageQuantity: number;
}

interface LocationUtilization {
  location: Location;
  itemCount: number;
  totalQuantity: number;
  capacity: number;
  utilizationPercentage: number;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [dateRange, setDateRange] = useState("7d");

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: lowStockItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  // Calculate inventory summary
  const inventorySummary = {
    totalItems: inventory.length,
    totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
    lowStockItems: lowStockItems.length,
    categories: inventory.reduce((acc, item) => {
      const category = item.product.category || 'Uncategorized';
      const existing = acc.find(c => c.category === category);
      if (existing) {
        existing.itemCount += 1;
        existing.totalQuantity += item.quantity;
      } else {
        acc.push({
          category,
          itemCount: 1,
          totalQuantity: item.quantity,
          averageQuantity: item.quantity,
        });
      }
      return acc;
    }, [] as CategorySummary[]).map(c => ({
      ...c,
      averageQuantity: Math.round(c.totalQuantity / c.itemCount),
    })),
  };

  // Calculate transaction summary based on date range
  const getDateRangeFilter = (range: string) => {
    const now = new Date();
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    }[range] || 7;
    
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return startDate;
  };

  const filteredTransactions = transactions.filter(t => 
    new Date(t.createdAt) >= getDateRangeFilter(dateRange)
  );

  const transactionSummary = {
    totalTransactions: filteredTransactions.length,
    receipts: filteredTransactions.filter(t => t.type === 'receipt').length,
    shipments: filteredTransactions.filter(t => t.type === 'shipment').length,
    adjustments: filteredTransactions.filter(t => t.type === 'adjustment').length,
    recentActivity: filteredTransactions.slice(0, 10),
  };

  // Calculate location utilization
  const locationUtilization: LocationUtilization[] = locations.map(location => {
    const locationInventory = inventory.filter(item => item.location.id === location.id);
    const itemCount = locationInventory.length;
    const totalQuantity = locationInventory.reduce((sum, item) => sum + item.quantity, 0);
    const capacity = location.capacity || 100;
    const utilizationPercentage = Math.round((totalQuantity / capacity) * 100);

    return {
      location,
      itemCount,
      totalQuantity,
      capacity,
      utilizationPercentage: Math.min(utilizationPercentage, 100),
    };
  });

  const handleExportReport = (reportType: string) => {
    // In a real application, this would generate and download a file
    console.log(`Exporting ${reportType} report...`);
  };

  const InventoryReport = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{inventorySummary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-success-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{inventorySummary.totalQuantity.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-8 h-8 text-warning-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{inventorySummary.lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-neutral-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{inventorySummary.categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium py-3">Category</th>
                  <th className="text-left font-medium py-3">Item Count</th>
                  <th className="text-left font-medium py-3">Total Quantity</th>
                  <th className="text-left font-medium py-3">Average Quantity</th>
                </tr>
              </thead>
              <tbody>
                {inventorySummary.categories.map((category, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 font-medium">{category.category}</td>
                    <td className="py-3">{category.itemCount}</td>
                    <td className="py-3">{category.totalQuantity.toLocaleString()}</td>
                    <td className="py-3">{category.averageQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={`${item.product.id}-${item.location.id}`} className="flex items-center justify-between p-3 bg-warning-50 border border-warning-200 rounded-lg">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">{item.product.sku} • {item.location.code}</p>
                  </div>
                  <Badge variant="destructive">
                    {item.quantity} remaining
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const TransactionReport = () => (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Transaction Activity</h3>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{transactionSummary.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-success-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receipts</p>
                <p className="text-2xl font-bold">{transactionSummary.receipts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-error-600 rotate-180" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shipments</p>
                <p className="text-2xl font-bold">{transactionSummary.shipments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-8 h-8 text-warning-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Adjustments</p>
                <p className="text-2xl font-bold">{transactionSummary.adjustments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transaction Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-3">Type</th>
                    <th className="text-left font-medium py-3">Product</th>
                    <th className="text-left font-medium py-3">Quantity</th>
                    <th className="text-left font-medium py-3">Location</th>
                    <th className="text-left font-medium py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionSummary.recentActivity.map((transaction) => (
                    <tr key={transaction.id} className="border-b">
                      <td className="py-3">
                        <Badge variant="outline">
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="py-3">{transaction.product.name}</td>
                      <td className="py-3">
                        {transaction.type === 'shipment' ? '-' : '+'}{transaction.quantity}
                      </td>
                      <td className="py-3">{transaction.location.code}</td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const LocationReport = () => (
    <div className="space-y-6">
      {/* Location Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Location Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          {locationsLoading || inventoryLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-3">Location</th>
                    <th className="text-left font-medium py-3">Items</th>
                    <th className="text-left font-medium py-3">Quantity</th>
                    <th className="text-left font-medium py-3">Capacity</th>
                    <th className="text-left font-medium py-3">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {locationUtilization.map((location) => (
                    <tr key={location.location.id} className="border-b">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{location.location.code}</div>
                          <div className="text-sm text-muted-foreground">{location.location.name}</div>
                        </div>
                      </td>
                      <td className="py-3">{location.itemCount}</td>
                      <td className="py-3">{location.totalQuantity}</td>
                      <td className="py-3">{location.capacity}</td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-neutral-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                location.utilizationPercentage > 80 
                                  ? 'bg-error-500' 
                                  : location.utilizationPercentage > 60 
                                  ? 'bg-warning-500' 
                                  : 'bg-success-500'
                              }`}
                              style={{ width: `${location.utilizationPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{location.utilizationPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-neutral-600">Generate insights from warehouse data</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExportReport(activeTab)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Reports Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inventory" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Inventory Report</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center space-x-2">
                <Truck className="w-4 h-4" />
                <span>Transaction Report</span>
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Location Report</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="inventory" className="mt-6">
              <InventoryReport />
            </TabsContent>
            
            <TabsContent value="transactions" className="mt-6">
              <TransactionReport />
            </TabsContent>
            
            <TabsContent value="locations" className="mt-6">
              <LocationReport />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}
