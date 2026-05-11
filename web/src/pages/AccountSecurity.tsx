import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ChevronLeft, KeyRound, ShieldCheck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";
import { toast } from "sonner";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm the new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from your current password.",
    path: ["newPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

export default function AccountSecurity() {
  const { token } = useSession();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      apiRequest("/auth/change-password", {
        method: "POST",
        token,
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      }),
    onSuccess: () => {
      form.reset();
      toast.success("Password updated.");
    },
  });

  const handlePasswordSubmit = form.handleSubmit((values) => changePassword.mutate(values));

  return (
    <AppLayout
      title="Security"
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
      <section className="space-y-6 px-5 pb-6 pt-4">
        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl font-bold">Password</h2>
            <p className="text-sm text-muted-foreground">Change your password and keep this clinic account protected.</p>
          </div>

          <div className="index-card">
            <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Session on this device is active
              </div>
              <div className="mt-1">Change your password here if access needs to be refreshed or this device is shared.</div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <FormField label="Current Password" required error={form.formState.errors.currentPassword?.message}>
                <input
                  type="password"
                  autoComplete="current-password"
                  spellCheck={false}
                  className={inputCls}
                  {...form.register("currentPassword")}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="New Password" required error={form.formState.errors.newPassword?.message}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    spellCheck={false}
                    className={inputCls}
                    {...form.register("newPassword")}
                  />
                </FormField>

                <FormField label="Confirm New Password" required error={form.formState.errors.confirmPassword?.message}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    spellCheck={false}
                    className={inputCls}
                    {...form.register("confirmPassword")}
                  />
                </FormField>
              </div>

              {changePassword.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(changePassword.error)}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <Button type="submit" variant="hero" size="lg" disabled={changePassword.isPending}>
                  <KeyRound className="size-4" />
                  {changePassword.isPending ? "Updating..." : "Update Password"}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => form.reset()} disabled={changePassword.isPending}>
                  Clear
                </Button>
              </div>
            </form>
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
