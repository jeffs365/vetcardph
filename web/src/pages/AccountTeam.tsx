import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, Mail, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, type StaffMember } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { formatRole, getErrorMessage, getInitials } from "@/lib/format";

export default function AccountTeam() {
  const { token, user } = useSession();
  const queryClient = useQueryClient();
  const canManageStaff = user?.role === "OWNER";
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: ["staff", "all"],
    queryFn: () => apiRequest<{ staff: StaffMember[] }>("/staff?includeInactive=true", { token }),
    enabled: Boolean(token) && canManageStaff,
  });

  const toggleStaff = useMutation({
    mutationFn: ({ staffId, isActive }: { staffId: string; isActive: boolean }) =>
      apiRequest(`/staff/${staffId}`, { method: "PATCH", token, body: { isActive } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      setConfirmingId(null);
    },
  });

  const allStaff = useMemo(() => staffQuery.data?.staff ?? [], [staffQuery.data?.staff]);
  const activeStaff = useMemo(() => allStaff.filter((m) => m.isActive), [allStaff]);
  const inactiveStaff = useMemo(() => allStaff.filter((m) => !m.isActive), [allStaff]);

  if (user?.role && !canManageStaff) {
    return <Navigate to="/account" replace />;
  }

  return (
    <AppLayout
      title="Clinic Team"
      titleHref={null}
      headerStart={
        <Link
          to="/account"
          aria-label="Back to account"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
    >
      <section className="space-y-8 px-5 pb-6 pt-4">
        <section>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold">Active Staff</h2>
                <StatusBadge tone="info">
                  {staffQuery.isLoading ? "Loading..." : `${activeStaff.length} active`}
                </StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                Everyone who can access {user?.clinicName ?? "this clinic workspace"}.
              </p>
            </div>
            {canManageStaff ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/account/team/new">
                  <Plus className="size-4" />
                  Add Staff
                </Link>
              </Button>
            ) : null}
          </div>

          {staffQuery.isLoading ? (
            <div className="index-card text-center text-muted-foreground">Loading team members...</div>
          ) : staffQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {getErrorMessage(staffQuery.error)}
            </div>
          ) : (
            <div className="index-card divide-y divide-border/70 p-0">
              {activeStaff.map((member) => {
                const isCurrentUser = member.id === user?.staffId;

                return (
                  <div key={member.id} className="flex items-center gap-4 px-4 py-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft font-bold text-primary">
                      {getInitials(member.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate font-semibold">{member.fullName}</div>
                        {isCurrentUser ? <StatusBadge tone="success">You</StatusBadge> : null}
                        <StatusBadge tone={member.role === "OWNER" ? "warn" : "neutral"}>{formatRole(member.role)}</StatusBadge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="size-4 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      {canManageStaff && !isCurrentUser && member.role !== "OWNER" ? (
                        <div className="mt-2">
                          {confirmingId === member.id ? (
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">Deactivate this member?</span>
                              <button
                                type="button"
                                onClick={() => toggleStaff.mutate({ staffId: member.id, isActive: false })}
                                disabled={toggleStaff.isPending}
                                className="text-xs font-semibold text-destructive disabled:opacity-50"
                              >
                                Yes, deactivate
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className="text-xs font-semibold text-muted-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingId(member.id)}
                              className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {inactiveStaff.length ? (
          <section>
            <div className="mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold">Inactive Staff</h2>
                <StatusBadge tone="neutral">{inactiveStaff.length} deactivated</StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                Deactivated members can no longer log in. Reactivate to restore access.
              </p>
            </div>
            <div className="index-card divide-y divide-border/70 p-0 opacity-75">
              {inactiveStaff.map((member) => (
                <div key={member.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted font-bold text-muted-foreground">
                    {getInitials(member.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-semibold text-muted-foreground">{member.fullName}</div>
                      <StatusBadge tone="neutral">{formatRole(member.role)}</StatusBadge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-4 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {canManageStaff ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleStaff.mutate({ staffId: member.id, isActive: true })}
                          disabled={toggleStaff.isPending}
                          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </AppLayout>
  );
}
