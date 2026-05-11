import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, MessageSquareText, Settings, ShieldCheck, Users2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { apiRequest, type StaffMember } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { formatRole, getErrorMessage, getInitials } from "@/lib/format";

export default function Account() {
  const navigate = useNavigate();
  const { token, user, signOut } = useSession();
  const isOwner = user?.role === "OWNER";
  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiRequest<{ staff: StaffMember[] }>("/staff", { token }),
    enabled: Boolean(token) && isOwner,
  });

  return (
    <AppLayout>
      <section className="space-y-5 px-5 pb-6 pt-5">
        <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-bold text-primary-foreground shadow-float">
              {getInitials(user?.fullName ?? "VetCard")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-bold">{user?.fullName}</h1>
                {user?.role ? <StatusBadge tone="info">{formatRole(user.role)}</StatusBadge> : null}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p>
              <p className="label-eyebrow mt-3">{user?.clinicName}</p>
            </div>
          </div>
        </section>

        {isOwner && staffQuery.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(staffQuery.error)}
          </div>
        ) : null}

        <section className="space-y-3">
          {isOwner ? (
            <Link
              to="/account/team"
              className="index-card flex items-center gap-4 transition-colors hover:border-primary/40"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Users2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Clinic Team</div>
                <div className="text-sm text-muted-foreground">
                  {staffQuery.isLoading
                    ? "Loading team members..."
                    : `${staffQuery.data?.staff.length ?? 0} active staff account${(staffQuery.data?.staff.length ?? 0) === 1 ? "" : "s"}.`}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ) : null}

          <Link
            to="/account/settings"
            className="index-card flex items-center gap-4 transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Settings className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Settings</div>
              <div className="text-sm text-muted-foreground">
                {isOwner ? "Update your profile and clinic information." : "Update your profile information."}
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          <Link
            to="/account/security"
            className="index-card flex items-center gap-4 transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Security</div>
              <div className="text-sm text-muted-foreground">Change your password and protect account access.</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          <Link
            to="/account/feedback"
            className="index-card flex items-center gap-4 transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <MessageSquareText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Feedback</div>
              <div className="text-sm text-muted-foreground">Report bugs, share ideas, and leave product feedback.</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          <button
            type="button"
            onClick={() => {
              signOut();
              navigate("/clinic/login", { replace: true });
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-destructive/20 bg-card px-5 py-4 text-left transition-colors hover:border-destructive/40"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
              <LogOut className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Logout</div>
              <div className="text-sm text-muted-foreground">End this clinic session on this device.</div>
            </div>
          </button>
        </section>
      </section>
    </AppLayout>
  );
}
