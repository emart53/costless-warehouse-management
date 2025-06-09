import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Warehouse, 
  BarChart3, 
  Package, 
  ShoppingCart,
  Truck, 
  Calendar, 
  Bell, 
  FileText, 
  Settings,
  ClipboardList
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Products", href: "/products", icon: ShoppingCart },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
  { name: "Transfer Orders", href: "/transfer-orders", icon: Truck },
  { name: "Transactions", href: "/transactions", icon: Truck },
  { name: "Scheduling", href: "/scheduling", icon: Calendar },
  { name: "Notifications", href: "/notifications", icon: Bell, hasNotifications: true },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Maintenance", href: "/maintenance", icon: Settings },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["/api/notifications?unread=true"],
  });

  return (
    <aside className="w-60 bg-white shadow-lg border-r border-neutral-200 flex-shrink-0">
      <div className="p-6 border-b border-neutral-200">
        <h1 className="text-xl font-semibold text-neutral-900 flex items-center">
          <Warehouse className="text-primary mr-2" size={24} />
          WMS Pro
        </h1>
        <p className="text-sm text-neutral-600 mt-1">Warehouse Management</p>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          const notificationCount = item.hasNotifications ? unreadNotifications.length : 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "sidebar-link",
                isActive && "active"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-auto text-xs px-2 py-1 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center"
                >
                  {notificationCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
