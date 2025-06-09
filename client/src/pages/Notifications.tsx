import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  Check,
  Bookmark
} from "lucide-react";
import type { Notification } from "@/lib/types";

const notificationIcons = {
  low_stock: AlertTriangle,
  task_due: Bell,
  system: Info,
  alert: XCircle,
};

const severityStyles = {
  info: {
    bg: "bg-primary-50 border-primary-200",
    icon: "bg-primary-100 text-primary-600",
    text: "text-primary-900"
  },
  warning: {
    bg: "bg-warning-50 border-warning-200",
    icon: "bg-warning-100 text-warning-600",
    text: "text-warning-900"
  },
  error: {
    bg: "bg-error-50 border-error-200",
    icon: "bg-error-100 text-error-600",
    text: "text-error-900"
  },
  success: {
    bg: "bg-success-50 border-success-200",
    icon: "bg-success-100 text-success-600",
    text: "text-success-900"
  },
};

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allNotifications = [], isLoading: allLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadNotifications = [], isLoading: unreadLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications?unread=true"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "Notification marked as read",
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

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Mark all unread notifications as read
      const promises = unreadNotifications.map(notification =>
        apiRequest("PATCH", `/api/notifications/${notification.id}/read`)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
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

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info;
    const styles = severityStyles[notification.severity as keyof typeof severityStyles] || severityStyles.info;

    return (
      <Card className={`${notification.isRead ? 'opacity-75' : ''} ${styles.bg} border`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${styles.text}`}>
                    {notification.title}
                  </p>
                  <p className={`text-sm mt-1 ${styles.text.replace('900', '700')}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center mt-2 space-x-2">
                    <p className={`text-xs ${styles.text.replace('900', '600')}`}>
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {notification.type.replace('_', ' ')}
                    </Badge>
                    {!notification.isRead && (
                      <Badge variant="default" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                </div>
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                    disabled={markAsReadMutation.isPending}
                  >
                    <Check size={14} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const NotificationsList = ({ 
    notifications, 
    isLoading 
  }: { 
    notifications: Notification[]; 
    isLoading: boolean; 
  }) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No notifications
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "unread" 
                ? "You're all caught up! No unread notifications." 
                : "No notifications to display."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
      </div>
    );
  };

  const readNotifications = allNotifications.filter(n => n.isRead);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-neutral-600">Stay updated with system alerts and messages</p>
        </div>
        {unreadNotifications.length > 0 && (
          <Button 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allNotifications.length}</div>
            <p className="text-xs text-muted-foreground">All time notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bookmark className="h-4 w-4 text-warning-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">{unreadNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <CheckCircle className="h-4 w-4 text-success-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-600">{readNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Previously viewed</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All Notifications ({allNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({unreadNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({readNotifications.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <NotificationsList 
                notifications={allNotifications} 
                isLoading={allLoading} 
              />
            </TabsContent>
            
            <TabsContent value="unread" className="mt-6">
              <NotificationsList 
                notifications={unreadNotifications} 
                isLoading={unreadLoading} 
              />
            </TabsContent>
            
            <TabsContent value="read" className="mt-6">
              <NotificationsList 
                notifications={readNotifications} 
                isLoading={allLoading} 
              />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}
