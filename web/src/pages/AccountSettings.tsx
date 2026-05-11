import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Building2, ChevronLeft, Save, UserRound } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest, type SessionUser } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";
import { toast } from "sonner";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(120, "Keep the name under 120 characters."),
  phone: z.string().trim().max(40, "Keep the phone number under 40 characters.").refine((value) => !value || value.length >= 7, {
    message: "Phone number must be at least 7 characters.",
  }),
});

const clinicSchema = z.object({
  clinicName: z.string().trim().min(2, "Clinic name is required.").max(120, "Keep the clinic name under 120 characters."),
  clinicPhone: z.string().trim().max(40, "Keep the phone number under 40 characters.").refine((value) => !value || value.length >= 7, {
    message: "Phone number must be at least 7 characters.",
  }),
  clinicAddress: z.string().trim().min(3, "Clinic address is required.").max(240, "Keep the address under 240 characters."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type ClinicFormValues = z.infer<typeof clinicSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

export default function AccountSettings() {
  const { token, user, updateSessionUser } = useSession();
  const canEditClinic = user?.role === "OWNER";

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
    },
  });

  const clinicForm = useForm<ClinicFormValues>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      clinicName: "",
      clinicPhone: "",
      clinicAddress: "",
    },
  });

  useEffect(() => {
    profileForm.reset({
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
    });
  }, [profileForm, user?.fullName, user?.phone]);

  useEffect(() => {
    clinicForm.reset({
      clinicName: user?.clinicName ?? "",
      clinicPhone: user?.clinicPhone ?? "",
      clinicAddress: user?.clinicAddress ?? "",
    });
  }, [clinicForm, user?.clinicAddress, user?.clinicName, user?.clinicPhone]);

  const updateProfile = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      apiRequest<{ user: SessionUser }>("/auth/me", {
        method: "PATCH",
        token,
        body: {
          fullName: values.fullName,
          phone: values.phone,
          email: user?.email ?? "",
        },
      }),
    onSuccess: (result) => {
      updateSessionUser(result.user);
      profileForm.reset({
        fullName: result.user.fullName,
        phone: result.user.phone ?? "",
      });
      toast.success("Profile updated.");
    },
  });

  const updateClinic = useMutation({
    mutationFn: (values: ClinicFormValues) =>
      apiRequest<{ user: SessionUser }>("/auth/clinic", {
        method: "PATCH",
        token,
        body: values,
      }),
    onSuccess: (result) => {
      updateSessionUser(result.user);
      clinicForm.reset({
        clinicName: result.user.clinicName,
        clinicPhone: result.user.clinicPhone ?? "",
        clinicAddress: result.user.clinicAddress ?? "",
      });
      toast.success("Clinic information updated.");
    },
  });

  const handleProfileSubmit = profileForm.handleSubmit((values) => updateProfile.mutate(values));
  const handleClinicSubmit = clinicForm.handleSubmit((values) => updateClinic.mutate(values));

  return (
    <AppLayout
      title="Settings"
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
            <h2 className="font-display text-xl font-bold">My Profile</h2>
            <p className="text-sm text-muted-foreground">Update the core contact details used for this account.</p>
          </div>

          <div className="index-card">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <UserRound className="size-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">Account details</h3>
                <p className="text-sm text-muted-foreground">These details are shown across the clinic workspace for your staff account.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <FormField label="Full Name" required error={profileForm.formState.errors.fullName?.message}>
                <input className={inputCls} autoComplete="name" {...profileForm.register("fullName")} />
              </FormField>

              <FormField label="Phone Number" error={profileForm.formState.errors.phone?.message}>
                <input
                  type="tel"
                  inputMode="tel"
                  className={inputCls}
                  autoComplete="tel"
                  placeholder="e.g. 09123456789"
                  {...profileForm.register("phone")}
                />
              </FormField>

              <FormField label="Email" hint="Can't be changed here">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  className={`${inputCls} cursor-not-allowed opacity-70`}
                  value={user?.email ?? ""}
                  disabled
                  readOnly
                />
              </FormField>

              {updateProfile.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(updateProfile.error)}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <Button type="submit" variant="hero" size="lg" disabled={updateProfile.isPending}>
                  <Save className="size-4" />
                  {updateProfile.isPending ? "Saving..." : "Save Profile"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    profileForm.reset({
                      fullName: user?.fullName ?? "",
                      phone: user?.phone ?? "",
                    })
                  }
                  disabled={updateProfile.isPending}
                >
                  Clear
                </Button>
              </div>
            </form>
          </div>
        </section>

        {canEditClinic ? (
          <section>
            <div className="mb-3">
              <h2 className="font-display text-xl font-bold">Clinic Information</h2>
              <p className="text-sm text-muted-foreground">Owners can update the clinic name, phone, and address shown throughout the workspace.</p>
            </div>

            <div className="index-card">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">Clinic profile</h3>
                  <p className="text-sm text-muted-foreground">This name appears in account screens and staff-facing workspace labels.</p>
                </div>
              </div>

              <form onSubmit={handleClinicSubmit} className="space-y-4">
                <FormField label="Clinic Name" required error={clinicForm.formState.errors.clinicName?.message}>
                  <input className={inputCls} autoComplete="organization" {...clinicForm.register("clinicName")} />
                </FormField>

                <FormField label="Clinic Phone" error={clinicForm.formState.errors.clinicPhone?.message}>
                  <input
                    type="tel"
                    inputMode="tel"
                    className={inputCls}
                    autoComplete="tel"
                    placeholder="e.g. 09123456789"
                    {...clinicForm.register("clinicPhone")}
                  />
                </FormField>

                <FormField label="Clinic Address" required error={clinicForm.formState.errors.clinicAddress?.message}>
                  <textarea
                    className={`${inputCls} h-24 py-2`}
                    autoComplete="street-address"
                    placeholder="Enter clinic address"
                    {...clinicForm.register("clinicAddress")}
                  />
                </FormField>

                {updateClinic.isError ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                    {getErrorMessage(updateClinic.error)}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                  <Button type="submit" variant="hero" size="lg" disabled={updateClinic.isPending}>
                    <Save className="size-4" />
                    {updateClinic.isPending ? "Saving..." : "Save Clinic Info"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      clinicForm.reset({
                        clinicName: user?.clinicName ?? "",
                        clinicPhone: user?.clinicPhone ?? "",
                        clinicAddress: user?.clinicAddress ?? "",
                      })
                    }
                    disabled={updateClinic.isPending}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </div>
          </section>
        ) : null}
      </section>
    </AppLayout>
  );
}
