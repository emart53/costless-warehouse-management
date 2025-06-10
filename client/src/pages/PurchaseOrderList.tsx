import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Eye, Search, Filter, Package, Calendar, DollarSign, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, formatNumber , formatCurrencyInput, parseCurrency } from "@/lib/formatNumber";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendor: {
    name: string;
    code: string;
  };
  orderDate: string;
  expectedDate: string;
  status: string;
  totalAmount: string;
  itemCount?: number;
}



const getStatusBadge = (status: string) => {
  const statusConfig = {
    'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Calendar },
    'Scheduled': { color: 'bg-blue-100 text-blue-800', icon: Calendar },
    'Received': { color: 'bg-green-100 text-green-800', icon: Package },
    'Cancelled': { color: 'bg-red-100 text-red-800', icon: Package },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Pending;
  
  return (
    <Badge className={`${config.color} border-0`}>
      {status}
    </Badge>
  );
};

export default function PurchaseOrderList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { data: purchaseOrders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    staleTime: 300000, // Cache vendors for 5 minutes
  });

  // Memoized filtering for performance
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch = 
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || po.status === statusFilter;
      const matchesVendor = vendorFilter === "all" || po.vendor.code === vendorFilter;
      
      return matchesSearch && matchesStatus && matchesVendor;
    });
  }, [purchaseOrders, searchTerm, statusFilter, vendorFilter]);

  // Memoized pagination
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  // Reset to first page when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    if (filterType === 'search') setSearchTerm(value);
    if (filterType === 'status') setStatusFilter(value);
    if (filterType === 'vendor') setVendorFilter(value);
  };

  // Calculate summary totals
  const summaryStats = useMemo(() => {
    const totalValue = filteredOrders.reduce((sum, po) => sum + parseFloat(po.totalAmount.replace(/[$,]/g, '')), 0);
    const statusCounts = filteredOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalOrders: filteredOrders.length,
      totalValue,
      pendingOrders: statusCounts['Pending'] || 0,
      scheduledOrders: statusCounts['Scheduled'] || 0,
      receivedOrders: statusCounts['Received'] || 0,
      averageOrderValue: filteredOrders.length > 0 ? totalValue / filteredOrders.length : 0
    };
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }



  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track purchase orders</p>
        </div>
        <Link href="/purchase-orders/create">
          <Button className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Create Purchase Order
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{summaryStats.totalOrders.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{summaryStats.pendingOrders}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Received</p>
                <p className="text-2xl font-bold">{summaryStats.receivedOrders}</p>
              </div>
              <Truck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalValue.toString())}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by PO number or vendor..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vendorFilter} onValueChange={(value) => handleFilterChange('vendor', value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.code}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== "all" || vendorFilter !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setVendorFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((po) => (
                    <TableRow key={po.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:underline">
                          {po.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{po.vendor.name}</div>
                          <div className="text-sm text-gray-500">{po.vendor.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(po.orderDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{po.expectedDate ? format(new Date(po.expectedDate), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(po.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/purchase-orders/${po.id}`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[32px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}