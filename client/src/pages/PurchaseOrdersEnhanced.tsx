import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Filter, Eye, Edit, Trash2, Download, Send, Package, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";
import type { PurchaseOrder, Vendor } from "@shared/schema";

// Utility function to format numbers with commas
const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Status badge styling
const getStatusBadge = (status: string) => {
  const statusConfig = {
    PENDING: { variant: "secondary" as const, icon: Clock, label: "Pending" },
    SENT: { variant: "default" as const, icon: Send, label: "Sent" },
    RECEIVED: { variant: "default" as const, icon: CheckCircle, label: "Received" },
    CANCELLED: { variant: "destructive" as const, icon: XCircle, label: "Cancelled" },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default function PurchaseOrdersEnhanced() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("expectedDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["/api/purchase-orders"],
  });

  // Fetch vendors for display
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Create purchase order mutation
  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/purchase-orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  // Update purchase order mutation
  const updatePOMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/purchase-orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsEditDialogOpen(false);
      setEditingPO(null);
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  // Delete purchase order mutation
  const deletePOMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/purchase-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase order status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Filter and sort purchase orders
  const filteredPOs = (purchaseOrders as any[])?.filter((po: any) => {
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.vendor?.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a: any, b: any) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case "expectedDate":
        aVal = a.expectedDate ? new Date(a.expectedDate).getTime() : 0;
        bVal = b.expectedDate ? new Date(b.expectedDate).getTime() : 0;
        break;
      case "orderDate":
        aVal = a.orderDate ? new Date(a.orderDate).getTime() : 0;
        bVal = b.orderDate ? new Date(b.orderDate).getTime() : 0;
        break;
      case "poNumber":
        aVal = parseInt(a.poNumber) || 0;
        bVal = parseInt(b.poNumber) || 0;
        break;
      case "vendor":
        aVal = a.vendor?.name?.toLowerCase() || "";
        bVal = b.vendor?.name?.toLowerCase() || "";
        break;
      case "totalAmount":
        aVal = parseFloat(a.totalAmount) || 0;
        bVal = parseFloat(b.totalAmount) || 0;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  }) || [];

  // Handle edit
  const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setIsEditDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    deletePOMutation.mutate(id);
  };

  // Handle status update
  const handleStatusUpdate = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  // Calculate totals
  const totals = {
    total: filteredPOs.length,
    pending: filteredPOs.filter(po => po.status === 'PENDING').length,
    sent: filteredPOs.filter(po => po.status === 'SENT').length,
    received: filteredPOs.filter(po => po.status === 'RECEIVED').length,
    cancelled: filteredPOs.filter(po => po.status === 'CANCELLED').length,
    totalValue: filteredPOs.reduce((sum, po) => sum + (parseFloat(po.totalAmount) || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading purchase orders...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage vendor purchase orders and track delivery status
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
              <DialogDescription>
                Enter vendor details, select products, and create a new purchase order
              </DialogDescription>
            </DialogHeader>
            <PurchaseOrderForm
              onSubmit={(data) => createPOMutation.mutate(data)}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createPOMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
                <p className="text-lg font-bold">{totals.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <p className="text-lg font-bold">{totals.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sent</p>
                <p className="text-lg font-bold">{totals.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Received</p>
                <p className="text-lg font-bold">{totals.received}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Cancelled</p>
                <p className="text-lg font-bold">{totals.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Value</p>
                <p className="text-sm font-bold">{formatCurrency(totals.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by PO number, vendor name, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                type="text"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expectedDate">Expected Date</SelectItem>
                  <SelectItem value="orderDate">Order Date</SelectItem>
                  <SelectItem value="poNumber">PO Number</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="totalAmount">Total Amount</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-2"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            {filteredPOs.length} of {(purchaseOrders as any[])?.length || 0} purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPOs.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No purchase orders found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first purchase order to get started"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="py-2 text-xs">PO Number</TableHead>
                    <TableHead className="py-2 text-xs">Vendor</TableHead>
                    <TableHead className="py-2 text-xs">Order Date</TableHead>
                    <TableHead className="py-2 text-xs">Expected Date</TableHead>
                    <TableHead className="py-2 text-xs">Status</TableHead>
                    <TableHead className="py-2 text-xs">Total Amount</TableHead>
                    <TableHead className="py-2 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po: any, index: number) => (
                    <TableRow key={`po-${po.id}-${po.poNumber}-${index}`} className="h-10">
                      <TableCell className="font-medium py-1 text-sm">
                        {po.poNumber}
                      </TableCell>
                      <TableCell className="py-1">
                        <div>
                          <div className="font-medium text-sm">{po.vendor?.name || `Vendor ${po.vendorId}`}</div>
                          <div className="text-xs text-muted-foreground">{po.vendor?.code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-1 text-sm">
                        {po.orderDate && !isNaN(new Date(po.orderDate).getTime()) 
                          ? format(new Date(po.orderDate), "MMM dd, yyyy") 
                          : "Invalid date"}
                      </TableCell>
                      <TableCell className="py-1 text-sm">
                        {po.expectedDate && !isNaN(new Date(po.expectedDate).getTime()) 
                          ? format(new Date(po.expectedDate), "MMM dd, yyyy") 
                          : "Not set"}
                      </TableCell>
                      <TableCell className="py-1">
                        {getStatusBadge(po.status)}
                      </TableCell>
                      <TableCell className="font-medium py-1 text-sm">
                        {formatCurrency(parseFloat(po.totalAmount || "0"))}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex items-center gap-0.5">
                          <Link href={`/purchase-orders/view/${po.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(po)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>

                          {/* Status Quick Update */}
                          {po.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleStatusUpdate(po.id, 'SENT')}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}

                          {po.status === 'SENT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleStatusUpdate(po.id, 'RECEIVED')}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Delete Button (only for PENDING orders) */}
                          {po.status === 'PENDING' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete purchase order #{po.poNumber}? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(po.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order #{editingPO?.poNumber}</DialogTitle>
            <DialogDescription>
              Modify purchase order details and items
            </DialogDescription>
          </DialogHeader>
          {editingPO && (
            <PurchaseOrderForm
              purchaseOrder={editingPO}
              onSubmit={(data) => updatePOMutation.mutate({ id: editingPO.id, data })}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingPO(null);
              }}
              isLoading={updatePOMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}