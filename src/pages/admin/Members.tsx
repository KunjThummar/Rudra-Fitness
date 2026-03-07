import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Users, MoreVertical, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

type MemberWithMembership = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  membership_status: string | null;
};

export default function MembersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: members, isLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (!profiles) return [];

      // Get active memberships for all members
      const { data: memberships } = await supabase
        .from("memberships")
        .select("user_id, status")
        .order("created_at", { ascending: false });

      const membershipMap = new Map<string, string>();
      memberships?.forEach((m) => {
        if (!membershipMap.has(m.user_id)) {
          membershipMap.set(m.user_id, m.status);
        }
      });

      return profiles.map((p) => ({
        ...p,
        membership_status: membershipMap.get(p.id) ?? null,
      })) as MemberWithMembership[];
    },
  });

  const filtered = members?.filter((m) => {
    const matchesSearch =
      !search ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "no-plan" && !m.membership_status) ||
      m.membership_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading members..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Members"
        subtitle={`${members?.length ?? 0} total members`}
        actionLabel="Add Member"
        actionIcon={UserPlus}
        onAction={() => navigate("/admin/members/add")}
      />

      <div className="px-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone..." />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-card">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="no-plan">No Plan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 space-y-2">
        {filtered && filtered.length > 0 ? (
          filtered.map((member) => (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => navigate(`/admin/members/${member.id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center text-base font-bold text-primary flex-shrink-0">
                    {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {member.full_name || "Unnamed"}
                      </p>
                      {member.membership_status ? (
                        <StatusBadge status={member.membership_status as "active" | "expired"} />
                      ) : (
                        <StatusBadge status="inactive" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {member.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Joined {format(new Date(member.created_at), "MMM yyyy")}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/admin/members/${member.id}`)}>
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/members/${member.id}/edit`)}>
                        Edit Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </button>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Users}
            title="No members found"
            description={search ? "Try adjusting your search or filters" : "Add your first gym member to get started"}
            actionLabel={!search ? "Add Member" : undefined}
            onAction={!search ? () => navigate("/admin/members/add") : undefined}
          />
        )}
      </div>
    </div>
  );
}
