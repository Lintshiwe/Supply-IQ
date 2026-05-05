export interface TutorialStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  icon?: string;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  route: string;
  steps: TutorialStep[];
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    description: "Learn the basics of SupplyIQ in 5 steps",
    route: "/app/dashboard",
    steps: [
      { target: "sidebar", title: "Navigation", description: "Use the sidebar to navigate between sections. Each section manages a different part of your inventory.", position: "right" },
      { target: "search", title: "Command Palette", description: "Press Ctrl+K (or Cmd+K) to open the command palette. Search for items, navigate pages, and perform actions instantly.", position: "bottom" },
      { target: "metrics", title: "Dashboard Metrics", description: "These cards show your inventory health at a glance — total SKUs, in-stock, low-stock, and out-of-stock counts.", position: "bottom" },
      { target: "needs-attention", title: "Needs Attention", description: "Items needing action appear here — low stock alerts, overdue purchase orders, and pending requests.", position: "left" },
      { target: "", title: "You're Ready!", description: "Explore each section to master your inventory. Hover over any element for helpful tooltips.", position: "top" },
    ],
  },
  {
    id: "catalog-management",
    name: "Catalog Management",
    description: "Master product catalog operations",
    route: "/app/catalog",
    steps: [
      { target: "catalog-table", title: "Product Catalog", description: "All your inventory items are listed here. Click any row to view full details.", position: "bottom" },
      { target: "catalog-filters", title: "Filters & Search", description: "Filter items by category, supplier, location, or status. Use the search bar to find specific SKUs.", position: "bottom" },
      { target: "catalog-actions", title: "Item Actions", description: "Create new items, import from CSV, export to CSV, or perform bulk actions on selected items.", position: "bottom" },
      { target: "catalog-sort", title: "Sorting", description: "Click column headers to sort items by name, SKU, quantity, or category. Click again to reverse.", position: "top" },
      { target: "", title: "Pro Tip", description: "Use Ctrl+K and type a SKU or item name to jump directly to any item's detail view.", position: "top" },
    ],
  },
  {
    id: "purchase-orders",
    name: "Purchase Orders",
    description: "Create and manage purchase orders",
    route: "/app/purchase-orders",
    steps: [
      { target: "po-stats", title: "Order Summary", description: "Quick overview of your purchase orders — draft, submitted, partial, received, and cancelled counts.", position: "bottom" },
      { target: "po-actions", title: "Create PO", description: "Click 'New PO' to create a purchase order. Select a supplier, add line items, and submit.", position: "bottom" },
      { target: "po-filters", title: "Filter Orders", description: "Filter by supplier, status, or date range to find specific purchase orders.", position: "bottom" },
      { target: "po-table", title: "Order Table", description: "Each row shows order number, supplier, status, total cost, and delivery date. Click to see details.", position: "top" },
      { target: "", title: "Receiving", description: "When stock arrives, open the PO detail view and use 'Receive Shipment' to update stock levels.", position: "top" },
    ],
  },
  {
    id: "movements-track",
    name: "Stock Movements",
    description: "Track every stock change",
    route: "/app/movements",
    steps: [
      { target: "movement-stats", title: "Movement Statistics", description: "See the volume of received, shipped, adjusted, and transferred items over time.", position: "bottom" },
      { target: "movement-actions", title: "Log Movement", description: "Click 'Log Movement' to record a new stock change — received, shipped, adjusted, or transferred.", position: "bottom" },
      { target: "movement-filters", title: "Filter Movements", description: "Filter by type, item, performer, or date range to find specific movements.", position: "bottom" },
      { target: "", title: "Movement Types", description: "Received: stock added. Shipped: stock removed. Adjusted: correction. Transferred: moved between locations.", position: "top" },
    ],
  },
  {
    id: "analytics-guide",
    name: "Analytics & Reports",
    description: "Get insights from your data",
    route: "/app/analytics",
    steps: [
      { target: "analytics-tabs", title: "Analytics Views", description: "Switch between Stock Overview and Supplier analytics to get different perspectives.", position: "bottom" },
      { target: "analytics-filters", title: "Date & Category Filters", description: "Filter analytics by category, supplier, location, and time period to drill down.", position: "bottom" },
      { target: "analytics-charts", title: "Charts & Graphs", description: "Visual breakdowns of stock by category, status distribution, and movement trends.", position: "top" },
      { target: "analytics-export", title: "Export Reports", description: "Click 'Export CSV' to download your analytics data for external reporting.", position: "bottom" },
    ],
  },
];
