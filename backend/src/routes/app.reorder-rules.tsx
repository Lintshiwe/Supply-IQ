import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Save, Search, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { useItems, useCategories, useSuppliers } from "@/hooks/useInventoryData";
import { useDemo } from "@/hooks/useDemo";
import { useUpdateItem } from "@/hooks/useInventoryMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { toast } from "sonner";
import type { Item } from "@/types/inventory";

export const Route = createFileRoute("/app/reorder-rules")({
  component: ReorderRulesPage,
  head: () => ({
    meta: [
      { title: "Reorder Rules — SupplyIQ" },
      { name: "description", content: "Set per-item reorder points, alert thresholds, and order quantities." },
    ],
  }),
});

interface RowDraft {
  reorderPoint: number;
  reorderQuantity: number;
}

function statusFor(item: Item): "out" | "low" | "healthy" {
  if (item.currentStock <= 0) return "out";
  if (item.currentStock <= item.reorderPoint) return "low";
  return "healthy";
}

function StatusPill({ status }: { status: "out" | "low" | "healthy" }) {
  if (status === "out") {
    return (
      <Badge variant="outline" className="gap-1 border-[var(--stock-out)]/30 bg-[var(--stock-out)]/10 text-[var(--stock-out)]">
        <AlertCircle className="h-3 w-3" /> Out
      </Badge>
    );
  }
  if (status === "low") {
    return (
      <Badge variant="outline" className="gap-1 border-[var(--stock-low)]/30 bg-[var(--stock-low)]/10 text-[var(--stock-low)]">
        <AlertTriangle className="h-3 w-3" /> Low
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-[var(--stock-healthy)]/30 bg-[var(--stock-healthy)]/10 text-[var(--stock-healthy)]">
      <CheckCircle2 className="h-3 w-3" /> Healthy
    </Badge>
  );
}

function ReorderRulesPage() {
  const { data: items } = useItems();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { demoStore } = useDemo();
  const updateItem = useUpdateItem();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !i.sku.toLowerCase().includes(q)) return false;
      if (categoryId !== "all" && i.categoryId !== categoryId) return false;
      if (statusFilter !== "all" && statusFor(i) !== statusFilter) return false;
      return true;
    });
  }, [items, search, categoryId, statusFilter]);

  const summary = useMemo(() => {
    let out = 0, low = 0, healthy = 0;
    for (const i of items) {
      const s = statusFor(i);
      if (s === "out") out++;
      else if (s === "low") low++;
      else healthy++;
    }
    return { out, low, healthy, total: items.length };
  }, [items]);

  const dirtyCount = Object.keys(drafts).length;

  const setField = (id: string, field: keyof RowDraft, raw: string, item: Item) => {
    const value = Math.max(0, Math.floor(Number(raw) || 0));
    setDrafts((prev) => {
      const current = prev[id] ?? { reorderPoint: item.reorderPoint, reorderQuantity: item.reorderQuantity };
      const next = { ...current, [field]: value };
      // If matches original, drop draft
      if (next.reorderPoint === item.reorderPoint && next.reorderQuantity === item.reorderQuantity) {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const saveAll = () => {
    const entries = Object.entries(drafts);
    if (entries.length === 0) return;
    for (const [id, d] of entries) {
      demoStore?.updateItem(id, { reorderPoint: d.reorderPoint, reorderQuantity: d.reorderQuantity });
    }
    // Bump version once
    updateItem.mutate(
      { id: entries[0][0], updates: { reorderPoint: drafts[entries[0][0]].reorderPoint } },
      {
        onSuccess: () => {
          toast.success(`Updated reorder rules for ${entries.length} item${entries.length === 1 ? "" : "s"}`);
          setDrafts({});
        },
      },
    );
  };

  const discard = () => setDrafts({});

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reorder rules</h1>
          <p className="text-sm text-muted-foreground">
            Per-item thresholds drive low-stock alerts and reorder suggestions.
          </p>
        </div>
        {dirtyCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}</span>
            <Button size="sm" variant="ghost" onClick={discard}>Discard</Button>
            <Button size="sm" onClick={saveAll}>
              <Save className="mr-1.5 h-4 w-4" /> Save changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Items tracked" value={summary.total} />
        <SummaryCard label="Healthy" value={summary.healthy} tone="healthy" />
        <SummaryCard label="Low stock" value={summary.low} tone="low" />
        <SummaryCard label="Out of stock" value={summary.out} tone="out" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ErrorBoundary>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">On hand</th>
                  <th className="px-4 py-3 text-right font-medium">Reorder point</th>
                  <th className="px-4 py-3 text-right font-medium">Reorder qty</th>
                  <th className="px-4 py-3 text-left font-medium">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium">Lead time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No items match these filters.</td></tr>
                ) : (
                  filtered.map((item) => {
                    const draft = drafts[item.id];
                    const rp = draft?.reorderPoint ?? item.reorderPoint;
                    const rq = draft?.reorderQuantity ?? item.reorderQuantity;
                    const supplier = suppliers.find((s) => s.id === item.supplierId);
                    const status = item.currentStock <= 0 ? "out" : item.currentStock <= rp ? "low" : "healthy";
                    const isDirty = Boolean(draft);
                    return (
                      <tr key={item.id} className={`border-b border-border last:border-0 ${isDirty ? "bg-accent/10" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3"><StatusPill status={status} /></td>
                        <td className="px-4 py-3 text-right font-mono">{item.currentStock} <span className="text-muted-foreground">{item.unit}</span></td>
                        <td className="px-4 py-3 text-right">
                          <Input
                            type="number"
                            min={0}
                            value={rp}
                            onChange={(e) => setField(item.id, "reorderPoint", e.target.value, item)}
                            className="ml-auto h-8 w-24 text-right font-mono"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Input
                            type="number"
                            min={0}
                            value={rq}
                            onChange={(e) => setField(item.id, "reorderQuantity", e.target.value, item)}
                            className="ml-auto h-8 w-24 text-right font-mono"
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{supplier?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{supplier ? `${supplier.leadTimeDays}d` : "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ErrorBoundary>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Bell className="mt-0.5 h-4 w-4 text-accent-foreground" />
        <div>
          <p className="font-medium text-foreground">How alerts are calculated</p>
          <p>An item triggers a <span className="text-foreground">low-stock</span> alert when on-hand ≤ reorder point, and an <span className="text-foreground">out-of-stock</span> alert at zero. Reorder qty is suggested when generating purchase orders.</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "healthy" | "low" | "out" }) {
  const toneClass =
    tone === "out" ? "text-[var(--stock-out)]" :
    tone === "low" ? "text-[var(--stock-low)]" :
    tone === "healthy" ? "text-[var(--stock-healthy)]" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
