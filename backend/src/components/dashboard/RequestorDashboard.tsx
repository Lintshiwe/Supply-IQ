import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Package, ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RequestFormSheet } from "@/components/requests/RequestFormSheet";
import { RequestsTable } from "@/components/requests/RequestsTable";
import { RequestDetailSheet } from "@/components/requests/RequestDetailSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useItems, useRequests } from "@/hooks/useInventoryData";
import { useAuth } from "@/hooks/useAuth";
import { RequestStatus } from "@/types/inventory";
import type { InventoryRequest } from "@/types/inventory";
import { format } from "date-fns";

export function RequestorDashboard() {
  const { data: items } = useItems();
  const { data: requests } = useRequests();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<InventoryRequest | null>(null);

  const userName = user?.name || "";

  const myRequests = requests.filter((r) =>
    r.requestedBy.toLowerCase() === userName.toLowerCase()
  );

  const pendingCount = myRequests.filter((r) => r.status === RequestStatus.Pending).length;
  const approvedCount = myRequests.filter((r) => r.status === RequestStatus.Approved).length;
  const fulfilledCount = myRequests.filter((r) => r.status === RequestStatus.Fulfilled || r.status === RequestStatus.PartiallyFulfilled).length;
  const declinedCount = myRequests.filter((r) => r.status === RequestStatus.Declined).length;

  const recentRequests = [...myRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const lowStockItems = items.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint).slice(0, 5);

  function handleRowClick(req: InventoryRequest) {
    setDetailRequest(req);
    setDetailOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track your inventory requests and stock needs.</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Request
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="My Requests" value={myRequests.length} accentColor="neutral" icon={FileText} />
          <MetricCard label="Pending" value={pendingCount} accentColor="warning" icon={Clock} />
          <MetricCard label="Approved" value={approvedCount + fulfilledCount} accentColor="healthy" icon={CheckCircle2} />
          <MetricCard label="Declined" value={declinedCount} accentColor="danger" icon={XCircle} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My Recent Requests</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/requests" })}>
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentRequests.length > 0 ? (
              <RequestsTable requests={recentRequests} onRowClick={handleRowClick} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
                <FileText className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No requests yet.</p>
                <Button variant="link" size="sm" onClick={() => setFormOpen(true)} className="mt-1">
                  Create your first request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Items Needing Restock</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/catalog" })}>
              Browse Catalog <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-stock-low/10">
                      <Package className="h-4 w-4 text-stock-low" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-medium text-stock-low">
                        {item.currentStock}
                      </span>
                      <span className="text-xs text-muted-foreground"> / {item.reorderPoint}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-stock-healthy" />
                <p className="text-sm text-muted-foreground">All items are well stocked.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RequestFormSheet open={formOpen} onOpenChange={setFormOpen} items={items} />
      <RequestDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={detailRequest}
        items={items}
        canApprove={false}
        onApprove={() => {}}
        onDecline={() => {}}
        onPartial={() => {}}
      />
    </div>
  );
}
