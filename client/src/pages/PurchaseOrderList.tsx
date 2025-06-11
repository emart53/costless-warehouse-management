import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Eye, Edit, Search, Filter, Package, Calendar, DollarSign, Truck, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { formatCurrency, formatNumber , formatCurrencyInput, parseCurrency } from "@/lib/formatNumber";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendor: {
    id: number;
    name: string;
    code: string;
  };
  orderDate: string;
  expectedDate: string;
  status: string;
  totalAmount: string;
  itemCount?: number;
  items?: Array<{
    id: number;
    quantityOrdered: number;
    listCost: number;
    offInvoice: number;
    billBack: number;
  }>;
}



const getStatusBadge = (status: string) => {
  const statusConfig = {
    'DRAFT': { color: 'bg-gray-100 text-gray-800', icon: Clock },
    'SUBMITTED': { color: 'bg-orange-100 text-orange-800', icon: Calendar },
    'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: Calendar },
    'SCHEDULED': { color: 'bg-blue-100 text-blue-800', icon: Calendar },
    'RECEIVED': { color: 'bg-green-100 text-green-800', icon: Package },
    'CANCELLED': { color: 'bg-red-100 text-red-800', icon: Package },
  };
  
  const normalizedStatus = status.toUpperCase();
  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.PENDING;
  
  return (
    <Badge className={`${config.color} border-0`}>
      {normalizedStatus}
    </Badge>
  );
};

