import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail } from "lucide-react";
import { BrandLockup } from "@/components/BrandLockup";
import { Button } from "@/components/ui/button";
import clinicHeroIllustration from "@/assets/clinic-login-hero.png";
import { useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const inputClassName =
  "h-12 w-full rounded-2xl border border-success/35 bg-background pl-10 pr-3 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-success focus:ring-2 focus:ring-success/20";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isLoading } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const destination = (location.state as { from?: string } | null)?.from ?? "/home";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "reception@harborviewvet.ph",
      password: "password123",
    },
  });

  if (user && !isLoading) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await signIn({
        email: values.email,
        password: values.password,
      });
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <div className="app-shell">
      <div className="app-canvas">
        <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-7 pt-6">
          <div className="flex justify-center">
            <BrandLockup compact />
          </div>

          <div className="mt-10 flex justify-center">
            <img
              src={clinicHeroIllustration}
              alt="Clinic workflow with pets"
              className="h-48 w-60 object-contain sm:h-56 sm:w-72"
            />
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-2 rounded-[1.75rem] bg-card px-5 py-5 shadow-[0_18px_46px_-30px_hsl(var(--success)_/_0.5)]"
          >
            <h1 className="mx-auto max-w-[300px] text-center font-display text-[1.55rem] font-extrabold leading-tight text-primary">
              Manage Your Clinic’s Workflow
            </h1>
            <p className="mx-auto mt-3 max-w-[310px] text-center text-[15px] leading-6 text-foreground/80">
              Schedules, records, appointments, and staff access all stay here.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="label-eyebrow text-primary">
                  Email <span className="text-destructive">*</span>
                </span>
                <div className="relative mt-2">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    spellCheck={false}
                    {...form.register("email")}
                    className={inputClassName}
                    placeholder="Enter your email"
                  />
                </div>
                {form.formState.errors.email?.message ? (
                  <p className="mt-1.5 text-xs font-medium text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="label-eyebrow text-primary">
                  Password <span className="text-destructive">*</span>
                </span>
                <div className="relative mt-2">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    spellCheck={false}
                    {...form.register("password")}
                    className={inputClassName}
                    placeholder="Enter your password"
                  />
                </div>
                {form.formState.errors.password?.message ? (
                  <p className="mt-1.5 text-xs font-medium text-destructive">{form.formState.errors.password.message}</p>
                ) : null}
              </label>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-foreground/80">
                  <input type="checkbox" defaultChecked className="size-4 rounded accent-success" />
                  Remember me
                </label>
                <span className="font-semibold text-primary">Admin-assisted reset</span>
              </div>

              {submitError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-2xl bg-success text-base font-bold text-white shadow-[0_14px_26px_-16px_hsl(var(--success)_/_0.85)] hover:bg-success/90"
                disabled={form.formState.isSubmitting}
              >
                <Building2 className="size-5" /> Enter clinic workspace
              </Button>
            </div>
          </form>

          <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">
            Need a clinic workspace?{" "}
            <Link to="/clinic/register" className="font-bold text-success underline-offset-4 hover:underline">
              Create clinic workspace
            </Link>
          </p>

          <div className="mt-auto pt-9 text-center text-sm text-foreground">
            Looking for the pet owner app?{" "}
            <Link to="/owner/login" className="font-bold text-tertiary">
              Pet Owner Sign In
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
