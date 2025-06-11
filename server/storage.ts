import { 
  users, vendors, stores, locations, products, inventory, transactions, schedules, notifications,
  purchaseOrders, purchaseOrderItems, transferOrders, transferOrderItems, departments, categories,
  configurations, standingOrders, standingOrderItems, productPurchases, deliverySchedules,
  type User, type InsertUser,
  type Vendor, type InsertVendor,
  type Store, type InsertStore,
  type Location, type InsertLocation,
  type Product, type InsertProduct,
  type Inventory, type InsertInventory,
  type Transaction, type InsertTransaction,
  type Schedule, type InsertSchedule,
  type Notification, type InsertNotification,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type TransferOrder, type InsertTransferOrder,
  type TransferOrderItem, type InsertTransferOrderItem,
  type Department, type InsertDepartment,
  type Category, type InsertCategory,
  type Configuration,
  type StandingOrder, type InsertStandingOrder,
  type StandingOrderItem, type InsertStandingOrderItem,
  insertDeliveryScheduleSchema,
  type DeliverySchedule,
  type InsertDeliverySchedule
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined>;
  searchVendors(query: string): Promise<Vendor[]>;

  // Stores
  getStores(): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<Store>): Promise<Store | undefined>;

  // Locations
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<Location>): Promise<Location | undefined>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  searchProducts(query: string): Promise<Product[]>;

  // Purchase Orders
  getPurchaseOrders(): Promise<(PurchaseOrder & { vendor: Vendor })[]>;
  getPurchaseOrder(id: number): Promise<(PurchaseOrder & { vendor: Vendor; items: (PurchaseOrderItem & { product: Product })[] }) | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, po: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  getPurchaseOrdersByVendor(vendorId: number): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByDate(date: Date): Promise<PurchaseOrder[]>;
  getLastPurchaseOrder(): Promise<PurchaseOrder | undefined>;

  // Purchase Order Items
  getPurchaseOrderItems(poId: number): Promise<(PurchaseOrderItem & { product: Product })[]>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: number, item: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | undefined>;

  // Transfer Orders
  getTransferOrders(): Promise<(TransferOrder & { store: Store })[]>;
  getTransferOrder(id: number): Promise<(TransferOrder & { store: Store; items: (TransferOrderItem & { product: Product })[] }) | undefined>;
  createTransferOrder(transfer: InsertTransferOrder): Promise<TransferOrder>;
  updateTransferOrder(id: number, transfer: Partial<TransferOrder>): Promise<TransferOrder | undefined>;
  getTransferOrdersByStore(storeId: number): Promise<TransferOrder[]>;

  // Transfer Order Items
  getTransferOrderItems(transferId: number): Promise<(TransferOrderItem & { product: Product })[]>;
  createTransferOrderItem(item: InsertTransferOrderItem): Promise<TransferOrderItem>;
  updateTransferOrderItem(id: number, item: Partial<TransferOrderItem>): Promise<TransferOrderItem | undefined>;

  // Inventory
  getInventory(): Promise<(Inventory & { product: Product; location: Location })[]>;
  getInventoryByProduct(productId: number): Promise<(Inventory & { location: Location })[]>;
  getInventoryByLocation(locationId: number): Promise<(Inventory & { product: Product })[]>;
  getInventoryItem(productId: number, locationId: number): Promise<Inventory | undefined>;
  updateInventory(productId: number, locationId: number, quantity: number): Promise<Inventory>;
  getLowStockItems(): Promise<(Inventory & { product: Product; location: Location })[]>;

  // Transactions
  getTransactions(): Promise<(Transaction & { product: Product; location: Location })[]>;
  getTransactionsByProduct(productId: number): Promise<(Transaction & { location: Location })[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getRecentTransactions(limit?: number): Promise<(Transaction & { product: Product; location: Location })[]>;

  // Schedules
  getSchedules(): Promise<Schedule[]>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<Schedule>): Promise<Schedule | undefined>;
  getUpcomingSchedules(): Promise<Schedule[]>;

  // Notifications
  getNotifications(userId?: number): Promise<Notification[]>;
  getUnreadNotifications(userId?: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;

  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;

  // Categories
  getCategories(): Promise<(Category & { department?: Department })[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;

  // Configurations
  getConfigurations(): Promise<Configuration[]>;

  // Standing Orders
  getStandingOrders(): Promise<(StandingOrder & { vendor: Vendor; itemCount: number })[]>;
  getStandingOrder(id: number): Promise<(StandingOrder & { vendor: Vendor; items: (StandingOrderItem & { product: Product })[] }) | undefined>;
  createStandingOrder(standingOrder: InsertStandingOrder): Promise<StandingOrder>;
  updateStandingOrder(id: number, standingOrder: Partial<StandingOrder>): Promise<StandingOrder | undefined>;
  deleteStandingOrder(id: number): Promise<void>;
  getStandingOrdersByVendor(vendorId: number): Promise<StandingOrder[]>;
  
  // Standing Order Items
  getStandingOrderItems(standingOrderId: number): Promise<(StandingOrderItem & { product: Product })[]>;
  createStandingOrderItem(item: InsertStandingOrderItem): Promise<StandingOrderItem>;
  updateStandingOrderItem(id: number, item: Partial<StandingOrderItem>): Promise<StandingOrderItem | undefined>;
  deleteStandingOrderItem(id: number): Promise<void>;
  replaceStandingOrderItems(standingOrderId: number, items: InsertStandingOrderItem[]): Promise<StandingOrderItem[]>;
  
  // Update standing order usage
  updateStandingOrderUsage(id: number): Promise<void>;

  // Delivery Schedules
  getDeliverySchedules(): Promise<any[]>;
  getDeliverySchedule(id: number): Promise<any | undefined>;
  createDeliverySchedule(schedule: InsertDeliverySchedule): Promise<any>;
  updateDeliverySchedule(id: number, schedule: Partial<InsertDeliverySchedule>): Promise<any | undefined>;
  deleteDeliverySchedule(id: number): Promise<void>;
  getDeliverySchedulesByPO(purchaseOrderId: number): Promise<any[]>;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).orderBy(vendors.name);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(insertVendor)
      .returning();
    return vendor;
  }

  async updateVendor(id: number, updates: Partial<Vendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set(updates)
      .where(eq(vendors.id, id))
      .returning();
    return vendor || undefined;
  }

  async searchVendors(query: string): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(
        and(
          eq(vendors.isActive, true),
          sql`LOWER(${vendors.name}) LIKE LOWER(${'%' + query + '%'})`
        )
      );
  }

  // Stores
  async getStores(): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.isActive, true));
  }

  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store || undefined;
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const [store] = await db
      .insert(stores)
      .values(insertStore)
      .returning();
    return store;
  }

  async updateStore(id: number, updates: Partial<Store>): Promise<Store | undefined> {
    const [store] = await db
      .update(stores)
      .set(updates)
      .where(eq(stores.id, id))
      .returning();
    return store || undefined;
  }

  // Locations
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.isActive, true));
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return location || undefined;
  }

  // Products - Updated to work with your real MySQL data structure
  async getProducts(): Promise<Product[]> {
    const result = await db.execute(sql`
      SELECT 
        p.product_id as id,
        p.product_id as productId,
        COALESCE(p.product_name, p.product_description, 'Product ' || p.product_id) as name,
        p.product_description as description,
        p.product_description as productDescription,
        p.brand,
        p.size as unitsize,
        p.size,
        p.case_pack as casepack,
        p.case_pack,
        p.status,
        p.case_upc as sku,
        p.vendor_id as vendorid,
        p.vendor_id as vendorId,
        p.category_id as categoryid,
        p.category_id,
        p.department_id as departmentid,
        p.department_id,
        p.discontinued_date as discontinuedDate,
        COALESCE(pp.retail_price, 0.00)::numeric(10,2) as "retailPrice",
        COALESCE(pp.purchase_cost, p.last_cost, 0.00)::numeric(10,2) as "lastCost",
        v.name as vendorname,
        v.name as vendorName
      FROM products p
      LEFT JOIN product_prices pp ON p.product_id = pp.product_id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.product_id IS NOT NULL
      ORDER BY p.product_id
    `);
    return result.rows as any[];
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.execute(sql`
      SELECT 
        product_id as id,
        COALESCE(product_name, product_description, 'Product ' || product_id) as name,
        product_description as description,
        brand,
        size as unit_size,
        case_pack,
        status,
        case_upc as sku,
        is_active,
        vendor_id,
        category_id,
        department_id
      FROM products 
      WHERE product_id = ${id}
    `);
    return result.rows[0] as any || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const result = await db.execute(sql`
      SELECT 
        product_id as id,
        COALESCE(product_name, product_description, 'Product ' || product_id) as name,
        product_description as description,
        brand,
        size as unit_size,
        case_pack,
        status,
        case_upc as sku,
        is_active,
        vendor_id,
        category_id,
        department_id
      FROM products 
      WHERE case_upc = ${sku}
    `);
    return result.rows[0] as any || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const result = await db.execute(sql`
      SELECT 
        product_id as id,
        COALESCE(product_name, product_description, 'Product ' || product_id) as name,
        product_description as description,
        brand,
        size as unit_size,
        case_pack,
        status,
        case_upc as sku,
        is_active,
        vendor_id,
        category_id,
        department_id
      FROM products 
      WHERE LOWER(status) = 'active' 
      AND (
        product_id::text = ${query} OR
        LOWER(COALESCE(product_name, product_description)) LIKE LOWER(${'%' + query + '%'}) OR
        LOWER(brand) LIKE LOWER(${'%' + query + '%'}) OR
        case_upc = ${query}
      )
      ORDER BY 
        CASE WHEN product_id::text = ${query} THEN 1 ELSE 2 END,
        product_id
    `);
    return result.rows as any[];
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<(PurchaseOrder & { vendor: Vendor })[]> {
    const result = await db.execute(sql`
      SELECT 
        po.id,
        po.po_number,
        po.vendor_id,
        po.order_date,
        po.expected_date,
        po.received_date,
        po.status,
        po.subtotal,
        po.tax_amount,
        po.shipping_amount,
        COALESCE(
          CASE WHEN po.total_amount::numeric > 0 THEN po.total_amount::numeric ELSE NULL END,
          CASE WHEN po.subtotal::numeric > 0 THEN po.subtotal::numeric ELSE NULL END,
          (
            SELECT SUM(
              COALESCE(poi.net_cost::numeric, poi.list_cost::numeric, 0) * 
              COALESCE(poi.quantity_ordered, 0)
            )
            FROM purchase_order_items poi 
            WHERE poi.po_id = po.id
          ),
          0
        )::numeric(10,2) as calculated_total,
        po.notes,
        po.created_by,
        po.created_at,
        v.id as vendor_id_join,
        v.name as vendor_name,
        v.code as vendor_code
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      ORDER BY po.order_date DESC
      LIMIT 1000
    `);

    return result.rows.map((row: any) => {
      const calculatedTotal = row.calculated_total;
      const totalAmount = calculatedTotal ? parseFloat(calculatedTotal).toFixed(2) : '0.00';
      
      return {
        id: row.id,
        poNumber: row.po_number,
        vendorId: row.vendor_id,
        orderDate: row.order_date,
        expectedDate: row.expected_date,
        receivedDate: row.received_date,
        status: row.status,
        subtotal: row.subtotal,
        taxAmount: row.tax_amount,
        shippingAmount: row.shipping_amount,
        totalAmount: totalAmount,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at,
        vendor: row.vendor_id_join ? {
          id: row.vendor_id_join,
          name: row.vendor_name || `Vendor ${row.vendor_id}`,
          code: row.vendor_code || `V${row.vendor_id}`,
          vendorName: row.vendor_name || `Vendor ${row.vendor_id}`
        } : null
      };
    });
  }

  async getPurchaseOrder(id: number): Promise<(PurchaseOrder & { vendor: Vendor; defaultShipToStore: Store | null; items: (PurchaseOrderItem & { product: Product })[] }) | undefined> {
    const [po] = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorId: purchaseOrders.vendorId,
        orderDate: purchaseOrders.orderDate,
        expectedDate: purchaseOrders.expectedDate,
        receivedDate: purchaseOrders.receivedDate,
        status: purchaseOrders.status,
        orderType: purchaseOrders.orderType,
        defaultShipToStoreId: purchaseOrders.defaultShipToStoreId,
        isDivertOrder: purchaseOrders.isDivertOrder,
        divertCustomerId: purchaseOrders.divertCustomerId,
        subtotal: purchaseOrders.subtotal,
        taxAmount: purchaseOrders.taxAmount,
        shippingAmount: purchaseOrders.shippingAmount,
        lumpSumAllowance: purchaseOrders.lumpSumAllowance,
        deliveryCharge: purchaseOrders.deliveryCharge,
        totalAmount: purchaseOrders.totalAmount,
        specialInstructions: purchaseOrders.specialInstructions,
        notes: purchaseOrders.notes,
        createdBy: purchaseOrders.createdBy,
        createdAt: purchaseOrders.createdAt,
        vendor: vendors,
        defaultShipToStore: stores
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(stores, eq(purchaseOrders.defaultShipToStoreId, stores.id))
      .where(eq(purchaseOrders.id, id));

    if (!po) return undefined;

    const items = await this.getPurchaseOrderItems(id);
    return { ...po, items };
  }

  async createPurchaseOrder(insertPO: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [po] = await db
      .insert(purchaseOrders)
      .values(insertPO)
      .returning();
    return po;
  }

  async updatePurchaseOrder(id: number, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [po] = await db
      .update(purchaseOrders)
      .set(updates)
      .where(eq(purchaseOrders.id, id))
      .returning();
    return po || undefined;
  }

  async getPurchaseOrdersByVendor(vendorId: number): Promise<PurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.vendorId, vendorId))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrdersByDate(date: Date): Promise<PurchaseOrder[]> {
    const targetDate = date.toISOString().split('T')[0];
    return await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.orderDate, targetDate));
  }

  async getLastPurchaseOrder(): Promise<PurchaseOrder | undefined> {
    const [lastPO] = await db
      .select()
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.id))
      .limit(1);
    return lastPO || undefined;
  }

  // Purchase Order Items
  async getPurchaseOrderItems(poId: number): Promise<(PurchaseOrderItem & { product: Product; configuration?: { configurationName: string } })[]> {
    const result = await db.execute(sql`
      SELECT 
        poi.*,
        COALESCE(p.product_description, p.name, 'Product ' || poi.product_id::text) as product_name,
        COALESCE(p.product_description, p.name, 'Product ' || poi.product_id::text) as product_description,
        COALESCE(p.case_pack, 1) as case_pack,
        COALESCE(p.unit_size, p.size, '') as size,
        p.case_upc,
        COALESCE(p.crv, 0) as crv,
        COALESCE(p.purchase_weight, 0) as product_weight,
        COALESCE(c.configuration_name, 'Case') as configuration_name
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.product_id
      LEFT JOIN configurations c ON poi.purchase_cfg = c.configuration_id
      WHERE poi.po_id = ${poId}
      ORDER BY poi.id
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      poId: row.po_id,
      productId: row.product_id,
      quantityOrdered: row.quantity_ordered,
      quantityReceived: row.quantity_received || 0,
      listCost: row.list_cost,
      offInvoice: row.off_invoice || 0,
      billBack: row.bill_back || 0,
      purchaseWeight: parseFloat(row.purchase_weight || row.product_weight || '0'),
      lineTotal: row.line_total,
      netCost: row.net_cost,
      notes: row.notes,
      product: {
        id: row.product_id,
        productId: row.product_id,
        name: row.product_name,
        productDescription: row.product_description,
        casePack: row.case_pack,
        size: row.size,
        caseUpc: row.case_upc,
        crv: row.crv,
        weight: parseFloat(row.product_weight || '0')
      },
      configuration: row.configuration_name ? {
        configurationName: row.configuration_name
      } : undefined
    }));
  }

  async createPurchaseOrderItem(insertItem: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [item] = await db
      .insert(purchaseOrderItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updatePurchaseOrderItem(id: number, updates: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | undefined> {
    const [item] = await db
      .update(purchaseOrderItems)
      .set(updates)
      .where(eq(purchaseOrderItems.id, id))
      .returning();
    return item || undefined;
  }

  async updatePurchaseOrderItems(poId: number, items: any[]): Promise<void> {
    // Delete existing items for this PO
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
    
    // Insert new items
    if (items.length > 0) {
      const newItems = items.map(item => ({
        poId,
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        listCost: item.listCost || item.unitCost, // Use listCost instead of unitCost
        offInvoice: item.offInvoice || 0,
        billBack: item.billBack || 0,
        purchaseCrv: item.purchaseCrv || 0,
        purchaseWeight: item.purchaseWeight || 0,
        purchaseCfg: item.purchaseCfg || 1,
        netCost: item.netCost || item.listCost || item.unitCost,
        lineTotal: (item.quantityOrdered * parseFloat(item.listCost || item.unitCost || 0)).toFixed(2)
      }));
      
      await db.insert(purchaseOrderItems).values(newItems);
    }
  }

  async deletePurchaseOrder(id: number): Promise<boolean> {
    const result = await db
      .delete(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .returning();
    return result.length > 0;
  }

  async deletePurchaseOrderItems(poId: number): Promise<void> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
  }

  // Transfer Orders
  async getTransferOrders(): Promise<(TransferOrder & { store: Store })[]> {
    return await db
      .select({
        id: transferOrders.id,
        transferNumber: transferOrders.transferNumber,
        storeId: transferOrders.storeId,
        orderDate: transferOrders.orderDate,
        shipDate: transferOrders.shipDate,
        deliveryDate: transferOrders.deliveryDate,
        status: transferOrders.status,
        totalItems: transferOrders.totalItems,
        totalCases: transferOrders.totalCases,
        notes: transferOrders.notes,
        createdBy: transferOrders.createdBy,
        createdAt: transferOrders.createdAt,
        store: stores
      })
      .from(transferOrders)
      .leftJoin(stores, eq(transferOrders.storeId, stores.id))
      .orderBy(desc(transferOrders.id));
  }

  async getTransferOrder(id: number): Promise<(TransferOrder & { store: Store; items: (TransferOrderItem & { product: Product })[] }) | undefined> {
    const [transfer] = await db
      .select({
        id: transferOrders.id,
        transferNumber: transferOrders.transferNumber,
        storeId: transferOrders.storeId,
        orderDate: transferOrders.orderDate,
        shipDate: transferOrders.shipDate,
        deliveryDate: transferOrders.deliveryDate,
        status: transferOrders.status,
        totalItems: transferOrders.totalItems,
        totalCases: transferOrders.totalCases,
        notes: transferOrders.notes,
        createdBy: transferOrders.createdBy,
        createdAt: transferOrders.createdAt,
        store: stores
      })
      .from(transferOrders)
      .leftJoin(stores, eq(transferOrders.storeId, stores.id))
      .where(eq(transferOrders.id, id));

    if (!transfer) return undefined;

    const items = await this.getTransferOrderItems(id);
    return { ...transfer, items };
  }

  async createTransferOrder(insertTransfer: InsertTransferOrder): Promise<TransferOrder> {
    const [transfer] = await db
      .insert(transferOrders)
      .values(insertTransfer)
      .returning();
    return transfer;
  }

  async updateTransferOrder(id: number, updates: Partial<TransferOrder>): Promise<TransferOrder | undefined> {
    const [transfer] = await db
      .update(transferOrders)
      .set(updates)
      .where(eq(transferOrders.id, id))
      .returning();
    return transfer || undefined;
  }

  async getTransferOrdersByStore(storeId: number): Promise<TransferOrder[]> {
    return await db
      .select()
      .from(transferOrders)
      .where(eq(transferOrders.storeId, storeId))
      .orderBy(desc(transferOrders.createdAt));
  }

  // Transfer Order Items
  async getTransferOrderItems(transferId: number): Promise<(TransferOrderItem & { product: Product })[]> {
    return await db
      .select({
        id: transferOrderItems.id,
        transferId: transferOrderItems.transferId,
        productId: transferOrderItems.productId,
        quantityOrdered: transferOrderItems.quantityOrdered,
        quantityShipped: transferOrderItems.quantityShipped,
        unitCost: transferOrderItems.unitCost,
        notes: transferOrderItems.notes,
        product: products
      })
      .from(transferOrderItems)
      .leftJoin(products, eq(transferOrderItems.productId, products.id))
      .where(eq(transferOrderItems.transferId, transferId));
  }

  async createTransferOrderItem(insertItem: InsertTransferOrderItem): Promise<TransferOrderItem> {
    const [item] = await db
      .insert(transferOrderItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateTransferOrderItem(id: number, updates: Partial<TransferOrderItem>): Promise<TransferOrderItem | undefined> {
    const [item] = await db
      .update(transferOrderItems)
      .set(updates)
      .where(eq(transferOrderItems.id, id))
      .returning();
    return item || undefined;
  }

  // Inventory
  async getInventory(): Promise<(Inventory & { product: Product; location: Location })[]> {
    return await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        locationId: inventory.locationId,
        quantity: inventory.quantity,
        reservedQuantity: inventory.reservedQuantity,
        availableQuantity: inventory.availableQuantity,
        lastUpdated: inventory.lastUpdated,
        product: products,
        location: locations
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id));
  }

  async getInventoryByProduct(productId: number): Promise<(Inventory & { location: Location })[]> {
    return await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        locationId: inventory.locationId,
        quantity: inventory.quantity,
        reservedQuantity: inventory.reservedQuantity,
        availableQuantity: inventory.availableQuantity,
        lastUpdated: inventory.lastUpdated,
        location: locations
      })
      .from(inventory)
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.productId, productId));
  }

  async getInventoryByLocation(locationId: number): Promise<(Inventory & { product: Product })[]> {
    return await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        locationId: inventory.locationId,
        quantity: inventory.quantity,
        reservedQuantity: inventory.reservedQuantity,
        availableQuantity: inventory.availableQuantity,
        lastUpdated: inventory.lastUpdated,
        product: products
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.locationId, locationId));
  }

  async getInventoryItem(productId: number, locationId: number): Promise<Inventory | undefined> {
    const [item] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.locationId, locationId)));
    return item || undefined;
  }

  async updateInventory(productId: number, locationId: number, quantity: number): Promise<Inventory> {
    const existingItem = await this.getInventoryItem(productId, locationId);
    
    if (existingItem) {
      const [item] = await db
        .update(inventory)
        .set({ 
          quantity, 
          availableQuantity: quantity - (existingItem.reservedQuantity || 0),
          lastUpdated: new Date() 
        })
        .where(and(eq(inventory.productId, productId), eq(inventory.locationId, locationId)))
        .returning();
      return item;
    } else {
      const [item] = await db
        .insert(inventory)
        .values({ 
          productId, 
          locationId, 
          quantity, 
          reservedQuantity: 0,
          availableQuantity: quantity 
        })
        .returning();
      return item;
    }
  }

  async getLowStockItems(): Promise<(Inventory & { product: Product; location: Location })[]> {
    return await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        locationId: inventory.locationId,
        quantity: inventory.quantity,
        reservedQuantity: inventory.reservedQuantity,
        availableQuantity: inventory.availableQuantity,
        lastUpdated: inventory.lastUpdated,
        product: products,
        location: locations
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(sql`${inventory.quantity} <= COALESCE(${products.minStockLevel}, 0)`);
  }

  // Transactions
  async getTransactions(): Promise<(Transaction & { product: Product; location: Location })[]> {
    return await db
      .select({
        id: transactions.id,
        type: transactions.type,
        productId: transactions.productId,
        locationId: transactions.locationId,
        quantity: transactions.quantity,
        previousQuantity: transactions.previousQuantity,
        newQuantity: transactions.newQuantity,
        unitCost: transactions.unitCost,
        totalCost: transactions.totalCost,
        referenceType: transactions.referenceType,
        referenceId: transactions.referenceId,
        referenceNumber: transactions.referenceNumber,
        notes: transactions.notes,
        performedBy: transactions.performedBy,
        transactionDate: transactions.transactionDate,
        createdAt: transactions.createdAt,
        product: products,
        location: locations
      })
      .from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .leftJoin(locations, eq(transactions.locationId, locations.id))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByProduct(productId: number): Promise<(Transaction & { location: Location })[]> {
    return await db
      .select({
        id: transactions.id,
        type: transactions.type,
        productId: transactions.productId,
        locationId: transactions.locationId,
        quantity: transactions.quantity,
        previousQuantity: transactions.previousQuantity,
        newQuantity: transactions.newQuantity,
        unitCost: transactions.unitCost,
        totalCost: transactions.totalCost,
        referenceType: transactions.referenceType,
        referenceId: transactions.referenceId,
        referenceNumber: transactions.referenceNumber,
        notes: transactions.notes,
        performedBy: transactions.performedBy,
        transactionDate: transactions.transactionDate,
        createdAt: transactions.createdAt,
        location: locations
      })
      .from(transactions)
      .leftJoin(locations, eq(transactions.locationId, locations.id))
      .where(eq(transactions.productId, productId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getRecentTransactions(limit: number = 10): Promise<(Transaction & { product: Product; location: Location })[]> {
    return await db
      .select({
        id: transactions.id,
        type: transactions.type,
        productId: transactions.productId,
        locationId: transactions.locationId,
        quantity: transactions.quantity,
        previousQuantity: transactions.previousQuantity,
        newQuantity: transactions.newQuantity,
        unitCost: transactions.unitCost,
        totalCost: transactions.totalCost,
        referenceType: transactions.referenceType,
        referenceId: transactions.referenceId,
        referenceNumber: transactions.referenceNumber,
        notes: transactions.notes,
        performedBy: transactions.performedBy,
        transactionDate: transactions.transactionDate,
        createdAt: transactions.createdAt,
        product: products,
        location: locations
      })
      .from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .leftJoin(locations, eq(transactions.locationId, locations.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Schedules
  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(desc(schedules.createdAt));
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule || undefined;
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db
      .insert(schedules)
      .values(insertSchedule)
      .returning();
    return schedule;
  }

  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const [schedule] = await db
      .update(schedules)
      .set(updates)
      .where(eq(schedules.id, id))
      .returning();
    return schedule || undefined;
  }

  async getUpcomingSchedules(): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(sql`${schedules.scheduledFor} >= CURRENT_DATE`)
      .orderBy(schedules.scheduledFor);
  }

  // Notifications
  async getNotifications(userId?: number): Promise<Notification[]> {
    const query = db.select().from(notifications);
    
    if (userId) {
      return await query
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    }
    
    return await query.orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId?: number): Promise<Notification[]> {
    const query = db.select().from(notifications).where(eq(notifications.isRead, false));
    
    if (userId) {
      return await query
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt));
    }
    
    return await query.orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department || undefined;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values(insertDepartment)
      .returning();
    return department;
  }

  async updateDepartment(id: number, updateData: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [department] = await db
      .update(departments)
      .set(updateData)
      .where(eq(departments.id, id))
      .returning();
    return department || undefined;
  }

  // Categories
  async getCategories(): Promise<(Category & { department?: Department })[]> {
    return await db
      .select({
        id: categories.id,
        name: categories.name,
        departmentId: categories.departmentId,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        department: departments
      })
      .from(categories)
      .leftJoin(departments, eq(categories.departmentId, departments.id))
      .orderBy(categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(id: number, updateData: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();
    return category || undefined;
  }

  // Configurations
  async getConfigurations(): Promise<Configuration[]> {
    try {
      // Use direct pool query since the table structure doesn't match schema
      const { pool } = await import("./db.js");
      const result = await pool.query(`
        SELECT 
          configuration_id as id,
          configuration_name as "configurationName",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM configurations 
        WHERE is_active = true
        ORDER BY configuration_name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching configurations:', error);
      return [];
    }
  }

  // Standing Orders
  async getStandingOrders(): Promise<(StandingOrder & { vendor: Vendor; itemCount: number })[]> {
    return await db
      .select({
        id: standingOrders.id,
        name: standingOrders.name,
        description: standingOrders.description,
        vendorId: standingOrders.vendorId,
        isActive: standingOrders.isActive,
        createdBy: standingOrders.createdBy,
        createdAt: standingOrders.createdAt,
        lastUsedAt: standingOrders.lastUsedAt,
        usageCount: standingOrders.usageCount,
        vendor: vendors,
        itemCount: sql<number>`COUNT(${standingOrderItems.id})::int`
      })
      .from(standingOrders)
      .leftJoin(vendors, eq(standingOrders.vendorId, vendors.id))
      .leftJoin(standingOrderItems, eq(standingOrders.id, standingOrderItems.standingOrderId))
      .groupBy(standingOrders.id, vendors.id)
      .orderBy(desc(standingOrders.lastUsedAt), standingOrders.name);
  }

  async getStandingOrder(id: number): Promise<(StandingOrder & { vendor: Vendor; items: (StandingOrderItem & { product: Product })[] }) | undefined> {
    const [standingOrder] = await db
      .select({
        id: standingOrders.id,
        name: standingOrders.name,
        description: standingOrders.description,
        vendorId: standingOrders.vendorId,
        isActive: standingOrders.isActive,
        createdBy: standingOrders.createdBy,
        createdAt: standingOrders.createdAt,
        lastUsedAt: standingOrders.lastUsedAt,
        usageCount: standingOrders.usageCount,
        vendor: vendors
      })
      .from(standingOrders)
      .leftJoin(vendors, eq(standingOrders.vendorId, vendors.id))
      .where(eq(standingOrders.id, id));

    if (!standingOrder) return undefined;

    const items = await this.getStandingOrderItems(id);
    return { ...standingOrder, items };
  }

  async createStandingOrder(insertStandingOrder: InsertStandingOrder): Promise<StandingOrder> {
    const [standingOrder] = await db
      .insert(standingOrders)
      .values(insertStandingOrder)
      .returning();
    return standingOrder;
  }

  async updateStandingOrder(id: number, updates: Partial<StandingOrder>): Promise<StandingOrder | undefined> {
    const [standingOrder] = await db
      .update(standingOrders)
      .set(updates)
      .where(eq(standingOrders.id, id))
      .returning();
    return standingOrder || undefined;
  }

  async deleteStandingOrder(id: number): Promise<void> {
    // Delete items first due to foreign key constraint
    await db.delete(standingOrderItems).where(eq(standingOrderItems.standingOrderId, id));
    await db.delete(standingOrders).where(eq(standingOrders.id, id));
  }

  async getStandingOrdersByVendor(vendorId: number): Promise<StandingOrder[]> {
    return await db
      .select()
      .from(standingOrders)
      .where(and(eq(standingOrders.vendorId, vendorId), eq(standingOrders.isActive, true)))
      .orderBy(standingOrders.name);
  }

  // Standing Order Items
  async getStandingOrderItems(standingOrderId: number): Promise<(StandingOrderItem & { product: Product })[]> {
    return await db
      .select({
        id: standingOrderItems.id,
        standingOrderId: standingOrderItems.standingOrderId,
        productId: standingOrderItems.productId,
        defaultQuantity: standingOrderItems.defaultQuantity,
        notes: standingOrderItems.notes,
        product: products
      })
      .from(standingOrderItems)
      .leftJoin(products, eq(standingOrderItems.productId, products.id))
      .where(eq(standingOrderItems.standingOrderId, standingOrderId))
      .orderBy(products.productDescription);
  }

  async createStandingOrderItem(insertItem: InsertStandingOrderItem): Promise<StandingOrderItem> {
    const [item] = await db
      .insert(standingOrderItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateStandingOrderItem(id: number, updates: Partial<StandingOrderItem>): Promise<StandingOrderItem | undefined> {
    const [item] = await db
      .update(standingOrderItems)
      .set(updates)
      .where(eq(standingOrderItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteStandingOrderItem(id: number): Promise<void> {
    await db.delete(standingOrderItems).where(eq(standingOrderItems.id, id));
  }

  async replaceStandingOrderItems(standingOrderId: number, items: InsertStandingOrderItem[]): Promise<StandingOrderItem[]> {
    // Delete existing items
    await db.delete(standingOrderItems).where(eq(standingOrderItems.standingOrderId, standingOrderId));
    
    // Insert new items
    if (items.length === 0) return [];
    
    return await db
      .insert(standingOrderItems)
      .values(items)
      .returning();
  }

  async updateStandingOrderUsage(id: number): Promise<void> {
    await db
      .update(standingOrders)
      .set({
        lastUsedAt: new Date(),
        usageCount: sql`${standingOrders.usageCount} + 1`
      })
      .where(eq(standingOrders.id, id));
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private products: Map<number, Product>;
  private inventory: Map<string, Inventory>; // key: "productId-locationId"
  private transactions: Map<number, Transaction>;
  private schedules: Map<number, Schedule>;
  private notifications: Map<number, Notification>;
  private currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.products = new Map();
    this.inventory = new Map();
    this.transactions = new Map();
    this.schedules = new Map();
    this.notifications = new Map();
    this.currentId = {
      users: 1,
      locations: 1,
      products: 1,
      transactions: 1,
      schedules: 1,
      notifications: 1,
    };

    // Initialize with some basic data
    this.initializeData();
  }

  private initializeData() {
    // Create default user
    const defaultUser: User = {
      id: this.currentId.users++,
      username: "admin",
      password: "admin",
      email: "admin@warehouse.com",
      firstName: "John",
      lastName: "Doe",
      role: "admin",
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Create sample locations
    const locations = [
      { code: "A-12-03", name: "Aisle A, Shelf 12, Position 3", zone: "A", aisle: "12", shelf: "03", position: "1", capacity: 100, isActive: true },
      { code: "B-05-12", name: "Aisle B, Shelf 5, Position 12", zone: "B", aisle: "05", shelf: "12", position: "1", capacity: 80, isActive: true },
      { code: "C-08-01", name: "Aisle C, Shelf 8, Position 1", zone: "C", aisle: "08", shelf: "01", position: "1", capacity: 120, isActive: true },
    ];

    locations.forEach(loc => {
      const location: Location = { id: this.currentId.locations++, ...loc };
      this.locations.set(location.id, location);
    });

    // Create sample products
    const products = [
      { sku: "APP-ORG-001", name: "Organic Apples", description: "Fresh organic apples", category: "Produce", unit: "lbs", minStockLevel: 20, maxStockLevel: 200, isActive: true },
      { sku: "BRD-PRM-015", name: "Premium Bread", description: "Artisan whole wheat bread", category: "Bakery", unit: "loaves", minStockLevel: 10, maxStockLevel: 100, isActive: true },
      { sku: "VEG-FRZ-088", name: "Frozen Vegetables", description: "Mixed frozen vegetables", category: "Frozen", unit: "bags", minStockLevel: 15, maxStockLevel: 150, isActive: true },
      { sku: "BAN-ORG-002", name: "Organic Bananas", description: "Fresh organic bananas", category: "Produce", unit: "bunches", minStockLevel: 10, maxStockLevel: 80, isActive: true },
    ];

    products.forEach(prod => {
      const product: Product = { id: this.currentId.products++, createdAt: new Date(), ...prod };
      this.products.set(product.id, product);
    });

    // Create sample inventory
    this.inventory.set("1-1", { id: 1, productId: 1, locationId: 1, quantity: 150, reservedQuantity: 0, lastUpdated: new Date() });
    this.inventory.set("2-2", { id: 2, productId: 2, locationId: 2, quantity: 75, reservedQuantity: 0, lastUpdated: new Date() });
    this.inventory.set("3-3", { id: 3, productId: 3, locationId: 3, quantity: 90, reservedQuantity: 0, lastUpdated: new Date() });
    this.inventory.set("4-1", { id: 4, productId: 4, locationId: 1, quantity: 5, reservedQuantity: 0, lastUpdated: new Date() });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentId.users++,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Location methods
  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values()).filter(loc => loc.isActive);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const location: Location = {
      ...insertLocation,
      id: this.currentId.locations++,
    };
    this.locations.set(location.id, location);
    return location;
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    
    const updated = { ...location, ...updates };
    this.locations.set(id, updated);
    return updated;
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(prod => prod.isActive);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(prod => prod.sku === sku);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const product: Product = {
      ...insertProduct,
      id: this.currentId.products++,
      createdAt: new Date(),
    };
    this.products.set(product.id, product);
    return product;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updated = { ...product, ...updates };
    this.products.set(id, updated);
    return updated;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.products.values()).filter(product => 
      product.isActive && (
        product.name.toLowerCase().includes(lowerQuery) ||
        product.sku.toLowerCase().includes(lowerQuery) ||
        product.description?.toLowerCase().includes(lowerQuery) ||
        product.category?.toLowerCase().includes(lowerQuery)
      )
    );
  }

  // Inventory methods
  async getInventory(): Promise<(Inventory & { product: Product; location: Location })[]> {
    const result = [];
    for (const inv of this.inventory.values()) {
      const product = this.products.get(inv.productId);
      const location = this.locations.get(inv.locationId);
      if (product && location) {
        result.push({ ...inv, product, location });
      }
    }
    return result;
  }

  async getInventoryByProduct(productId: number): Promise<(Inventory & { location: Location })[]> {
    const result = [];
    for (const inv of this.inventory.values()) {
      if (inv.productId === productId) {
        const location = this.locations.get(inv.locationId);
        if (location) {
          result.push({ ...inv, location });
        }
      }
    }
    return result;
  }

  async getInventoryByLocation(locationId: number): Promise<(Inventory & { product: Product })[]> {
    const result = [];
    for (const inv of this.inventory.values()) {
      if (inv.locationId === locationId) {
        const product = this.products.get(inv.productId);
        if (product) {
          result.push({ ...inv, product });
        }
      }
    }
    return result;
  }

  async getInventoryItem(productId: number, locationId: number): Promise<Inventory | undefined> {
    return this.inventory.get(`${productId}-${locationId}`);
  }

  async updateInventory(productId: number, locationId: number, quantity: number): Promise<Inventory> {
    const key = `${productId}-${locationId}`;
    const existing = this.inventory.get(key);
    
    const inventory: Inventory = {
      id: existing?.id || Object.keys(this.inventory).length + 1,
      productId,
      locationId,
      quantity,
      reservedQuantity: existing?.reservedQuantity || 0,
      lastUpdated: new Date(),
    };
    
    this.inventory.set(key, inventory);
    return inventory;
  }

  async getLowStockItems(): Promise<(Inventory & { product: Product; location: Location })[]> {
    const result = [];
    for (const inv of this.inventory.values()) {
      const product = this.products.get(inv.productId);
      const location = this.locations.get(inv.locationId);
      if (product && location && inv.quantity <= product.minStockLevel) {
        result.push({ ...inv, product, location });
      }
    }
    return result;
  }

  // Transaction methods
  async getTransactions(): Promise<(Transaction & { product: Product; location: Location })[]> {
    const result = [];
    for (const trans of this.transactions.values()) {
      const product = this.products.get(trans.productId);
      const location = this.locations.get(trans.locationId);
      if (product && location) {
        result.push({ ...trans, product, location });
      }
    }
    return result.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getTransactionsByProduct(productId: number): Promise<(Transaction & { location: Location })[]> {
    const result = [];
    for (const trans of this.transactions.values()) {
      if (trans.productId === productId) {
        const location = this.locations.get(trans.locationId);
        if (location) {
          result.push({ ...trans, location });
        }
      }
    }
    return result.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      ...insertTransaction,
      id: this.currentId.transactions++,
      createdAt: new Date(),
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async getRecentTransactions(limit: number = 10): Promise<(Transaction & { product: Product; location: Location })[]> {
    const all = await this.getTransactions();
    return all.slice(0, limit);
  }

  // Schedule methods
  async getSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const schedule: Schedule = {
      ...insertSchedule,
      id: this.currentId.schedules++,
      createdAt: new Date(),
    };
    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async updateSchedule(id: number, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    
    const updated = { ...schedule, ...updates };
    this.schedules.set(id, updated);
    return updated;
  }

  async getUpcomingSchedules(): Promise<Schedule[]> {
    const now = new Date();
    return Array.from(this.schedules.values())
      .filter(schedule => schedule.scheduledFor > now && schedule.status === 'pending')
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  // Notification methods
  async getNotifications(userId?: number): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    if (userId) {
      return notifications.filter(n => n.userId === userId || !n.userId);
    }
    return notifications.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getUnreadNotifications(userId?: number): Promise<Notification[]> {
    const notifications = await this.getNotifications(userId);
    return notifications.filter(n => !n.isRead);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      ...insertNotification,
      id: this.currentId.notifications++,
      createdAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      this.notifications.set(id, notification);
    }
  }

  // Delivery Schedule methods
  async getDeliverySchedules(): Promise<any[]> {
    const schedules = await db
      .select()
      .from(deliverySchedules)
      .leftJoin(purchaseOrders, eq(deliverySchedules.purchaseOrderId, purchaseOrders.id))
      .leftJoin(vendors, eq(deliverySchedules.vendorId, vendors.id))
      .orderBy(desc(deliverySchedules.scheduledDate));
    
    return schedules.map(row => ({
      ...row.delivery_schedules,
      purchaseOrder: row.purchase_orders,
      vendor: row.vendors
    }));
  }

  async getDeliverySchedule(id: number): Promise<any | undefined> {
    const result = await db
      .select()
      .from(deliverySchedules)
      .leftJoin(purchaseOrders, eq(deliverySchedules.purchaseOrderId, purchaseOrders.id))
      .leftJoin(vendors, eq(deliverySchedules.vendorId, vendors.id))
      .where(eq(deliverySchedules.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const row = result[0];
    return {
      ...row.delivery_schedules,
      purchaseOrder: row.purchase_orders,
      vendor: row.vendors
    };
  }

  async createDeliverySchedule(schedule: InsertDeliverySchedule): Promise<any> {
    const [created] = await db
      .insert(deliverySchedules)
      .values(schedule)
      .returning();
    
    return created;
  }

  async updateDeliverySchedule(id: number, schedule: Partial<InsertDeliverySchedule>): Promise<any | undefined> {
    const [updated] = await db
      .update(deliverySchedules)
      .set(schedule)
      .where(eq(deliverySchedules.id, id))
      .returning();
    
    return updated;
  }

  async deleteDeliverySchedule(id: number): Promise<void> {
    await db
      .delete(deliverySchedules)
      .where(eq(deliverySchedules.id, id));
  }

  async getDeliverySchedulesByPO(purchaseOrderId: number): Promise<any[]> {
    const schedules = await db
      .select()
      .from(deliverySchedules)
      .where(eq(deliverySchedules.purchaseOrderId, purchaseOrderId))
      .orderBy(desc(deliverySchedules.scheduledDate));
    
    return schedules;
  }
}

export const storage = new DatabaseStorage();