export default function PurchaseOrderList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // Default to active orders
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: "",
    scheduledTime: "",
    deliveryDay: "",
    carrierName: "",
    carrierPhone: "",
    carrierContact: "",
    specialInstructions: "",
    totalCases: 0,
    totalPallets: 0,
    totalUnits: 0
  });
  
  const ITEMS_PER_PAGE = 20;
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      
      // Handle status filtering with "active" option
      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = po.status !== "Received" && po.status !== "Cancelled";
      } else if (statusFilter !== "all") {
        matchesStatus = po.status === statusFilter;
      }
      
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

  // Generate delivery time slots based on day of week
  const generateTimeSlots = (dayOfWeek: string) => {
    const slots = [];
    const startHour = 5; // 5:00 AM
    let endHour;
    
    if (dayOfWeek === 'Tuesday') {
      endHour = 13.5; // 1:30 PM
    } else if (dayOfWeek === 'Wednesday' || dayOfWeek === 'Friday') {
      endHour = 21; // 9:00 PM
    } else {
      // Exception days (Monday/Thursday)
      endHour = 17; // 5:00 PM
    }
    
    for (let hour = startHour; hour < endHour; hour += 0.5) {
      const timeStr = `${Math.floor(hour).toString().padStart(2, '0')}:${hour % 1 === 0 ? '00' : '30'}`;
      slots.push(timeStr);
    }
    
    return slots;
  };

  // Handle scheduling modal
  const handleScheduleDelivery = (po: PurchaseOrder) => {
    setSelectedPO(po);
    
    // Pre-populate form with PO data
    const expectedDate = po.expectedDate ? new Date(po.expectedDate) : addDays(new Date(), 3);
    const dayOfWeek = format(expectedDate, 'EEEE');
    
    setScheduleForm({
      scheduledDate: format(expectedDate, 'yyyy-MM-dd'),
      scheduledTime: "09:00",
      deliveryDay: dayOfWeek,
      carrierName: "",
      carrierPhone: "",
      carrierContact: "",
      specialInstructions: "",
      totalCases: po.items?.reduce((sum, item) => sum + item.quantityOrdered, 0) || 0,
      totalPallets: 0,
      totalUnits: po.items?.reduce((sum, item) => sum + item.quantityOrdered, 0) || 0
    });
    
    setIsScheduleModalOpen(true);
  };

  // Schedule delivery mutation
  const scheduleDeliveryMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      return apiRequest("POST", "/api/delivery-schedules", {
        purchaseOrderId: selectedPO?.id,
        vendorId: selectedPO?.vendor.id,
        ...scheduleData
      });
    },
    onSuccess: () => {
      toast({
        title: "Delivery Scheduled",
        description: `Delivery for ${selectedPO?.poNumber} has been scheduled successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsScheduleModalOpen(false);
      setSelectedPO(null);
    },
    onError: (error) => {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule delivery. Please try again.",
        variant: "destructive",
      });
    }
  });

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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Orders</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
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

            {(searchTerm || statusFilter !== "active" || vendorFilter !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("active");
                  setVendorFilter("all");
                  setCurrentPage(1);
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
                  <TableHead className="text-lg font-semibold">PO Number</TableHead>
                  <TableHead className="text-lg font-semibold">Vendor</TableHead>
                  <TableHead className="text-lg font-semibold">Order Date</TableHead>
                  <TableHead className="text-lg font-semibold">Expected Date</TableHead>
                  <TableHead className="text-lg font-semibold">Status</TableHead>
                  <TableHead className="text-right text-lg font-semibold">Total Amount</TableHead>
                  <TableHead className="text-center text-lg font-semibold">Actions</TableHead>
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
                    <TableRow key={po.id} className="hover:bg-gray-50 h-16">
                      <TableCell className="font-medium text-base py-4">
                        <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:underline">
                          {po.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-base py-4">
                        <div>
                          <div className="font-medium text-base">{po.vendor.name}</div>
                          <div className="text-sm text-gray-500">{po.vendor.code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-base py-4">{format(new Date(po.orderDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-base py-4">{po.expectedDate ? format(new Date(po.expectedDate), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell className="py-4">{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right font-medium text-base py-4">
                        {formatCurrency(po.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/purchase-orders/${po.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/purchase-orders/edit/${po.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                          </Link>
                          {po.status.toUpperCase() === "SUBMITTED" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => handleScheduleDelivery(po)}
                            >
                              <Calendar className="h-3 w-3" />
                              Schedule
                            </Button>
                          )}
                        </div>
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

      {/* Delivery Scheduling Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Delivery - {selectedPO?.poNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPO && (
            <div className="space-y-6">
              {/* PO Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm text-gray-600">Vendor</Label>
                  <p className="font-medium">{selectedPO.vendor.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Expected Date</Label>
                  <p className="font-medium">
                    {selectedPO.expectedDate ? format(new Date(selectedPO.expectedDate), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Total Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedPO.totalAmount)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Total Units</Label>
                  <p className="font-medium">{scheduleForm.totalUnits} units</p>
                </div>
              </div>

              {/* Scheduling Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledDate">Delivery Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      const dayOfWeek = format(date, 'EEEE');
                      setScheduleForm({
                        ...scheduleForm,
                        scheduledDate: e.target.value,
                        deliveryDay: dayOfWeek
                      });
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduledTime">Time Slot</Label>
                  <Select value={scheduleForm.scheduledTime} onValueChange={(value) => 
                    setScheduleForm({...scheduleForm, scheduledTime: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeSlots(scheduleForm.deliveryDay).map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="carrierName">Carrier Name</Label>
                  <Input
                    id="carrierName"
                    value={scheduleForm.carrierName}
                    onChange={(e) => setScheduleForm({...scheduleForm, carrierName: e.target.value})}
                    placeholder="Enter carrier company"
                  />
                </div>

                <div>
                  <Label htmlFor="carrierPhone">Carrier Phone</Label>
                  <Input
                    id="carrierPhone"
                    value={scheduleForm.carrierPhone}
                    onChange={(e) => setScheduleForm({...scheduleForm, carrierPhone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="carrierContact">Carrier Contact</Label>
                  <Input
                    id="carrierContact"
                    value={scheduleForm.carrierContact}
                    onChange={(e) => setScheduleForm({...scheduleForm, carrierContact: e.target.value})}
                    placeholder="Driver/Contact name"
                  />
                </div>

                <div>
                  <Label htmlFor="totalCases">Total Cases</Label>
                  <Input
                    id="totalCases"
                    type="number"
                    value={scheduleForm.totalCases}
                    onChange={(e) => setScheduleForm({...scheduleForm, totalCases: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  value={scheduleForm.specialInstructions}
                  onChange={(e) => setScheduleForm({...scheduleForm, specialInstructions: e.target.value})}
                  placeholder="Add any special delivery instructions..."
                  rows={3}
                />
              </div>

              {/* Delivery Window Info */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Delivery Windows</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Tuesday:</strong> 5:00 AM - 1:30 PM</p>
                  <p><strong>Wednesday & Friday:</strong> 5:00 AM - 9:00 PM</p>
                  <p><strong>Monday & Thursday:</strong> Emergency deliveries only (5:00 AM - 5:00 PM)</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => scheduleDeliveryMutation.mutate(scheduleForm)}
                  disabled={scheduleDeliveryMutation.isPending || !scheduleForm.scheduledDate || !scheduleForm.scheduledTime}
                >
                  {scheduleDeliveryMutation.isPending ? "Scheduling..." : "Schedule Delivery"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}