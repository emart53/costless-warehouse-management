import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  ClipboardList,
  ChevronDown,
  ChevronRight,
  CalendarDays
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Products", href: "/products", icon: ShoppingCart },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
  { name: "Transfer Orders", href: "/transfer-orders", icon: Truck },
  { name: "Transactions", href: "/transactions", icon: Truck },
  { 
    name: "Scheduling", 
    href: "/scheduling", 
    icon: Calendar,
    submenu: [
      { name: "Task Scheduling", href: "/scheduling", icon: Calendar },
      { name: "Delivery Calendar", href: "/delivery-calendar", icon: CalendarDays }
    ]
  },
  { name: "Notifications", href: "/notifications", icon: Bell, hasNotifications: true },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Maintenance", href: "/maintenance", icon: Settings },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["/api/notifications?unread=true"],
  });

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const isSchedulingActive = location === "/scheduling" || location === "/delivery-calendar";

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
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = expandedSections.includes(item.name) || (item.name === "Scheduling" && isSchedulingActive);

          if (hasSubmenu) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleSection(item.name)}
                  className={cn(
                    "sidebar-link w-full justify-between",
                    isSchedulingActive && "active"
                  )}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.submenu.map((subitem) => {
                      const isSubActive = location === subitem.href;
                      const SubIcon = subitem.icon;
                      
                      return (
                        <Link
                          key={subitem.name}
                          href={subitem.href}
                          className={cn(
                            "sidebar-link text-sm",
                            isSubActive && "active"
                          )}
                        >
                          <SubIcon className="w-4 h-4 mr-3" />
                          {subitem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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
