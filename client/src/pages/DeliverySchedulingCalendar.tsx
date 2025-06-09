import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Truck, 
  Phone, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  Package,
  Edit,
  Plus,
  Filter,
  Printer
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Utility function to format numbers with commas
const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Status configurations
const getStatusConfig = (status: string) => {
  const configs = {
    DRAFT: { color: "bg-gray-100 text-gray-800", icon: Package, label: "Draft" },
    PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
    SUBMITTED: { color: "bg-blue-100 text-blue-800", icon: Package, label: "Submitted" },
    CONFIRMED: { color: "bg-purple-100 text-purple-800", icon: CheckCircle, label: "Confirmed" },
    SCHEDULED: { color: "bg-green-100 text-green-800", icon: Calendar, label: "Scheduled" },
    ON_ROUTE: { color: "bg-orange-100 text-orange-800", icon: Truck, label: "On Route" },
    ARRIVED: { color: "bg-indigo-100 text-indigo-800", icon: MapPin, label: "Arrived" },
    RECEIVED: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle, label: "Received" },
    CANCELLED: { color: "bg-red-100 text-red-800", icon: AlertTriangle, label: "Cancelled" },
  };
  return configs[status as keyof typeof configs] || configs.PENDING;
};

// Time slot configurations
const TIME_SLOTS = [
  { value: "08:00-10:00", label: "8:00 AM - 10:00 AM", window: "morning" },
  { value: "10:00-12:00", label: "10:00 AM - 12:00 PM", window: "morning" },
  { value: "13:00-15:00", label: "1:00 PM - 3:00 PM", window: "afternoon" },
  { value: "15:00-17:00", label: "3:00 PM - 5:00 PM", window: "afternoon" },
  { value: "17:00-19:00", label: "5:00 PM - 7:00 PM", window: "evening" },
];

interface DeliverySchedule {
  id: number;
  poId: number;
  scheduledDate: string;
  scheduledTime?: string;
  timeSlot?: string;
  status: string;
  priority?: string;
  vendorContactName?: string;
  vendorContactPhone?: string;
  carrierName?: string;
  driverName?: string;
  driverPhone?: string;
  specialInstructions?: string;
  notes?: string;
  purchaseOrder: {
    id: number;
    poNumber: string;
    totalAmount: string;
    vendor: {
      name: string;
      code: string;
      phone?: string;
    };
  };
}

