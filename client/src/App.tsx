import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Products from "@/pages/ProductsEnhanced";
import ProductEdit from "@/pages/ProductEdit";
import Transactions from "@/pages/Transactions";
import PurchaseOrdersNew from "@/pages/PurchaseOrdersNew";
import PurchaseOrdersEnhanced from "@/pages/PurchaseOrdersEnhanced";
import PurchaseOrderList from "@/pages/PurchaseOrderList";
import PurchaseOrderEdit from "@/pages/PurchaseOrderEdit";
import PurchaseOrderView from "@/pages/PurchaseOrderView";
import PurchaseOrderViewNew from "@/pages/PurchaseOrderViewNew";
import PurchaseOrderViewLegacy from "@/pages/PurchaseOrderViewLegacy";
import PurchaseOrderViewAuthentic from "@/pages/PurchaseOrderViewAuthentic";
import PurchaseOrderViewCSV from "@/pages/PurchaseOrderViewCSV";
import PurchaseOrderDashboard from "@/pages/PurchaseOrderDashboard";
import PurchaseOrderEditor from "@/pages/PurchaseOrderEditor";
import CreatePurchaseOrder from "@/pages/CreatePurchaseOrder";
import VendorProductLookup from "@/pages/VendorProductLookup";
import AuthenticDataTest from "@/pages/AuthenticDataTest";
import TransferOrders from "@/pages/TransferOrders";
import TransferOrderView from "@/pages/TransferOrderView";
import Scheduling from "@/pages/Scheduling";
import DeliveryScheduling from "@/pages/DeliveryScheduling";
import DeliverySchedulingCalendar from "@/pages/DeliverySchedulingCalendar";
import Notifications from "@/pages/Notifications";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import Maintenance from "@/pages/Maintenance";
import ConfigurationManager from "@/pages/ConfigurationManager";
import RollupDashboard from "@/pages/RollupDashboard";
import RollupDashboardEnhanced from "@/pages/RollupDashboardEnhanced";
import ComprehensiveRollupDashboard from "@/pages/ComprehensiveRollupDashboard";
import ComprehensiveProductEditPage from "@/pages/ComprehensiveProductEditPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/products" component={Products} />
        <Route path="/products/edit/:id" component={ProductEdit} />
        <Route path="/products/comprehensive/:id" component={ComprehensiveProductEditPage} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/purchase-orders" component={PurchaseOrderList} />
        <Route path="/purchase-orders/create" component={CreatePurchaseOrder} />
        <Route path="/purchase-orders/new" component={PurchaseOrdersNew} />
        <Route path="/purchase-orders/dashboard" component={PurchaseOrderDashboard} />
        <Route path="/purchase-orders/edit/:id" component={PurchaseOrderEdit} />
        <Route path="/purchase-orders/:id" component={PurchaseOrderView} />
        <Route path="/purchase-orders/view/:id" component={PurchaseOrderViewLegacy} />
        <Route path="/purchase-orders/authentic/:id" component={PurchaseOrderViewAuthentic} />
        <Route path="/purchase-orders/csv/:id" component={PurchaseOrderViewCSV} />
        <Route path="/purchase-orders/simple" component={PurchaseOrderEditor} />
        <Route path="/vendors-products" component={VendorProductLookup} />
        <Route path="/test-authentic" component={AuthenticDataTest} />
        <Route path="/transfer-orders" component={TransferOrders} />
        <Route path="/transfer-orders/:id" component={TransferOrderView} />
        <Route path="/scheduling" component={Scheduling} />
        <Route path="/delivery-scheduling" component={DeliveryScheduling} />
        <Route path="/delivery-calendar" component={DeliverySchedulingCalendar} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/configurations" component={ConfigurationManager} />
        <Route path="/admin" component={Admin} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/rollup" component={RollupDashboardEnhanced} />
        <Route path="/rollup-dashboard" component={RollupDashboardEnhanced} />
        <Route path="/comprehensive-rollup" component={ComprehensiveRollupDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
