import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Package, Truck, ClipboardList, FileText, MapPin } from "lucide-react";
import { useItems, useSuppliers, usePurchaseOrders, useLocations } from "@/hooks/useInventoryData";
import { StatusBadge } from "@/components/StatusBadge";
import type { Item, Supplier, PurchaseOrder, Location } from "@/types/inventory";

function stockStatus(item: Item) {
  if (item.currentStock === 0) return "out-of-stock" as const;
  if (item.currentStock <= item.reorderPoint) return "low-stock" as const;
  return "in-stock" as const;
}

export function DashboardSearch() {
  const { data: items } = useItems();
  const { data: suppliers } = useSuppliers();
  const { data: orders } = usePurchaseOrders();
  const { data: locations } = useLocations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { items: [], suppliers: [], orders: [], locations: [] };

    return {
      items: items.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || (i.barcode && i.barcode.includes(q))).slice(0, 4),
      suppliers: suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.contactName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)).slice(0, 3),
      orders: orders.filter((o) => o.orderNumber.toLowerCase().includes(q) || o.status.toLowerCase().includes(q)).slice(0, 3),
      locations: locations.filter((l) => l.name.toLowerCase().includes(q) || l.type.toLowerCase().includes(q)).slice(0, 2),
    };
  }, [query, items, suppliers, orders, locations]);

  const totalResults = results.items.length + results.suppliers.length + results.orders.length + results.locations.length;

  const handleSelectItem = (item: Item) => { setQuery(""); setOpen(false); navigate({ to: "/app/catalog", search: { item: item.id } }); };
  const handleSelectSupplier = (s: Supplier) => { setQuery(""); setOpen(false); navigate({ to: "/app/suppliers", search: { supplier: s.id } }); };
  const handleSelectOrder = (o: PurchaseOrder) => { setQuery(""); setOpen(false); navigate({ to: "/app/purchase-orders", search: { po: o.id } }); };

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-card px-3 transition-colors focus-within:border-primary">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search items, suppliers, orders, locations..."
          className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            esc
          </kbd>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full z-40 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-80 overflow-y-auto">
          {totalResults === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results for "<strong>{query}</strong>"
            </p>
          ) : (
            <div className="py-1">
              {results.items.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Items</p>
                  {results.items.map((item) => (
                    <button key={item.id} type="button" onClick={() => handleSelectItem(item)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50">
                      <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.sku}</span>
                      <StatusBadge status={stockStatus(item)} />
                    </button>
                  ))}
                </>
              )}
              {results.suppliers.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider border-t border-border mt-1">Suppliers</p>
                  {results.suppliers.map((s) => (
                    <button key={s.id} type="button" onClick={() => handleSelectSupplier(s)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50">
                      <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.leadTimeDays}d</span>
                    </button>
                  ))}
                </>
              )}
              {results.orders.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider border-t border-border mt-1">Purchase Orders</p>
                  {results.orders.map((o) => (
                    <button key={o.id} type="button" onClick={() => handleSelectOrder(o)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50">
                      <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{o.orderNumber}</span>
                      <span className="shrink-0 text-xs text-muted-foreground capitalize">{o.status}</span>
                    </button>
                  ))}
                </>
              )}
              {results.locations.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider border-t border-border mt-1">Locations</p>
                  {results.locations.map((l) => (
                    <button key={l.id} type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground capitalize">{l.type}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
