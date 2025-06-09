// Shared types for the warehouse management system

export interface DashboardMetrics {
  totalInventory: number;
  lowStockItems: number;
  todaysTransactions: number;
  scheduledTasks: number;
  tasksCompleted: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  minStockLevel: number;
  maxStockLevel?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  position?: string;
  capacity?: number;
  isActive: boolean;
}

export interface InventoryItem {
  id: number;
  quantity: number;
  reservedQuantity: number;
  lastUpdated: string;
  product: Product;
  location: Location;
}

export interface Transaction {
  id: number;
  type: string;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  product: Product;
  location: Location;
}

export interface Schedule {
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

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  userId?: number;
  relatedId?: number;
  relatedType?: string;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt: string;
}

export interface ReportData {
  inventorySummary: {
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    categories: Array<{
      category: string;
      itemCount: number;
      totalQuantity: number;
    }>;
  };
  transactionSummary: {
    totalTransactions: number;
    receipts: number;
    shipments: number;
    adjustments: number;
    recentActivity: Transaction[];
  };
  locationUtilization: Array<{
    location: Location;
    itemCount: number;
    utilization: number;
  }>;
}

// Form types
export interface ProductFormData {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  minStockLevel: number;
  maxStockLevel?: number;
}

export interface TransactionFormData {
  type: string;
  productId: number;
  locationId: number;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface ScheduleFormData {
  title: string;
  description?: string;
  type: string;
  priority: string;
  locationId?: number;
  scheduledFor: string;
}

export interface LocationFormData {
  code: string;
  name: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  position?: string;
  capacity?: number;
}

// Filter and search types
export interface InventoryFilters {
  search: string;
  category: string;
  status: string;
  location: string;
}

export interface TransactionFilters {
  search: string;
  type: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

export interface ScheduleFilters {
  search: string;
  type: string;
  status: string;
  priority: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Chart and report types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
}

export interface ReportConfig {
  type: 'inventory' | 'transactions' | 'locations' | 'schedules';
  dateRange: {
    from: Date;
    to: Date;
  };
  filters: Record<string, any>;
  format: 'table' | 'chart' | 'export';
}
