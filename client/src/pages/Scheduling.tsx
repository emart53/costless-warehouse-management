import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertScheduleSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter
} from "lucide-react";

interface Schedule {
  id: number;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  assignedTo?: number;
  locationId?: number;
  scheduledFor: string;
  completedAt?: string;
  createdAt: string;
}

interface Location {
  id: number;
  code: string;
  name: string;
}

const scheduleFormSchema = insertScheduleSchema.extend({
  scheduledFor: z.string().min(1, "Scheduled date is required"),
});

const taskTypes = [
  { value: "inventory_count", label: "Inventory Count" },
  { value: "maintenance", label: "Maintenance" },
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
  { value: "cleaning", label: "Cleaning" },
  { value: "inspection", label: "Inspection" },
];

const priorities = [
  { value: "low", label: "Low", color: "bg-neutral-100 text-neutral-800" },
  { value: "medium", label: "Medium", color: "bg-primary-100 text-primary-800" },
  { value: "high", label: "High", color: "bg-warning-100 text-warning-800" },
  { value: "urgent", label: "Urgent", color: "bg-error-100 text-error-800" },
];

const statusConfig = {
  pending: { label: "Pending", color: "bg-warning-100 text-warning-800", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-primary-100 text-primary-800", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-success-100 text-success-800", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-error-100 text-error-800", icon: XCircle },
};

export default function Scheduling() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof scheduleFormSchema>) => {
      const scheduleData = {
        ...data,
        scheduledFor: new Date(data.scheduledFor),
      };
      const response = await apiRequest("POST", "/api/schedules", scheduleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsAddScheduleOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Task scheduled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Schedule> }) => {
      const response = await apiRequest("PATCH", `/api/schedules/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "inventory_count",
      priority: "medium",
      locationId: undefined,
      scheduledFor: "",
    },
  });

  const onSubmit = (data: z.infer<typeof scheduleFormSchema>) => {
    createScheduleMutation.mutate(data);
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || schedule.status === statusFilter;
    const matchesType = typeFilter === "all" || schedule.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const updateScheduleStatus = (id: number, status: string) => {
    updateScheduleMutation.mutate({ id, updates: { status } });
  };

  const getPriorityConfig = (priority: string) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const upcomingTasks = schedules.filter(s => 
    s.status === 'pending' && 
    new Date(s.scheduledFor) > new Date()
  ).length;

  const overdueTasks = schedules.filter(s => 
    s.status === 'pending' && 
    new Date(s.scheduledFor) < new Date()
  ).length;

  const completedTasks = schedules.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Task Scheduling</h1>
          <p className="text-neutral-600">Manage warehouse operations and tasks</p>
        </div>
        <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Task description and notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taskTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorities.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No specific location</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              <div>
                                <div className="font-medium">{location.code}</div>
                                <div className="text-sm text-muted-foreground">{location.name}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date & Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddScheduleOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createScheduleMutation.isPending}>
                    {createScheduleMutation.isPending ? "Scheduling..." : "Schedule Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks}</div>
            <p className="text-xs text-muted-foreground">Scheduled for future</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-error-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error-600">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-success-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-600">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title, description, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-3">Task</th>
                    <th className="text-left font-medium py-3">Type</th>
                    <th className="text-left font-medium py-3">Priority</th>
                    <th className="text-left font-medium py-3">Status</th>
                    <th className="text-left font-medium py-3">Scheduled For</th>
                    <th className="text-left font-medium py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((schedule) => {
                    const statusConfig = getStatusConfig(schedule.status);
                    const priorityConfig = getPriorityConfig(schedule.priority);
                    const StatusIcon = statusConfig.icon;
                    const isOverdue = schedule.status === 'pending' && new Date(schedule.scheduledFor) < new Date();

                    return (
                      <tr key={schedule.id} className="border-b hover:bg-muted/50">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">{schedule.title}</div>
                            {schedule.description && (
                              <div className="text-sm text-muted-foreground">{schedule.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline">
                            {taskTypes.find(t => t.value === schedule.type)?.label || schedule.type}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge className={priorityConfig.color}>
                            {priorityConfig.label}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className={`text-sm ${isOverdue ? 'text-error-600 font-medium' : ''}`}>
                            {format(parseISO(schedule.scheduledFor), 'MMM d, yyyy HH:mm')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(schedule.scheduledFor), { addSuffix: true })}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-1">
                            {schedule.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateScheduleStatus(schedule.id, 'in_progress')}
                              >
                                Start
                              </Button>
                            )}
                            {schedule.status === 'in_progress' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateScheduleStatus(schedule.id, 'completed')}
                              >
                                Complete
                              </Button>
                            )}
                            {(schedule.status === 'pending' || schedule.status === 'in_progress') && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateScheduleStatus(schedule.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredSchedules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No scheduled tasks found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
