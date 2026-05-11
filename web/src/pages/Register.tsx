import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { BrandLockup } from "@/components/BrandLockup";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";
import { useSession } from "@/lib/auth";
import { scrollFirstFormError } from "@/lib/form-scroll";
import { getErrorMessage } from "@/lib/format";

const registerSchema = z.object({
  clinicName: z.string().trim().min(2, "Clinic name is required."),
  clinicPhone: z.string().trim().max(40, "Keep the phone number under 40 characters.").refine((value) => !value || value.length >= 7, {
    message: "Phone number must be at least 7 characters.",
  }),
  clinicAddress: z.string().trim().min(3, "Clinic address is required."),
  ownerName: z.string().trim().min(2, "Owner/admin name is required."),
  ownerPhone: z.string().trim().max(40, "Keep the phone number under 40 characters.").refine((value) => !value || value.length >= 7, {
    message: "Phone number must be at least 7 characters.",
  }),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const inputClassName =
  "w-full h-12 pl-10 pr-3 rounded-lg border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

export default function Register() {
  const navigate = useNavigate();
  const { registerClinic, user } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      clinicName: "",
      clinicPhone: "",
      clinicAddress: "",
      ownerName: "",
      ownerPhone: "",
      email: "",
      password: "",
    },
  });

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = form.handleSubmit(
    async (values) => {
      setSubmitError(null);

      try {
        await registerClinic({
          clinicName: values.clinicName,
          clinicPhone: values.clinicPhone,
          clinicAddress: values.clinicAddress,
          ownerName: values.ownerName,
          ownerPhone: values.ownerPhone,
          email: values.email,
          password: values.password,
        });
        navigate("/home", { replace: true });
      } catch (error) {
        setSubmitError(getErrorMessage(error));
      }
    },
    (errors) => scrollFirstFormError(errors),
  );

  return (
    <div className="app-shell">
      <div className="app-canvas h-[100dvh] min-h-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-6 pb-28 pt-10">
          <BrandLockup />
          <h1 className="mt-5 font-display text-3xl font-bold text-primary tracking-tight">
            Start your clinic workspace
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            Create the clinic owner account first, then invite staff later.
          </p>

          <form id="clinic-register-form" onSubmit={handleSubmit} className="w-full mt-10 index-card space-y-5 shadow-soft">
            <FormField label="Clinic name" required error={form.formState.errors.clinicName?.message}>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  {...form.register("clinicName")}
                  className={inputClassName}
                  placeholder="Enter clinic name"
                />
              </div>
            </FormField>

            <FormField label="Clinic phone" error={form.formState.errors.clinicPhone?.message}>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  {...form.register("clinicPhone")}
                  className={inputClassName}
                  placeholder="Enter clinic phone number"
                />
              </div>
            </FormField>

            <FormField label="Clinic address" required error={form.formState.errors.clinicAddress?.message}>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-4 size-4 text-muted-foreground" />
                <textarea
                  {...form.register("clinicAddress")}
                  className={`${inputClassName} h-24 py-3 pl-10`}
                  placeholder="Enter clinic address"
                />
              </div>
            </FormField>

            <FormField label="Owner/admin name" required error={form.formState.errors.ownerName?.message}>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  {...form.register("ownerName")}
                  className={inputClassName}
                  placeholder="Enter owner name"
                />
              </div>
            </FormField>

            <FormField label="Owner/admin phone" error={form.formState.errors.ownerPhone?.message}>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  {...form.register("ownerPhone")}
                  className={inputClassName}
                  placeholder="Enter phone number"
                />
              </div>
            </FormField>

            <FormField label="Owner email" required error={form.formState.errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  {...form.register("email")}
                  className={inputClassName}
                  placeholder="Enter email address"
                />
              </div>
            </FormField>

            <FormField label="Password" required error={form.formState.errors.password?.message}>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  {...form.register("password")}
                  className={inputClassName}
                  placeholder="Create a password"
                />
              </div>
            </FormField>

            {submitError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have a workspace?{" "}
            <Link to="/clinic/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </main>
        <div className="sticky bottom-0 z-20 border-t border-border/70 bg-background/95 px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-14px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-md">
          <Button form="clinic-register-form" type="submit" variant="hero" size="lg" className="w-full rounded-xl" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating clinic..." : "Create clinic"}
          </Button>
        </div>
      </div>
    </div>
  );
}
