import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors - suppliers of products
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  paymentTerms: text("payment_terms"), // e.g., "Net 30", "COD"
  discountPercent: decimal("discount_percent", { precision: 5, scale: 4 }), // 0.02 = 2%
  epDays: integer("ep_days"), // Early payment days
  netDays: integer("net_days"), // Net payment days
  leadTime: integer("lead_time"), // Expected delivery days
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stores - retail locations that receive transfers
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  storeNumber: varchar("store_number", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  managerId: integer("manager_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Departments - for product organization and transfer filtering
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("department_name", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories - for product categorization within departments
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("category_name", { length: 100 }).notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Warehouse and non-store locations (preserving legacy address data)
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  locationType: text("location_type"), // 'Warehouse', 'Accounting', etc.
  
  // Address information (preserved from legacy system)
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  fax: text("fax"),
  
  // Warehouse-specific fields
  zone: text("zone"),
  aisle: text("aisle"),
  shelf: text("shelf"),
  position: text("position"),
  capacity: integer("capacity"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table matching legacy data structure
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().unique(), // Legacy ProductId
  name: text("name").notNull(), // Primary product name/description field
  productDescription: text("product_description"), // Legacy field for compatibility
  caseUpc: varchar("case_upc", { length: 20 }), // Increased for legacy UPCs
  casePack: integer("case_pack").notNull(),
  size: text("size"), // No limit for legacy size variations
  discontinuedDate: date("discontinued_date"),
  status: text("status").notNull().default("Active"), // Extended for granular status
  categoryId: integer("category_id").references(() => categories.id),
  departmentId: integer("department_id").references(() => departments.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  
  // Additional fields from actual database
  sku: varchar("sku", { length: 50 }),
  upc: varchar("upc", { length: 20 }),
  unit: text("unit"),
  unitSize: text("unit_size"),
  minStockLevel: integer("min_stock_level"),
  maxStockLevel: integer("max_stock_level"),
  reorderPoint: integer("reorder_point"),
  preferredVendorId: integer("preferred_vendor_id"),
  lastCost: decimal("last_cost", { precision: 10, scale: 4 }),
  avgCost: decimal("avg_cost", { precision: 10, scale: 4 }),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 4 }),
  offInvoice: decimal("off_invoice", { precision: 10, scale: 4 }),
  crv: decimal("crv", { precision: 10, scale: 4 }),
  purchaseWeight: decimal("purchase_weight", { precision: 10, scale: 4 }),
  billBack: decimal("bill_back", { precision: 10, scale: 4 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Pricing Table - handles time dimension for historical and future pricing
export const productPricing = pgTable("product_pricing", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  
  // Time dimension
  effectiveDate: date("effective_date").notNull(),
  expirationDate: date("expiration_date"), // null means open-ended
  
  // Cost structure
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 4 }).notNull(),
  transferCost: decimal("transfer_cost", { precision: 10, scale: 4 }),
  retailPrice: decimal("retail_price", { precision: 10, scale: 4 }),
  
  // Allowances (can change over time with vendor agreements)
  offInvoice: decimal("off_invoice", { precision: 10, scale: 4 }).default("0"),
  billBack: decimal("bill_back", { precision: 10, scale: 4 }).default("0"),
  
  // Promotional pricing
  isPromotional: boolean("is_promotional").default(false),
  promotionDescription: text("promotion_description"),
  
  // Contract/agreement reference
  contractReference: text("contract_reference"),
  
  // Audit fields
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Ensure no overlapping date ranges for same product/vendor
}, (table) => ({
  // Index for efficient date range queries
  productDateIdx: index("product_pricing_product_date_idx").on(table.productId, table.effectiveDate),
  vendorDateIdx: index("product_pricing_vendor_date_idx").on(table.vendorId, table.effectiveDate),
}));

// Configuration tables for standardized input values
export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  configurationName: text("configuration_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const unitTypes = pgTable("unit_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

export const orderStatuses = pgTable("order_statuses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  statusType: text("status_type").notNull(), // 'purchase_order', 'transfer_order', 'general'
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const adjustmentReasons = pgTable("adjustment_reasons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  requiresApproval: boolean("requires_approval").default(false),
  isActive: boolean("is_active").default(true),
});

export const paymentTerms = pgTable("payment_terms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  netDays: integer("net_days").notNull(),
  discountDays: integer("discount_days"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

// Purchase Orders to vendors
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: varchar("po_number", { length: 20 }).notNull().unique(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  orderDate: date("order_date").notNull(),
  expectedDate: date("expected_date"),
  receivedDate: date("received_date"),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'partial', 'received', 'cancelled'
  
  // Shipping and diverting support
  orderType: text("order_type").notNull().default("normal"), // 'normal', 'divert', 'split'
  defaultShipToStoreId: integer("default_ship_to_store_id").references(() => stores.id),
  isDivertOrder: boolean("is_divert_order").default(false),
  divertCustomerId: integer("divert_customer_id").references(() => vendors.id), // Reusing vendors table for customers
  
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }),
  lumpSumAllowance: decimal("lump_sum_allowance", { precision: 10, scale: 2 }),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  specialInstructions: text("special_instructions"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase Order Line Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").default(0),
  listCost: decimal("list_cost", { precision: 10, scale: 4 }).notNull(),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  
  // Purchase configuration (case/pallet/bin/layer etc.)
  purchaseCfg: integer("purchase_cfg").references(() => configurations.id),
  
  // Financial allowances from CSV data
  offInvoice: decimal("off_invoice", { precision: 10, scale: 4 }).default("0"),
  billBack: decimal("bill_back", { precision: 10, scale: 4 }).default("0"),
  purchaseCrv: decimal("purchase_crv", { precision: 10, scale: 4 }).default("0"),
  purchaseWeight: decimal("purchase_weight", { precision: 10, scale: 4 }),
  purchaseCaseQty: integer("purchase_case_qty"),
  netCost: decimal("net_cost", { precision: 12, scale: 4 }),
  
  // Diverting support
  shipToStoreId: integer("ship_to_store_id").references(() => stores.id),
  isDiverted: boolean("is_diverted").default(false),
  divertCustomerId: integer("divert_customer_id").references(() => vendors.id),
  divertQuantity: integer("divert_quantity").default(0),
  warehouseQuantity: integer("warehouse_quantity").default(0),
  
  notes: text("notes"),
});

// Delivery Schedules for Purchase Orders
export const deliverySchedules = pgTable("delivery_schedules", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrders.id),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time"), // '08:00', '13:30', etc.
  actualDeliveryDate: date("actual_delivery_date"),
  actualDeliveryTime: text("actual_delivery_time"),
  deliveryWindow: text("delivery_window"), // 'morning' (6-12), 'afternoon' (12-18), 'evening' (18-22), 'all_day'
  timeSlot: text("time_slot"), // '08:00-10:00', '10:00-12:00', '13:00-15:00', '15:00-17:00'
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'confirmed', 'in_transit', 'delivered', 'delayed', 'cancelled', 'rescheduled'
  priority: text("priority").default("normal"), // 'urgent', 'high', 'normal', 'low'
  
  // Logistics coordination
  trackingNumber: text("tracking_number"),
  carrierName: text("carrier_name"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  vehicleInfo: text("vehicle_info"), // truck type, license plate
  
  // Warehouse coordination
  warehouseContactId: integer("warehouse_contact_id").references(() => users.id),
  vendorContactName: text("vendor_contact_name"),
  vendorContactPhone: text("vendor_contact_phone"),
  specialInstructions: text("special_instructions"),
  
  // Schedule management
  scheduledBy: integer("scheduled_by").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
  rescheduleReason: text("reschedule_reason"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Invoices for diverted orders
export const customerInvoices = pgTable("customer_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 20 }).notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => vendors.id), // Reusing vendors table for customers
  poId: integer("po_id").references(() => purchaseOrders.id),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'paid', 'overdue', 'cancelled'
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Invoice Line Items
export const customerInvoiceItems = pgTable("customer_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => customerInvoices.id),
  poItemId: integer("po_item_id").references(() => purchaseOrderItems.id),
  productId: integer("product_id").notNull().references(() => products.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
});

// Standing Orders for replenishment workflows
export const standingOrders = pgTable("standing_orders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
});

// Standing Order Items
export const standingOrderItems = pgTable("standing_order_items", {
  id: serial("id").primaryKey(),
  standingOrderId: integer("standing_order_id").notNull().references(() => standingOrders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  defaultQuantity: integer("default_quantity").notNull(),
  notes: text("notes"),
});

// Store Transfer Orders
export const transferOrders = pgTable("transfer_orders", {
  id: serial("id").primaryKey(),
  transferNumber: varchar("transfer_number", { length: 20 }).notNull().unique(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  orderDate: date("order_date").notNull(),
  shipDate: date("ship_date"),
  deliveryDate: date("delivery_date"),
  status: text("status").notNull().default("pending"), // 'pending', 'picking', 'shipped', 'delivered', 'cancelled'
  totalItems: integer("total_items"),
  totalCases: decimal("total_cases", { precision: 8, scale: 2 }),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transfer Order Line Items - Complete legacy database structure
export const transferOrderItems = pgTable("transfer_order_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull().references(() => transferOrders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityShipped: integer("quantity_shipped").default(0),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  csvProductTransferId: integer("csv_product_transfer_id"), // Maps to legacy TransProductID
  crvPerUnit: decimal("crv_per_unit", { precision: 5, scale: 4 }),
  totalCrv: decimal("total_crv", { precision: 10, scale: 2 }),
  transferCfg: text("transfer_cfg"), // Legacy TransCfg: Pallet, 1/4 Pallet, Layer, etc.
  transferWeight: decimal("transfer_weight", { precision: 10, scale: 2 }), // Legacy TransConfigWt
  transferCaseQty: integer("transfer_case_qty"), // Legacy TransCaseQty
  retailPrice: decimal("retail_price", { precision: 10, scale: 4 }), // Historical retail price at time of transfer
  gmPercentage: decimal("gm_percentage", { precision: 5, scale: 2 }), // Historical GM% at time of transfer
  notes: text("notes"),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").default(0),
  availableQuantity: integer("available_quantity").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Enhanced transactions for all inventory movements
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'purchase_receipt', 'store_transfer', 'adjustment', 'cycle_count'
  productId: integer("product_id").notNull().references(() => products.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity"),
  newQuantity: integer("new_quantity"),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  referenceType: text("reference_type"), // 'purchase_order', 'transfer_order', 'manual'
  referenceId: integer("reference_id"), // ID of related PO or Transfer
  referenceNumber: text("reference_number"), // PO number, transfer number, etc.
  notes: text("notes"),
  performedBy: integer("performed_by").references(() => users.id),
  transactionDate: timestamp("transaction_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'inventory_count', 'maintenance', 'delivery', 'pickup'
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'cancelled'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  assignedTo: integer("assigned_to").references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'low_stock', 'task_due', 'system', 'alert'
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").default("info"), // 'info', 'warning', 'error', 'success'
  isRead: boolean("is_read").default(false),
  userId: integer("user_id").references(() => users.id),
  relatedId: integer("related_id"), // ID of related record (product, task, etc.)
  relatedType: text("related_type"), // 'product', 'schedule', 'transaction'
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
});

export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
});

export const insertTransferOrderSchema = createInsertSchema(transferOrders).omit({
  id: true,
  createdAt: true,
});

export const insertTransferOrderItemSchema = createInsertSchema(transferOrderItems).omit({
  id: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  lastUpdated: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  transactionDate: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDeliveryScheduleSchema = createInsertSchema(deliverySchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertProductPricingSchema = createInsertSchema(productPricing).omit({
  id: true,
  createdAt: true,
});

export const insertStandingOrderSchema = createInsertSchema(standingOrders).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  usageCount: true,
});

export const insertStandingOrderItemSchema = createInsertSchema(standingOrderItems).omit({
  id: true,
});



// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;

export type TransferOrder = typeof transferOrders.$inferSelect;
export type InsertTransferOrder = z.infer<typeof insertTransferOrderSchema>;

export type TransferOrderItem = typeof transferOrderItems.$inferSelect;
export type InsertTransferOrderItem = z.infer<typeof insertTransferOrderItemSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ProductPricing = typeof productPricing.$inferSelect;
export type InsertProductPricing = z.infer<typeof insertProductPricingSchema>;

export type StandingOrder = typeof standingOrders.$inferSelect;
export type InsertStandingOrder = z.infer<typeof insertStandingOrderSchema>;

export type StandingOrderItem = typeof standingOrderItems.$inferSelect;
export type InsertStandingOrderItem = z.infer<typeof insertStandingOrderItemSchema>;

// Product Prices table - cost and retail price information by date
export const productPrices = pgTable("product_prices", {
  productPriceId: serial("product_price_id").primaryKey(),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }).notNull(),
  offInvoice: decimal("off_invoice", { precision: 10, scale: 2 }),
  billBack: decimal("bill_back", { precision: 10, scale: 2 }),
  effectiveDate: date("effective_date").notNull(),
  transferCost: decimal("transfer_cost", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  priceMultiple: integer("price_multiple").notNull(),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  productId: integer("product_id").notNull().references(() => products.productId),
});

// Product Purchases table - how the product is purchased
export const productPurchases = pgTable("product_purchases", {
  productPurchaseId: serial("product_purchase_id").primaryKey(),
  purchaseCaseQty: integer("purchase_case_qty").notNull(),
  purchaseUnitCt: integer("purchase_unit_ct").notNull(),
  purchaseWeight: decimal("purchase_weight", { precision: 10, scale: 2 }).notNull(),
  purchaseCrv: decimal("purchase_crv", { precision: 6, scale: 2 }),
  productId: integer("product_id").notNull().references(() => products.productId),
  purchaseCfg: integer("purchase_cfg"),
});

// Product Transfers table - how the product is shipped to stores
export const productTransfers = pgTable("product_transfers", {
  productTransferId: serial("product_transfer_id").primaryKey(),
  transferCaseQty: integer("transfer_case_qty").notNull(),
  transferUnitCt: integer("transfer_unit_ct").notNull(),
  transferWeight: decimal("transfer_weight", { precision: 10, scale: 2 }).notNull(),
  transferCrv: decimal("transfer_crv", { precision: 6, scale: 2 }),
  productId: integer("product_id").notNull().references(() => products.productId),
  transferCfg: integer("transfer_cfg"),
});

// Product UPCs table - consumer UPC data for front-end scanning
export const productUpcs = pgTable("product_upcs", {
  productUpcId: serial("product_upc_id").primaryKey(),
  consumerUpc: varchar("consumer_upc", { length: 50 }),
  description: varchar("description", { length: 255 }),
  quantity: integer("quantity").notNull(),
  size: varchar("size", { length: 15 }),
  itemPrice: decimal("item_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  productId: integer("product_id").notNull().references(() => products.productId),
});

// Insert schemas for the new product tables
export const insertProductPricesSchema = createInsertSchema(productPrices);
export const insertProductPurchasesSchema = createInsertSchema(productPurchases);
export const insertProductTransfersSchema = createInsertSchema(productTransfers);
export const insertProductUpcsSchema = createInsertSchema(productUpcs);

export type ProductPrices = typeof productPrices.$inferSelect;
export type InsertProductPrices = z.infer<typeof insertProductPricesSchema>;

export type ProductPurchases = typeof productPurchases.$inferSelect;
export type InsertProductPurchases = z.infer<typeof insertProductPurchasesSchema>;

export type ProductTransfers = typeof productTransfers.$inferSelect;
export type InsertProductTransfers = z.infer<typeof insertProductTransfersSchema>;

export type ProductUpcs = typeof productUpcs.$inferSelect;
export type InsertProductUpcs = z.infer<typeof insertProductUpcsSchema>;

export type Department = typeof departments.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Configuration = typeof configurations.$inferSelect;

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
