import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Truck, Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DeliverySchedule {
  id: number;
  poId: number;
  scheduledDate: string;
  actualDeliveryDate?: string;
  deliveryWindow?: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
  trackingNumber?: string;
  carrierName?: string;
  notes?: string;
  purchaseOrder?: {
    poNumber: string;
    vendor?: {
      name: string;
    };
  };
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  delayed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  scheduled: Clock,
  in_transit: Truck,
  delivered: CheckCircle,
  delayed: AlertCircle,
  cancelled: XCircle
};

export default function DeliveryScheduling() {
  const [selectedDate, setSelectedDate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DeliverySchedule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch delivery schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['/api/delivery-schedules', selectedDate],
    queryFn: () => {
      const params = selectedDate ? `?date=${selectedDate}` : '';
      return fetch(`/api/delivery-schedules${params}`).then(res => res.json());
    }
  });

  // Fetch purchase orders for scheduling
  const { data: purchaseOrders } = useQuery({
    queryKey: ['/api/purchase-orders'],
    queryFn: () => fetch('/api/purchase-orders?status=sent').then(res => res.json())
  });

  // Create/update schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = editingSchedule ? 'PUT' : 'POST';
      const url = editingSchedule 
        ? `/api/delivery-schedules/${editingSchedule.id}`
        : '/api/delivery-schedules';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save delivery schedule');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingSchedule ? "Schedule updated" : "Schedule created"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-schedules'] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const scheduleData = {
      poId: parseInt(formData.get('poId') as string),
      scheduledDate: formData.get('scheduledDate') as string,
      deliveryWindow: formData.get('deliveryWindow') as string,
      status: formData.get('status') as string || 'scheduled',
      trackingNumber: formData.get('trackingNumber') as string,
      carrierName: formData.get('carrierName') as string,
      notes: formData.get('notes') as string,
      actualDeliveryDate: formData.get('actualDeliveryDate') as string || null
    };

    scheduleMutation.mutate(scheduleData);
  };

  const openEditDialog = (schedule: DeliverySchedule) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSchedule(null);
    setIsDialogOpen(true);
  };

  const getUpcomingDeliveries = () => {
    if (!schedules) return [];
    const today = new Date().toISOString().split('T')[0];
    return schedules.filter((s: DeliverySchedule) => 
      s.scheduledDate >= today && s.status !== 'delivered' && s.status !== 'cancelled'
    );
  };

  const getOverdueDeliveries = () => {
    if (!schedules) return [];
    const today = new Date().toISOString().split('T')[0];
    return schedules.filter((s: DeliverySchedule) => 
      s.scheduledDate < today && s.status !== 'delivered' && s.status !== 'cancelled'
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const upcomingDeliveries = getUpcomingDeliveries();
  const overdueDeliveries = getOverdueDeliveries();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Delivery Scheduling</h1>
        <Button onClick={openCreateDialog}>
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Delivery
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules?.filter((s: DeliverySchedule) => s.status === 'in_transit').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently shipping</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <div className="flex items-center space-x-4">
        <Label htmlFor="dateFilter">Filter by date:</Label>
        <Input
          id="dateFilter"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-48"
        />
        {selectedDate && (
          <Button variant="outline" onClick={() => setSelectedDate('')}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* Overdue Deliveries */}
      {overdueDeliveries.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Overdue Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueDeliveries.map((schedule: DeliverySchedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <span className="font-medium">PO {schedule.purchaseOrder?.poNumber}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {schedule.purchaseOrder?.vendor?.name}
                    </span>
                    <div className="text-sm text-red-600">
                      Due: {new Date(schedule.scheduledDate).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openEditDialog(schedule)}
                  >
                    Update
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules?.map((schedule: DeliverySchedule) => {
              const StatusIcon = statusIcons[schedule.status];
              return (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <StatusIcon className="w-5 h-5" />
                    <div>
                      <div className="font-medium">
                        PO {schedule.purchaseOrder?.poNumber}
                      </div>
                      <div className="text-sm text-gray-600">
                        {schedule.purchaseOrder?.vendor?.name}
                      </div>
                      <div className="text-sm">
                        Scheduled: {new Date(schedule.scheduledDate).toLocaleDateString()}
                        {schedule.deliveryWindow && (
                          <span className="ml-2 text-gray-500">
                            ({schedule.deliveryWindow})
                          </span>
                        )}
                      </div>
                      {schedule.actualDeliveryDate && (
                        <div className="text-sm text-green-600">
                          Delivered: {new Date(schedule.actualDeliveryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={statusColors[schedule.status]}>
                      {schedule.status.replace('_', ' ')}
                    </Badge>
                    {schedule.trackingNumber && (
                      <span className="text-sm text-gray-600">
                        {schedule.trackingNumber}
                      </span>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openEditDialog(schedule)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Update Delivery Schedule' : 'Schedule New Delivery'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingSchedule && (
              <div>
                <Label htmlFor="poId">Purchase Order</Label>
                <Select name="poId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders?.map((po: any) => (
                      <SelectItem key={po.id} value={po.id.toString()}>
                        PO {po.poNumber} - {po.vendor?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  name="scheduledDate"
                  type="date"
                  defaultValue={editingSchedule?.scheduledDate}
                  required
                />
              </div>
              <div>
                <Label htmlFor="deliveryWindow">Delivery Window</Label>
                <Select name="deliveryWindow" defaultValue={editingSchedule?.deliveryWindow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (8-12 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-5 PM)</SelectItem>
                    <SelectItem value="all_day">All Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingSchedule?.status || 'scheduled'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="actualDeliveryDate">Actual Delivery Date</Label>
                <Input
                  name="actualDeliveryDate"
                  type="date"
                  defaultValue={editingSchedule?.actualDeliveryDate}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="carrierName">Carrier</Label>
                <Input
                  name="carrierName"
                  placeholder="UPS, FedEx, etc."
                  defaultValue={editingSchedule?.carrierName}
                />
              </div>
              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  name="trackingNumber"
                  placeholder="Tracking number"
                  defaultValue={editingSchedule?.trackingNumber}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                name="notes"
                placeholder="Additional notes..."
                defaultValue={editingSchedule?.notes}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={scheduleMutation.isPending}>
                {scheduleMutation.isPending ? 'Saving...' : (editingSchedule ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}