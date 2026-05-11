import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Pencil, Phone, Save, ShieldCheck, X } from "lucide-react";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { apiRequest, type OwnerSessionUser } from "@/lib/api";
import { formatPhoneForDisplay, getErrorMessage } from "@/lib/format";
import { useOwnerSession } from "@/lib/owner-auth";

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-sm";

export default function OwnerAccount() {
  const navigate = useNavigate();
  const { user, token, signOut, updateUser } = useOwnerSession();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState(user?.address ?? "");

  const updateProfile = useMutation({
    mutationFn: () =>
      apiRequest<{ user: OwnerSessionUser }>("/owner-auth/me", {
        method: "PATCH",
        token,
        body: { fullName: fullName.trim(), email: email.trim(), address: address.trim() },
      }),
    onSuccess: (result) => {
      updateUser(result.user);
      setIsEditing(false);
    },
  });

  function openEdit() {
    setFullName(user?.fullName ?? "");
    setEmail(user?.email ?? "");
    setAddress(user?.address ?? "");
    setIsEditing(true);
  }

  const initials =
    user?.fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "VC";

  return (
    <OwnerLayout>
      <section className="space-y-5 px-5 pb-6">
        <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-bold text-primary-foreground shadow-float">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-bold">{user?.fullName}</h1>
                <span className="rounded-full bg-card/80 px-3 py-1 text-xs font-semibold text-primary">
                  Pet owner
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{formatPhoneForDisplay(user?.mobile)}</p>
              <p className="label-eyebrow mt-3">Claimed with OTP</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {isEditing ? (
            <div className="index-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Edit Profile</h2>
                <button
                  type="button"
                  aria-label="Cancel profile editing"
                  onClick={() => setIsEditing(false)}
                  className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div>
                <label className="block">
                  <span className="text-sm font-semibold">Full name</span>
                  <input
                    className={`${inputCls} mt-1.5`}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-sm font-semibold">Email</span>
                  <span className="ml-1 text-xs text-muted-foreground">Optional</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={`${inputCls} mt-1.5`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="text-sm font-semibold">Address</span>
                  <span className="ml-1 text-xs text-muted-foreground">Optional</span>
                  <textarea
                    className={`${inputCls} mt-1.5 h-20 py-2`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Your home or delivery address"
                  />
                </label>
              </div>

              {updateProfile.isError ? (
                <p className="text-xs font-medium text-destructive">{getErrorMessage(updateProfile.error)}</p>
              ) : null}

              <Button
                type="button"
                variant="hero"
                className="w-full"
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending || !fullName.trim()}
              >
                <Save className="size-4" />
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openEdit}
              className="index-card flex w-full items-center gap-4 text-left"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Pencil className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Edit Profile</div>
                <div className="text-sm text-muted-foreground">
                  {user?.email ?? user?.address ?? "Update your name, email, or address."}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          )}

          <div className="index-card flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Phone className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Phone identity</div>
              <div className="text-sm text-muted-foreground">
                {formatPhoneForDisplay(user?.mobile)} is your current VetCard login number.
              </div>
            </div>
          </div>

          <div className="index-card flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Access model</div>
              <div className="text-sm text-muted-foreground">
                Clinics only see pets they created or were granted access to.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              signOut();
              navigate("/owner/login", { replace: true });
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-destructive/20 bg-card px-5 py-4 text-left transition-colors hover:border-destructive/40"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
              <LogOut className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Logout</div>
              <div className="text-sm text-muted-foreground">End this owner session on this device.</div>
            </div>
          </button>
        </section>
      </section>
    </OwnerLayout>
  );
}
