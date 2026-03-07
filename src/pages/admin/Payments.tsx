import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, IndianRupee, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, profiles:user_id(full_name, phone)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const stats = {
    total: payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0,
    paid: payments?.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0) ?? 0,
    pending: payments?.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0) ?? 0,
    overdue: payments?.filter((p) => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0) ?? 0,
  };

  const filtered = payments?.filter((p: any) => {
    const matchesSearch =
      !search ||
      p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.phone?.includes(search);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading payments..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title="Payments" subtitle="Track and manage all payments" />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard title="Collected" value={formatCurrency(stats.paid)} icon={IndianRupee} changeType="positive" />
        <StatCard title="Pending" value={formatCurrency(stats.pending)} icon={Clock} changeType="neutral" />
        <StatCard title="Overdue" value={formatCurrency(stats.overdue)} icon={AlertTriangle} changeType="negative" />
        <StatCard title="Total" value={formatCurrency(stats.total)} icon={CreditCard} changeType="neutral" />
      </div>

      {/* Filters */}
      <div className="px-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by member name..." />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-card">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment List */}
      <div className="px-4 space-y-2">
        {filtered && filtered.length > 0 ? (
          filtered.map((payment: any) => (
            <Card key={payment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {payment.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(payment.created_at), "MMM d, yyyy")} · {payment.payment_method}
                    </p>
                    {payment.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(payment.due_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-bold text-foreground">₹{Number(payment.amount).toLocaleString()}</p>
                    <div className="mt-1">
                      <StatusBadge status={payment.status as "paid" | "pending" | "overdue"} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={CreditCard}
            title="No payments found"
            description={search ? "Try adjusting your search or filters" : "Payment records will appear here"}
          />
        )}
      </div>
    </div>
  );
}
