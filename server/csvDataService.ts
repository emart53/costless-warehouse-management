import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVPurchaseOrderHeader {
  purchase_order_id: string;
  vendor_id: string;
  purchase_order_date: string;
  expected_delivery_date?: string;
  status: string;
  extended_cost_total: number;
  ship_to_id?: number;
  bill_to_id?: number;
  lump_sum_fee?: number;
  fee1?: number;
  special_instructions?: string;
  notes?: string;
}

interface CSVPurchaseOrderItem {
  purchase_order_id: string;
  product_id: number;
  quantity: number;
  purchase_cost: number;
  purchase_cfg?: number;
  off_invoice?: number;
  bill_back?: number;
  purchase_crv?: number;
  purchase_weight?: number;
  purchase_case_qty?: number;
  net_cost: number;
  notes?: string;
}

export class CSVDataService {
  private headerData: Map<string, CSVPurchaseOrderHeader> = new Map();
  private itemsData: Map<string, CSVPurchaseOrderItem[]> = new Map();
  private initialized = false;

  private initializeData() {
    if (this.initialized) return;

    try {
      // Load purchase order headers and get most recent 50
      const headerPath = path.join(process.cwd(), 'attached_assets', 'purchase_order_header.csv');
      if (fs.existsSync(headerPath)) {
        const headerContent = fs.readFileSync(headerPath, 'utf-8');
        const headerRecords = parse(headerContent, { 
          columns: true, 
          skip_empty_lines: true 
        });

        // Filter valid records and sort by order date (newest first) - show all authentic records
        const sortedHeaders = headerRecords
          .filter((record: any) => record.purchase_order_id && record.purchase_order_date)
          .sort((a: any, b: any) => new Date(b.purchase_order_date).getTime() - new Date(a.purchase_order_date).getTime());

        console.log(`Total records: ${headerRecords.length}`);
        console.log(`Filtered records: ${headerRecords.filter((record: any) => record.purchase_order_id && record.purchase_order_date).length}`);
        console.log(`Processing all ${sortedHeaders.length} authentic purchase orders`);

        sortedHeaders.forEach((record: any) => {
          const header: CSVPurchaseOrderHeader = {
            purchase_order_id: record.purchase_order_id?.toString(),
            vendor_id: record.vendor_id?.toString(),
            purchase_order_date: record.purchase_order_date,
            expected_delivery_date: record.expected_delivery_date,
            status: record.status || 'SUBMITTED',
            extended_cost_total: parseFloat(record.invoice_amount || record.extended_cost_total || '0'),
            ship_to_id: parseInt(record.ship_to_id || '7'),
            bill_to_id: parseInt(record.bill_to_id || '7'),
            lump_sum_fee: parseFloat(record.lump_sum_fee || '0'),
            fee1: parseFloat(record.fee1 || '0'),
            special_instructions: record.special_instructions || '',
            notes: record.notes || ''
          };
          
          if (header.purchase_order_id) {
            this.headerData.set(header.purchase_order_id, header);
          }
        });
      }

      // Load purchase order items
      const itemsPath = path.join(process.cwd(), 'attached_assets', 'purchase_order_items.csv');
      if (fs.existsSync(itemsPath)) {
        const itemsContent = fs.readFileSync(itemsPath, 'utf-8');
        const itemsRecords = parse(itemsContent, { 
          columns: true, 
          skip_empty_lines: true 
        });

        // Get purchase order IDs we're interested in (recent ones only)
        const recentPOIds = new Set(Array.from(this.headerData.keys()));

        itemsRecords.forEach((record: any) => {
          const poId = record.purchase_order_id?.toString() || record.purchaseOrderId?.toString();
          
          // Only process items for recent purchase orders
          if (poId && recentPOIds.has(poId)) {
            const item: CSVPurchaseOrderItem = {
              purchase_order_id: poId,
              product_id: parseInt(record.product_id || record.productId || '0'),
              quantity: parseInt(record.quantity || '0'),
              purchase_cost: parseFloat(record.purchase_cost || record.unit_cost || record.unitCost || '0'),
              purchase_cfg: (record.purchase_cfg && record.purchase_cfg !== 'NULL') ? parseInt(record.purchase_cfg) : undefined,
              off_invoice: parseFloat(record.off_invoice || record.offInvoice || '0'),
              bill_back: parseFloat(record.bill_back || record.billBack || '0'),
              purchase_crv: parseFloat(record.purchase_crv || record.purchaseCrv || '0'),
              purchase_weight: parseFloat(record.purchase_weight || record.purchaseWeight || '0') || undefined,
              purchase_case_qty: parseInt(record.purchase_case_qty || record.purchaseCaseQty || '0') || undefined,
              net_cost: parseFloat(record.net_cost || record.extended_cost || record.extendedCost || '0'),
              notes: record.notes || ''
            };

            if (item.product_id) {
              if (!this.itemsData.has(poId)) {
                this.itemsData.set(poId, []);
              }
              this.itemsData.get(poId)!.push(item);
            }
          }
        });
      }

      this.initialized = true;
      console.log(`Loaded ${this.headerData.size} purchase orders from CSV data`);
    } catch (error) {
      console.error('Error loading CSV data:', error);
    }
  }

