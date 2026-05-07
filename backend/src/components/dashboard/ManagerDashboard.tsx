import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Package, CheckCircle2, AlertTriangle, XCircle,
  ClipboardList, Clock, ArrowRight, Users, Truck, BarChart3,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DashboardReorderSection } from "@/components/insights/DashboardReorderSection";
import { DashboardAnomalySection } from "@/components/insights/DashboardAnomalySection";
import { RequestsTable } from "@/components/requests/RequestsTable";
import { RequestDetailSheet } from "@/components/requests/RequestDetailSheet";
import { useApprovalActions } from "@/components/requests/ApprovalActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockSummary, useItems, useRequests, useSuppliers } from "@/hooks/useInventoryData";
import { usePermissions } from "@/hooks/usePermissions";
import { RequestStatus } from "@/types/inventory";
import type { InventoryRequest } from "@/types/inventory";

export function ManagerDashboard() {
  const { data: summary } = useStockSummary();
  const { data: items } = useItems();
  const { data: requests } = useRequests();
  const { data: suppliers } = useSuppliers();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<InventoryRequest | null>(null);

  const approval = useApprovalActions({ items });

  const pendingRequests = requests
    .filter((r) => r.status === RequestStatus.Pending)
    .sort((a, b) => {
      if (a.priority === "urgent" && b.priority !== "urgent") return -1;
      if (b.priority === "urgent" && a.priority !== "urgent") return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 5);

  const activeSuppliers = suppliers.filter((s) => s.isActive).length;
  const pendingCount = requests.filter((r) => r.status === RequestStatus.Pending).length;

  function handleRowClick(req: InventoryRequest) {
    setDetailRequest(req);
    setDetailOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of inventory health, pending approvals, and team activity.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total SKUs" value={summary.total} accentColor="neutral" icon={Package} />
          <MetricCard label="In stock" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} />
          <MetricCard label="Low stock" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} />
          <MetricCard label="Out of stock" value={summary.outOfStock} accentColor="danger" icon={XCircle} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-stock-low" />
                Pending Approvals
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/requests" })}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingRequests.length > 0 ? (
                <RequestsTable requests={pendingRequests} onRowClick={handleRowClick} showRequestor preSorted />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
                  <CheckCircle2 className="mb-2 h-8 w-8 text-stock-healthy" />
                  <p className="text-sm text-muted-foreground">No pending requests to review.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div><NeedsAttention /></div>
            <div><RecentActivity /></div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Active Suppliers</p>
                  <p className="font-mono text-lg font-semibold">{activeSuppliers}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-warning/10">
                  <ClipboardList className="h-4 w-4 text-stock-low" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="font-mono text-lg font-semibold">{pendingCount}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/requests" })}>
                  Review
                </Button>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-healthy/10">
                  <Package className="h-4 w-4 text-stock-healthy" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Inventory Health</p>
                  <p className="font-mono text-lg font-semibold">
                    {summary.total > 0 ? Math.round((summary.inStock / summary.total) * 100) : 0}%
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/catalog" })}>
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate({ to: "/app/requests" })}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Review Approvals
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate({ to: "/app/catalog" })}>
                <Package className="mr-2 h-4 w-4" />
                Manage Catalog
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate({ to: "/app/movements" })}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Log Movement
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate({ to: "/app/analytics" })}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate({ to: "/app/suppliers" })}>
                <Truck className="mr-2 h-4 w-4" />
                Manage Suppliers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <RequestDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={detailRequest}
        items={items}
        canApprove={can("approve_request")}
        onApprove={approval.openApprove}
        onDecline={approval.openDecline}
        onPartial={approval.openPartial}
      />

      {approval.renderDialogs()}
    </div>
  );
}
