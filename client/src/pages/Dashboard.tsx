import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Plus,
  ArrowUpDown,
  CalendarPlus,
  FileText,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardMetrics {
  totalInventory: number;
  lowStockItems: number;
  todaysTransactions: number;
  scheduledTasks: number;
  tasksCompleted: number;
}

interface Transaction {
  id: number;
  type: string;
  quantity: number;
  createdAt: string;
  product: {
    name: string;
    sku: string;
  };
  location: {
    code: string;
  };
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
}

const actionTypeStyles = {
  receipt: "bg-success-50 text-success-800 border-success-200",
  shipment: "bg-error-50 text-error-800 border-error-200",
  adjustment: "bg-warning-50 text-warning-800 border-warning-200",
};

const notificationStyles = {
  error: "bg-error-50 border-error-200",
  warning: "bg-warning-50 border-warning-200",
  info: "bg-primary-50 border-primary-200",
  success: "bg-success-50 border-success-200",
};

const notificationIconStyles = {
  error: "bg-error-100 text-error-600",
  warning: "bg-warning-100 text-warning-600",
  info: "bg-primary-100 text-primary-600",
  success: "bg-success-100 text-success-600",
};

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: recentTransactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions?limit=5"],
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications?unread=true"],
  });

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    iconStyle, 
    isLoading 
  }: {
    title: string;
    value: number | string;
    change?: string;
    icon: any;
    iconStyle: string;
    isLoading: boolean;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
            )}
            {change && !isLoading && (
              <p className="text-sm text-success-600 mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                {change}
              </p>
            )}
          </div>
          <div className={`icon-wrapper ${iconStyle}`}>
            <Icon className="text-xl" size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Inventory"
          value={metrics?.totalInventory?.toLocaleString() || 0}
          change="+2.3%"
          icon={Package}
          iconStyle="primary"
          isLoading={metricsLoading}
        />
        <MetricCard
          title="Low Stock Items"
          value={metrics?.lowStockItems || 0}
          icon={AlertTriangle}
          iconStyle="warning"
          isLoading={metricsLoading}
        />
        <MetricCard
          title="Today's Transactions"
          value={metrics?.todaysTransactions || 0}
          change="+15.2%"
          icon={ArrowUpDown}
          iconStyle="success"
          isLoading={metricsLoading}
        />
        <MetricCard
          title="Scheduled Tasks"
          value={metrics?.scheduledTasks || 0}
          icon={Calendar}
          iconStyle="neutral"
          isLoading={metricsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Inventory Activity */}
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Recent Inventory Activity</h3>
              <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                View All
                <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <CardContent className="p-6">
            {transactionsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-neutral-600">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">SKU</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Quantity</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="text-sm border-b border-neutral-100 last:border-b-0">
                        <td className="py-3 font-medium text-neutral-900">{transaction.product.name}</td>
                        <td className="py-3 text-neutral-600">{transaction.product.sku}</td>
                        <td className="py-3">
                          <Badge 
                            variant="outline" 
                            className={actionTypeStyles[transaction.type as keyof typeof actionTypeStyles]}
                          >
                            {transaction.type}
                          </Badge>
                        </td>
                        <td className="py-3 text-neutral-900">
                          {transaction.type === 'shipment' ? '-' : '+'}{transaction.quantity}
                        </td>
                        <td className="py-3 text-neutral-600">{transaction.location.code}</td>
                        <td className="py-3 text-neutral-600">
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

        {/* Notifications Panel */}
        <Card>
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Notifications</h3>
          </div>
          <CardContent className="p-6">
            {notificationsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-neutral-500 text-center py-8">No new notifications</p>
            ) : (
              <div className="space-y-4">
                {notifications.slice(0, 3).map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${notificationStyles[notification.severity as keyof typeof notificationStyles]}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notificationIconStyles[notification.severity as keyof typeof notificationIconStyles]}`}>
                      <AlertTriangle size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{notification.title}</p>
                      <p className="text-sm text-neutral-700 mt-1">{notification.message}</p>
                      <p className="text-xs text-neutral-600 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {notifications.length > 3 && (
              <div className="pt-4 border-t border-neutral-200 mt-4">
                <Button variant="ghost" size="sm" className="w-full text-primary-600 hover:text-primary-700">
                  View All Notifications
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <div className="icon-wrapper primary mb-2">
                <Plus size={20} />
              </div>
              <span className="text-sm font-medium">Add Inventory</span>
            </Button>
            
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <div className="icon-wrapper success mb-2">
                <ArrowUpDown size={20} />
              </div>
              <span className="text-sm font-medium">Record Transaction</span>
            </Button>
            
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <div className="icon-wrapper warning mb-2">
                <CalendarPlus size={20} />
              </div>
              <span className="text-sm font-medium">Schedule Task</span>
            </Button>
            
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <div className="icon-wrapper neutral mb-2">
                <FileText size={20} />
              </div>
              <span className="text-sm font-medium">Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