  getAllPurchaseOrders(): CSVPurchaseOrderHeader[] {
    this.initializeData();
    return Array.from(this.headerData.values());
  }

  getPurchaseOrder(id: string): { header: CSVPurchaseOrderHeader; items: CSVPurchaseOrderItem[] } | null {
    this.initializeData();
    
    const header = this.headerData.get(id);
    if (!header) return null;

    const items = this.itemsData.get(id) || [];
    return { header, items };
  }

  getPurchaseOrderItems(id: string): CSVPurchaseOrderItem[] {
    this.initializeData();
    return this.itemsData.get(id) || [];
  }

  // Convert CSV data to API format
  async convertToAPIFormat(csvPO: { header: CSVPurchaseOrderHeader; items: CSVPurchaseOrderItem[] }, storage?: any) {
    // Get product information, vendors, locations, stores, and configurations if storage is available
    let products: any[] = [];
    let vendors: any[] = [];
    let locations: any[] = [];
    let stores: any[] = [];
    let configurations: any[] = [];
    
    if (storage) {
      try {
        products = await storage.getProducts();
        vendors = await storage.getVendors();
        locations = await storage.getLocations();
        stores = await storage.getStores();
        configurations = await storage.getConfigurations();
      } catch (error) {
        console.error('Error fetching data for CSV conversion:', error);
      }
    }
    
    const productMap = new Map(products.map(p => [p.product_id || p.productId || p.id, p]));
    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    const locationMap = new Map(locations.map(l => [l.id, l]));
    const storeMap = new Map(stores.map(s => [s.id, s]));
    const configurationMap = new Map(configurations.map(c => [c.configuration_id || c.id, c]));

    // Legacy location ID to store ID mapping
    // Note: Warehouse shipments (location ID 1) should remain as warehouse, not retail stores
    const legacyToStoreIdMap: { [key: number]: number } = {
      // 1: Cost Less Warehouse -> Keep as warehouse (no store mapping)
      // 2: Cost Less Accounting -> Keep as accounting (no store mapping)
      3: 10, // Cost Less #3 -> Cost Less #3
      4: 11, // Cost Less #4 -> Cost Less #4  
      5: 12, // Cost Less #5 -> Cost Less #5
      6: 13, // Cost Less #6 -> Cost Less #6
      8: 14, // Cost Less #7 -> Cost Less #7
      9: 15, // Cost Less #8 -> Cost Less #8
      10: 16, // Cost Less #9 -> Cost Less #9
      11: 17, // Cost Less #10 -> Cost Less #10
      15: 18  // Cost Less #11 -> Cost Less #11
    };

    // Get vendor and location information from CSV header data
    const csvHeader = this.headerData.get(csvPO.header.purchase_order_id);
    const vendor = vendorMap.get(parseInt(csvPO.header.vendor_id));
    const shipToLocation = locationMap.get(csvHeader?.ship_to_id || 1);
    const billToLocation = locationMap.get(csvHeader?.bill_to_id || 2);
    
    // Map legacy ship_to_id to current store ID (if it's a retail store)
    const mappedStoreId = legacyToStoreIdMap[csvHeader?.ship_to_id || 1] || null;
    const defaultShipToStore = mappedStoreId ? storeMap.get(mappedStoreId) : null;

    return {
      id: parseInt(csvPO.header.purchase_order_id),
      poNumber: csvPO.header.purchase_order_id,
      vendorId: parseInt(csvPO.header.vendor_id),
      vendor: vendor ? {
        id: vendor.id,
        name: vendor.vendorName || vendor.vendor_name || vendor.name,
        contactName: vendor.contactName || vendor.contact_name,
        phone: vendor.phone,
        address: vendor.address,
        city: vendor.city,
        state: vendor.state,
        zipCode: vendor.zipCode || vendor.zip,
        discountPercent: vendor.discountPercent || vendor.discount,
        epDays: vendor.epDays || vendor.ep_days,
        netDays: vendor.netDays || vendor.net_days,
        paymentTerms: vendor.paymentTerms || vendor.payment_terms
      } : null,
      orderDate: csvPO.header.purchase_order_date,
      expectedDate: csvPO.header.expected_delivery_date,
      status: csvPO.header.status,
      defaultShipToStoreId: mappedStoreId,
      defaultShipToStore: defaultShipToStore ? {
        id: defaultShipToStore.id,
        storeNumber: defaultShipToStore.storeNumber,
        name: defaultShipToStore.name,
        address: defaultShipToStore.address,
        city: defaultShipToStore.city,
        state: defaultShipToStore.state,
        zipCode: defaultShipToStore.zipCode,
        phone: defaultShipToStore.phone,
        contactPerson: defaultShipToStore.contactPerson
      } : null,
      shipToLocationId: csvHeader?.ship_to_id || 1,
      shipToLocation: shipToLocation ? {
        id: shipToLocation.id,
        name: shipToLocation.name,
        code: shipToLocation.code,
        address: shipToLocation.address,
        city: shipToLocation.city,
        state: shipToLocation.state,
        zipCode: shipToLocation.zipCode,
        contactPerson: shipToLocation.contactPerson,
        phone: shipToLocation.phone
      } : null,
      billToLocationId: csvHeader?.bill_to_id || 2,
      billToLocation: billToLocation ? {
        id: billToLocation.id,
        name: billToLocation.name,
        code: billToLocation.code,
        address: billToLocation.address,
        city: billToLocation.city,
        state: billToLocation.state,
        zipCode: billToLocation.zipCode,
        contactPerson: billToLocation.contactPerson,
        phone: billToLocation.phone
      } : null,
      lumpSumAllowance: csvPO.header.lump_sum_fee || 0,
      deliveryCharge: csvPO.header.fee1 || 0,
      notes: csvPO.header.notes || '',
      items: csvPO.items.map(item => {
        const product = productMap.get(item.product_id);
        
        // Determine configuration ID
        let configId = item.purchase_cfg;
        
        // If purchase_cfg is null/undefined or equals 0, try to infer from multiple sources
        if ((!configId || configId === 0)) {
          // First, check product description
          if (product) {
            const description = (product.product_description || product.description || product.product_name || product.name || '').toLowerCase();
            if (description.includes('pallet')) {
              configId = 2; // Pallet
            } else if (description.includes('layer')) {
              configId = 3; // Layer
            } else if (description.includes('unit')) {
              configId = 4; // Unit
            }
          }
          
          // If still no config determined, analyze cost and weight characteristics
          if (!configId || configId === 0) {
            const cost = item.purchase_cost || 0;
            const weight = item.purchase_weight || 0;
            const caseQty = item.purchase_case_qty || 0;
            
            // Pallet-level indicators: high cost (>$100), high weight (>50 lbs), or high case qty (>24)
            if (cost > 100 || weight > 50 || caseQty > 24) {
              configId = 2; // Pallet
            } else if (cost > 20 || weight > 10 || caseQty > 6) {
              configId = 1; // Case
            } else {
              configId = 4; // Unit
            }
          }
        }
        
        // Final fallback
        if (!configId || configId === 0) {
          configId = 1; // Default to Case
        }
        
        const configuration = configurationMap.get(configId);

        
        return {
          id: `${item.purchase_order_id}-${item.product_id}`,
          productId: item.product_id,
          product: product ? {
            product_id: product.product_id || product.productId || product.id,
            productId: product.productId || product.id,
            brand: product.brand || 'Unknown',
            product_name: product.product_name || product.name || `Product ${item.product_id}`,
            product_description: product.product_description || product.description || '',
            case_pack: product.case_pack || 1,
            size: product.size || 'Unknown'
          } : {
            product_id: item.product_id,
            productId: item.product_id,
            brand: 'Unknown',
            product_name: `Product ${item.product_id}`,
            product_description: `Product ${item.product_id}`,
            case_pack: 1,
            size: 'Unknown'
          },
          configuration: configuration ? {
            id: configuration.configuration_id || configuration.id,
            configurationName: configuration.configuration_name || configuration.configurationName || configuration.name || 'Case'
          } : null,
          quantityOrdered: item.quantity,
          listCost: typeof item.purchase_cost === 'number' ? item.purchase_cost : parseFloat(item.purchase_cost || '0'),
          purchaseCfg: configId,
          offInvoice: typeof item.off_invoice === 'number' ? item.off_invoice : parseFloat(item.off_invoice || '0'),
          billBack: typeof item.bill_back === 'number' ? item.bill_back : parseFloat(item.bill_back || '0'),
          purchaseCrv: typeof item.purchase_crv === 'number' ? item.purchase_crv : parseFloat(item.purchase_crv || '0'),
          purchaseWeight: typeof item.purchase_weight === 'number' ? item.purchase_weight : parseFloat(item.purchase_weight || '0'),
          purchaseCaseQty: item.purchase_case_qty || 1,
          netCost: typeof item.net_cost === 'number' ? item.net_cost : parseFloat(item.net_cost || '0'),
          notes: item.notes || ''
        };
      })
    };
  }

  // Check if a PO ID exists in CSV data
  existsInCSV(id: string): boolean {
    this.initializeData();
    return this.headerData.has(id);
  }
}

export const csvDataService = new CSVDataService();