import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

const pageConfig = {
  "/": { title: "Dashboard", subtitle: "Overview of warehouse operations" },
  "/inventory": { title: "Inventory", subtitle: "Manage products and stock levels" },
  "/products": { title: "Products", subtitle: "Manage product catalog and pricing" },
  "/purchase-orders": { title: "Purchase Orders", subtitle: "Manage vendor orders and deliveries" },
  "/transfer-orders": { title: "Transfer Orders", subtitle: "Manage store transfers and shipments" },
  "/transactions": { title: "Transactions", subtitle: "Track receipts, shipments, and adjustments" },
  "/scheduling": { title: "Scheduling", subtitle: "Manage warehouse tasks and operations" },
  "/notifications": { title: "Notifications", subtitle: "System alerts and messages" },
  "/reports": { title: "Reports", subtitle: "Generate and view warehouse reports" },
  "/settings": { title: "Settings", subtitle: "Configure system preferences" },
};

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const config = pageConfig[location as keyof typeof pageConfig] || { 
    title: "Warehouse Management", 
    subtitle: "System overview" 
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={config.title} subtitle={config.subtitle} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
