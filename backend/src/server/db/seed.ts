import { db, schema } from "./index";
import {
  items,
  categories,
  suppliers,
  locations,
  movements,
  purchaseOrders,
  requests,
  notifications,
  notificationPrefs,
} from "./schema";
import type { Item, Category, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest, Notification } from "@/types/inventory";
import { MovementType, OrderStatus, RequestStatus, ItemStatus } from "@/types/inventory";

/**
 * Seed a new workspace with demo data.
 * Call this after creating a workspace (especially for demo/trial mode).
 */
export async function seedWorkspace(workspaceId: string): Promise<void> {
  const ts = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  // Categories
  const seedCategories = [
    { workspaceId, name: "Electronics", description: "Electronic components and devices", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
    { workspaceId, name: "Office Supplies", description: "Paper, pens, and office essentials", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
    { workspaceId, name: "Cleaning", description: "Cleaning products and janitorial supplies", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
    { workspaceId, name: "Safety Equipment", description: "PPE and safety gear", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
    { workspaceId, name: "Tools", description: "Hand tools and power tools", parentId: null, createdAt: ts(90), updatedAt: ts(90) },
  ];
  const catIds = await db.insert(categories).values(seedCategories).returning();
  const [catElectronics, catOffice, catCleaning, catSafety, catTools] = catIds;

  // Suppliers
  const seedSuppliers = [
    { workspaceId, name: "Acme Supply Co", contactName: "John Carter", email: "john@acmesupply.com", phone: "555-0101", address: "123 Industrial Ave, Chicago IL", leadTimeDays: 5, rating: "4.5", isActive: true, notes: "Primary electronics vendor", createdAt: ts(120), updatedAt: ts(10) },
    { workspaceId, name: "TechParts Direct", contactName: "Sarah Lin", email: "sarah@techparts.com", phone: "555-0202", address: "456 Tech Blvd, San Jose CA", leadTimeDays: 3, rating: "4.8", isActive: true, notes: "Fast shipping, premium pricing", createdAt: ts(100), updatedAt: ts(5) },
    { workspaceId, name: "CleanPro Distributors", contactName: "Mike Davis", email: "mike@cleanpro.com", phone: "555-0303", address: "789 Clean St, Houston TX", leadTimeDays: 7, rating: "4.0", isActive: true, notes: "Bulk discounts available", createdAt: ts(80), updatedAt: ts(15) },
    { workspaceId, name: "SafetyFirst Inc", contactName: "Lisa Park", email: "lisa@safetyfirst.com", phone: "555-0404", address: "321 Safety Rd, Atlanta GA", leadTimeDays: 4, rating: "4.3", isActive: true, notes: "OSHA compliant products", createdAt: ts(70), updatedAt: ts(8) },
  ];
  const supIds = await db.insert(suppliers).values(seedSuppliers).returning();
  const [supAcme, supTechParts, supCleanPro, supSafety] = supIds;

  // Locations
  const seedLocations = [
    { workspaceId, name: "Main Warehouse", type: "warehouse" as const, parentId: null, description: "Primary storage facility", address: "100 Warehouse Dr, Chicago IL", isActive: true, createdAt: ts(120), updatedAt: ts(5) },
    { workspaceId, name: "Downtown Store", type: "warehouse" as const, parentId: null, description: "Retail storefront with stock", address: "200 Main St, Chicago IL", isActive: true, createdAt: ts(100), updatedAt: ts(10) },
    { workspaceId, name: "Regional Office", type: "warehouse" as const, parentId: null, description: "Corporate office supplies", address: "300 Corporate Pkwy, Chicago IL", isActive: true, createdAt: ts(80), updatedAt: ts(20) },
  ];
  const locIds = await db.insert(locations).values(seedLocations).returning();
  const [locMain, locDowntown, locRegional] = locIds;

  // Items (~15 seed items)
  const seedItems = [
    { workspaceId, sku: "STK-1000", barcode: null, name: "USB-C Charging Cable", description: "Standard USB-C cable", categoryId: catElectronics.id, status: "active" as const, unit: "ea", currentStock: 150, reorderPoint: 30, reorderQuantity: 60, costPrice: "3.50", sellingPrice: "8.99", locationId: locMain.id, supplierId: supTechParts.id, customFields: {}, createdAt: ts(60), updatedAt: ts(1) },
    { workspaceId, sku: "STK-1001", barcode: "4900013701", name: "Wireless Mouse", description: "Ergonomic wireless mouse", categoryId: catElectronics.id, status: "active" as const, unit: "ea", currentStock: 8, reorderPoint: 20, reorderQuantity: 40, costPrice: "12.00", sellingPrice: "24.99", locationId: locMain.id, supplierId: supTechParts.id, customFields: {}, createdAt: ts(60), updatedAt: ts(3) },
    { workspaceId, sku: "STK-1002", barcode: "4900274022", name: "HDMI Adapter", description: "HDMI to USB-C adapter", categoryId: catElectronics.id, status: "active" as const, unit: "ea", currentStock: 42, reorderPoint: 15, reorderQuantity: 30, costPrice: "8.00", sellingPrice: "15.99", locationId: locMain.id, supplierId: supAcme.id, customFields: {}, createdAt: ts(55), updatedAt: ts(2) },
    { workspaceId, sku: "STK-1003", barcode: "4900411033", name: "Copy Paper", description: "A4 500-sheet ream", categoryId: catOffice.id, status: "active" as const, unit: "ea", currentStock: 200, reorderPoint: 50, reorderQuantity: 100, costPrice: "4.50", sellingPrice: "9.99", locationId: locMain.id, supplierId: supAcme.id, customFields: {}, createdAt: ts(50), updatedAt: ts(5) },
    { workspaceId, sku: "STK-1004", barcode: "4900548044", name: "Blue Pens Box", description: "Ballpoint pens 50-pack", categoryId: catOffice.id, status: "active" as const, unit: "ea", currentStock: 5, reorderPoint: 30, reorderQuantity: 60, costPrice: "6.00", sellingPrice: "12.99", locationId: locRegional.id, supplierId: supAcme.id, customFields: {}, createdAt: ts(50), updatedAt: ts(4) },
    { workspaceId, sku: "STK-1005", barcode: "4900685050", name: "Sticky Notes", description: "3x3 yellow sticky notes", categoryId: catOffice.id, status: "active" as const, unit: "ea", currentStock: 0, reorderPoint: 20, reorderQuantity: 40, costPrice: "1.50", sellingPrice: "4.99", locationId: locRegional.id, supplierId: supCleanPro.id, customFields: {}, createdAt: ts(45), updatedAt: ts(10) },
    { workspaceId, sku: "STK-1006", barcode: "4900822066", name: "All-Purpose Cleaner", description: "Multi-surface spray cleaner", categoryId: catCleaning.id, status: "active" as const, unit: "ea", currentStock: 25, reorderPoint: 15, reorderQuantity: 30, costPrice: "3.00", sellingPrice: "7.99", locationId: locMain.id, supplierId: supCleanPro.id, customFields: {}, createdAt: ts(40), updatedAt: ts(7) },
    { workspaceId, sku: "STK-1007", barcode: "4900959077", name: "Microfiber Cloths", description: "Pack of 12 cloths", categoryId: catCleaning.id, status: "active" as const, unit: "ea", currentStock: 50, reorderPoint: 10, reorderQuantity: 20, costPrice: "8.00", sellingPrice: "15.99", locationId: locMain.id, supplierId: supCleanPro.id, customFields: {}, createdAt: ts(40), updatedAt: ts(6) },
    { workspaceId, sku: "STK-1008", barcode: "4901096088", name: "Safety Glasses", description: "ANSI Z87.1 certified", categoryId: catSafety.id, status: "active" as const, unit: "ea", currentStock: 30, reorderPoint: 25, reorderQuantity: 50, costPrice: "5.00", sellingPrice: "11.99", locationId: locDowntown.id, supplierId: supSafety.id, customFields: {}, createdAt: ts(35), updatedAt: ts(3) },
    { workspaceId, sku: "STK-1009", barcode: "4901233099", name: "Nitrile Gloves", description: "Box of 100 gloves", categoryId: catSafety.id, status: "active" as const, unit: "ea", currentStock: 2, reorderPoint: 20, reorderQuantity: 40, costPrice: "12.00", sellingPrice: "24.99", locationId: locDowntown.id, supplierId: supSafety.id, customFields: {}, createdAt: ts(30), updatedAt: ts(2) },
    { workspaceId, sku: "STK-1010", barcode: "49013701010", name: "Cordless Drill", description: "18V cordless drill", categoryId: catTools.id, status: "active" as const, unit: "ea", currentStock: 10, reorderPoint: 5, reorderQuantity: 10, costPrice: "65.00", sellingPrice: "129.99", locationId: locMain.id, supplierId: supAcme.id, customFields: {}, createdAt: ts(25), updatedAt: ts(5) },
    { workspaceId, sku: "STK-1011", barcode: "49015071111", name: "Hand Sanitizer", description: "1 liter gel", categoryId: catCleaning.id, status: "active" as const, unit: "ea", currentStock: 100, reorderPoint: 40, reorderQuantity: 80, costPrice: "4.00", sellingPrice: "8.99", locationId: locMain.id, supplierId: supCleanPro.id, customFields: {}, createdAt: ts(20), updatedAt: ts(1) },
    { workspaceId, sku: "STK-1012", barcode: null, name: "Desk Organizer", description: "Multi-compartment desktop organizer", categoryId: catOffice.id, status: "active" as const, unit: "ea", currentStock: 3, reorderPoint: 15, reorderQuantity: 30, costPrice: "9.00", sellingPrice: "19.99", locationId: locRegional.id, supplierId: supTechParts.id, customFields: {}, createdAt: ts(15), updatedAt: ts(8) },
  ];
  await db.insert(items).values(seedItems);

  // Notification preferences
  await db.insert(notificationPrefs).values({
    workspaceId,
    lowStock: true,
    zeroStock: true,
    poReminder: true,
    poOverdue: true,
    requestUpdate: true,
  });

  // Initial notifications
  const seedNotifications = [
    { workspaceId, type: "zero_stock" as const, title: "Out of Stock", message: "Sticky Notes (STK-1005) is out of stock", isRead: false, referenceId: null, createdAt: ts(0.1) },
    { workspaceId, type: "low_stock" as const, title: "Low Stock", message: "Blue Pens Box (STK-1004) is running low (5 remaining)", isRead: false, referenceId: null, createdAt: ts(0.2) },
    { workspaceId, type: "low_stock" as const, title: "Low Stock", message: "Nitrile Gloves (STK-1009) is running low (2 remaining)", isRead: false, referenceId: null, createdAt: ts(0.3) },
    { workspaceId, type: "system" as const, title: "Welcome to SupplyIQ!", message: "Your workspace has been set up with sample data. Explore all features during your trial.", isRead: false, referenceId: null, createdAt: ts(0) },
  ];
  await db.insert(notifications).values(seedNotifications);

  console.log(`[SEED] Workspace ${workspaceId} seeded with demo data`);
}