export default function DeliverySchedulingCalendar() {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<DeliverySchedule | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get week boundaries
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch delivery schedules for the current week
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/delivery-schedules", format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    enabled: true,
  });

  // Fetch unscheduled purchase orders (CONFIRMED status without delivery schedule)
  const { data: unscheduledPOs } = useQuery({
    queryKey: ["/api/purchase-orders/unscheduled"],
    enabled: true,
  });

  // Group schedules by date
  const schedulesByDate = (schedules as DeliverySchedule[] || []).reduce((acc, schedule) => {
    const date = format(parseISO(schedule.scheduledDate), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, DeliverySchedule[]>);

  // Filter schedules
  const filteredSchedules = (schedules as DeliverySchedule[] || []).filter(schedule => 
    statusFilter === "all" || schedule.status === statusFilter
  );

  // Navigation functions
  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  // Schedule delivery mutation
  const scheduleDeliveryMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      return await apiRequest("POST", "/api/delivery-schedules", scheduleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/unscheduled"] });
      setIsScheduleDialogOpen(false);
      toast({
        title: "Success",
        description: "Delivery scheduled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule delivery",
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest("PUT", `/api/delivery-schedules/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-schedules"] });
      setIsScheduleDialogOpen(false);
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading delivery schedule...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Schedule</h1>
          <p className="text-muted-foreground">
            Coordinate delivery schedules and warehouse operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Schedule
          </Button>
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedSchedule(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Delivery
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold ml-4">
                {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="ON_ROUTE">On Route</SelectItem>
                  <SelectItem value="ARRIVED">Arrived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const daySchedules = schedulesByDate[dayKey] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <Card key={dayKey} className={`min-h-[400px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center justify-between">
                    <span>{format(day, 'EEE dd')}</span>
                    {daySchedules.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {daySchedules.length}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {daySchedules
                  .filter(schedule => statusFilter === "all" || schedule.status === statusFilter)
                  .map((schedule) => {
                    const statusConfig = getStatusConfig(schedule.status);
                    const Icon = statusConfig.icon;
                    
                    return (
                      <div
                        key={schedule.id}
                        className="p-2 rounded-lg border border-gray-200 hover:shadow-sm cursor-pointer"
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setIsScheduleDialogOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            PO {schedule.purchaseOrder.poNumber}
                          </span>
                          <Badge className={`${statusConfig.color} text-xs`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {schedule.purchaseOrder.vendor.name}
                        </div>
                        {schedule.timeSlot && (
                          <div className="text-xs text-blue-600 font-medium">
                            {schedule.timeSlot}
                          </div>
                        )}
                        <div className="text-xs font-medium">
                          ${formatNumber(schedule.purchaseOrder.totalAmount)}
                        </div>
                        {schedule.priority === 'urgent' && (
                          <div className="text-xs text-red-600 font-medium">
                            URGENT
                          </div>
                        )}
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unscheduled Purchase Orders */}
      {unscheduledPOs && (unscheduledPOs as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Unscheduled Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(unscheduledPOs as any[]).map((po) => (
                <div key={po.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">PO {po.poNumber}</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Pre-populate with PO data
                        setSelectedSchedule({
                          id: 0,
                          poId: po.id,
                          scheduledDate: '',
                          status: 'SCHEDULED',
                          purchaseOrder: po,
                        } as DeliverySchedule);
                        setIsScheduleDialogOpen(true);
                      }}
                    >
                      Schedule
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {po.vendor?.name}
                  </div>
                  <div className="text-sm font-medium">
                    ${formatNumber(po.totalAmount || 0)}
                  </div>
                  {po.expectedDate && (
                    <div className="text-xs text-blue-600 mt-1">
                      Expected: {format(parseISO(po.expectedDate), 'MMM dd')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule?.id ? 'Update Delivery Schedule' : 'Schedule Delivery'}
            </DialogTitle>
          </DialogHeader>
          <ScheduleForm
            schedule={selectedSchedule}
            onSubmit={(data) => {
              if (selectedSchedule?.id) {
                updateScheduleMutation.mutate({ id: selectedSchedule.id, updates: data });
              } else {
                scheduleDeliveryMutation.mutate(data);
              }
            }}
            onCancel={() => setIsScheduleDialogOpen(false)}
            isLoading={scheduleDeliveryMutation.isPending || updateScheduleMutation.isPending}
            unscheduledPOs={unscheduledPOs as any[]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Schedule Form Component
interface ScheduleFormProps {
  schedule?: DeliverySchedule | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  unscheduledPOs: any[];
}

function ScheduleForm({ schedule, onSubmit, onCancel, isLoading, unscheduledPOs }: ScheduleFormProps) {
  const [formData, setFormData] = useState({
    poId: schedule?.poId || '',
    scheduledDate: schedule?.scheduledDate || '',
    timeSlot: schedule?.timeSlot || '',
    status: schedule?.status || 'SCHEDULED',
    priority: schedule?.priority || 'normal',
    vendorContactName: schedule?.vendorContactName || '',
    vendorContactPhone: schedule?.vendorContactPhone || '',
    carrierName: schedule?.carrierName || '',
    driverName: schedule?.driverName || '',
    driverPhone: schedule?.driverPhone || '',
    specialInstructions: schedule?.specialInstructions || '',
    notes: schedule?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="poId">Purchase Order</Label>
          <Select
            value={formData.poId.toString()}
            onValueChange={(value) => setFormData({ ...formData, poId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select PO" />
            </SelectTrigger>
            <SelectContent>
              {unscheduledPOs?.map((po) => (
                <SelectItem key={po.id} value={po.id.toString()}>
                  PO {po.poNumber} - {po.vendor?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="scheduledDate">Delivery Date</Label>
          <Input
            id="scheduledDate"
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="timeSlot">Time Slot</Label>
          <Select
            value={formData.timeSlot}
            onValueChange={(value) => setFormData({ ...formData, timeSlot: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select time slot" />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="vendorContactName">Vendor Contact</Label>
          <Input
            id="vendorContactName"
            value={formData.vendorContactName}
            onChange={(e) => setFormData({ ...formData, vendorContactName: e.target.value })}
            placeholder="Contact name"
          />
        </div>

        <div>
          <Label htmlFor="vendorContactPhone">Vendor Phone</Label>
          <Input
            id="vendorContactPhone"
            value={formData.vendorContactPhone}
            onChange={(e) => setFormData({ ...formData, vendorContactPhone: e.target.value })}
            placeholder="Phone number"
          />
        </div>

        <div>
          <Label htmlFor="carrierName">Carrier</Label>
          <Input
            id="carrierName"
            value={formData.carrierName}
            onChange={(e) => setFormData({ ...formData, carrierName: e.target.value })}
            placeholder="Shipping carrier"
          />
        </div>

        <div>
          <Label htmlFor="driverName">Driver Name</Label>
          <Input
            id="driverName"
            value={formData.driverName}
            onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
            placeholder="Driver name"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="specialInstructions">Special Instructions</Label>
        <Textarea
          id="specialInstructions"
          value={formData.specialInstructions}
          onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
          placeholder="Loading dock instructions, equipment needed, etc."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (schedule?.id ? 'Update Schedule' : 'Schedule Delivery')}
        </Button>
      </div>
    </form>
  );
}