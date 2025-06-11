import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Clock, Truck, Package, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DeliverySchedule {
  id: number;
  purchaseOrderId: number;
  scheduledDate: string;
  scheduledTime: string;
  deliveryDay: string;
  deliveryDuration: string;
  carrierName: string;
  carrierPhone: string;
  carrierContact: string;
  specialInstructions: string;
  totalCases: number;
  totalPallets: number;
  totalUnits: number;
  purchaseOrder?: {
    poNumber: string;
    vendor: {
      name: string;
    };
    totalAmount: string;
  };
}

export default function DeliveryCalendar() {
  // Start with June 2025 to show the scheduled deliveries
  const [currentDate, setCurrentDate] = useState(new Date(2025, 5, 1)); // June 2025
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<DeliverySchedule | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    deliveryDuration: '30 minutes',
    carrierName: '',
    carrierPhone: '',
    specialInstructions: ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for updating delivery schedules
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return apiRequest(`/api/delivery-schedules/${data.id}`, 'PATCH', data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-schedules"] });
      queryClient.refetchQueries({ queryKey: ["/api/delivery-schedules"] });
      setIsEditModalOpen(false);
      setSelectedSchedule(null);
      toast({
        title: "Schedule Updated",
        description: "Delivery schedule has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update delivery schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch delivery schedules
  const { data: deliverySchedules = [], isLoading } = useQuery<DeliverySchedule[]>({
    queryKey: ["/api/delivery-schedules"],
    staleTime: 0,
    cacheTime: 0,
  });

  // Fetch purchase orders to get vendor and PO details
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["/api/purchase-orders"],
    staleTime: 30000,
  });

  // Merge delivery schedules with purchase order details
  const enrichedSchedules = deliverySchedules.map(schedule => {
    const po = purchaseOrders.find((po: any) => po.id === schedule.purchaseOrderId);
    return {
      ...schedule,
      purchaseOrder: po
    };
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group schedules by date
  const schedulesByDate = enrichedSchedules.reduce((acc, schedule) => {
    const dateKey = format(new Date(schedule.scheduledDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(schedule);
    return acc;
  }, {} as Record<string, DeliverySchedule[]>);



  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return schedulesByDate[dateKey] || [];
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const daySchedules = getSchedulesForDate(date);
    if (daySchedules.length === 1) {
      setSelectedSchedule(daySchedules[0]);
      setIsDetailModalOpen(true);
    }
  };

  const handleScheduleClick = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
  };

  const handleEditSchedule = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setEditFormData({
      scheduledDate: format(new Date(schedule.scheduledDate), 'yyyy-MM-dd'),
      scheduledTime: schedule.scheduledTime,
      deliveryDuration: schedule.deliveryDuration,
      carrierName: schedule.carrierName || '',
      carrierPhone: schedule.carrierPhone || '',
      specialInstructions: schedule.specialInstructions || ''
    });
    setIsDetailModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!selectedSchedule) return;

    const updates = {
      scheduledDate: editFormData.scheduledDate,
      scheduledTime: editFormData.scheduledTime,
      timeSlotDuration: editFormData.deliveryDuration === '60 minutes' ? '60' : '30',
      carrierName: editFormData.carrierName,
      driverPhone: editFormData.carrierPhone,
      specialInstructions: editFormData.specialInstructions,
      deliveryDay: format(new Date(editFormData.scheduledDate), 'EEEE')
    };

    updateScheduleMutation.mutate({
      id: selectedSchedule.id,
      updates
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading delivery calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Delivery Schedule Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[200px] text-center font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map(day => {
              const daySchedules = getSchedulesForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[100px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50
                    ${!isCurrentMonth ? 'text-gray-400 bg-gray-50' : ''}
                    ${isToday ? 'bg-blue-50 border-blue-200' : ''}
                  `}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Delivery schedules for this day */}
                  <div className="space-y-1 mt-1">
                    {daySchedules.slice(0, 2).map(schedule => (
                      <div
                        key={schedule.id}
                        className="text-xs p-1 bg-green-100 text-green-800 rounded cursor-pointer hover:bg-green-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScheduleClick(schedule);
                        }}
                      >
                        <div className="font-medium">{schedule.scheduledTime}</div>
                        <div className="truncate">
                          {schedule.purchaseOrder?.poNumber || `PO-${schedule.purchaseOrderId}`}
                        </div>
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{daySchedules.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Schedule Details
              </div>
              {selectedSchedule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSchedule(selectedSchedule)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSchedule && (
            <div className="space-y-6">
              {/* Schedule Overview */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Purchase Order</div>
                  <div className="font-medium">
                    {selectedSchedule.purchaseOrder?.poNumber || `PO-${selectedSchedule.purchaseOrderId}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Vendor</div>
                  <div className="font-medium">
                    {selectedSchedule.purchaseOrder?.vendor?.name || 'Unknown Vendor'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Scheduled Date & Time</div>
                  <div className="font-medium">
                    {format(new Date(selectedSchedule.scheduledDate), 'MMM dd, yyyy')} at {selectedSchedule.scheduledTime}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Duration</div>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedSchedule.deliveryDuration === "60" ? "1 hour" : "30 minutes"}
                  </div>
                </div>
              </div>

              {/* Order Information */}
              {selectedSchedule.purchaseOrder && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-2">Order Information</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-blue-600">Total Amount</div>
                      <div className="font-medium text-blue-900">
                        {formatCurrency(selectedSchedule.purchaseOrder.totalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600">Order Size</div>
                      <div className="font-medium text-blue-900 flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {selectedSchedule.totalCases} cases
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Carrier Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Carrier</div>
                  <div className="font-medium">{selectedSchedule.carrierName || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Contact</div>
                  <div className="font-medium">{selectedSchedule.carrierContact || 'Not specified'}</div>
                </div>
                {selectedSchedule.carrierPhone && (
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <div className="font-medium">{selectedSchedule.carrierPhone}</div>
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              {selectedSchedule.specialInstructions && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Special Instructions</div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    {selectedSchedule.specialInstructions}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Reschedule Delivery
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Purchase Order Info */}
            {selectedSchedule && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  {selectedSchedule.purchaseOrder?.poNumber || `PO-${selectedSchedule.purchaseOrderId}`}
                </div>
                <div className="text-sm text-blue-600">
                  {selectedSchedule.purchaseOrder?.vendor?.name || 'Unknown Vendor'}
                </div>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledDate">Delivery Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={editFormData.scheduledDate}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="scheduledTime">Delivery Time</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={editFormData.scheduledTime}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="deliveryDuration">Duration</Label>
              <select
                id="deliveryDuration"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={editFormData.deliveryDuration}
                onChange={(e) => setEditFormData(prev => ({ ...prev, deliveryDuration: e.target.value }))}
              >
                <option value="30 minutes">30 minutes</option>
                <option value="60 minutes">1 hour</option>
              </select>
            </div>

            {/* Carrier Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="carrierName">Carrier Name</Label>
                <Input
                  id="carrierName"
                  value={editFormData.carrierName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, carrierName: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="carrierPhone">Carrier Phone</Label>
                <Input
                  id="carrierPhone"
                  value={editFormData.carrierPhone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, carrierPhone: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <textarea
                id="specialInstructions"
                className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]"
                value={editFormData.specialInstructions}
                onChange={(e) => setEditFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                placeholder="Optional delivery instructions..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSchedule}
                disabled={updateScheduleMutation.isPending}
              >
                {updateScheduleMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}