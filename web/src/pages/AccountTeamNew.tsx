import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest, type StaffMember, type StaffRole } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";

const createStaffSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required."),
    email: z.string().trim().toLowerCase().email("Use a valid email."),
    phone: z.string().trim().max(40, "Keep the phone number under 40 characters.").refine((value) => !value || value.length >= 7, {
      message: "Phone number must be at least 7 characters.",
    }),
    role: z.enum(["VETERINARIAN", "ASSISTANT", "RECEPTIONIST"], {
      required_error: "Role is required.",
    }),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm the password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type CreateStaffFormValues = z.infer<typeof createStaffSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

const staffRoleOptions: Array<{ value: Exclude<StaffRole, "OWNER">; label: string }> = [
  { value: "VETERINARIAN", label: "Veterinarian" },
  { value: "ASSISTANT", label: "Assistant" },
  { value: "RECEPTIONIST", label: "Receptionist" },
];

export default function AccountTeamNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user } = useSession();
  const canManageStaff = user?.role === "OWNER";

  const createStaffForm = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "VETERINARIAN",
      password: "",
      confirmPassword: "",
    },
  });

  const createStaff = useMutation({
    mutationFn: (values: CreateStaffFormValues) =>
      apiRequest<{ staff: StaffMember }>("/staff", {
        method: "POST",
        token,
        body: {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          role: values.role,
          password: values.password,
        },
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(`${result.staff.fullName} added to the clinic workspace.`);
      navigate("/account/team", { replace: true });
    },
  });

  const handleCreateStaffSubmit = createStaffForm.handleSubmit((values) => createStaff.mutate(values));

  if (user?.role && !canManageStaff) {
    return <Navigate to="/account" replace />;
  }

  return (
    <AppLayout
      title="Add Staff"
      titleHref={null}
      headerStart={
        <Link
          to="/account/team"
          aria-label="Back to clinic team"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
    >
      <section className="space-y-6 px-5 pb-6 pt-4">
        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl font-bold">New Staff Account</h2>
            <p className="text-sm text-muted-foreground">
              Create a clinic login for a veterinarian, assistant, or receptionist and share the initial password directly.
            </p>
          </div>

          <div className="index-card">
            <form onSubmit={handleCreateStaffSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Full Name" required error={createStaffForm.formState.errors.fullName?.message}>
                  <input className={inputCls} placeholder="e.g. Maria Santos" {...createStaffForm.register("fullName")} />
                </FormField>

                <FormField label="Email" required error={createStaffForm.formState.errors.email?.message}>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={inputCls}
                    placeholder="e.g. maria@clinic.com"
                    {...createStaffForm.register("email")}
                  />
                </FormField>
              </div>

              <FormField label="Phone Number" error={createStaffForm.formState.errors.phone?.message}>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputCls}
                  placeholder="e.g. 09123456789"
                  {...createStaffForm.register("phone")}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Role" required error={createStaffForm.formState.errors.role?.message}>
                  <select className={inputCls} {...createStaffForm.register("role")}>
                    {staffRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Initial Password" required error={createStaffForm.formState.errors.password?.message}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    spellCheck={false}
                    className={inputCls}
                    placeholder="At least 8 characters"
                    {...createStaffForm.register("password")}
                  />
                </FormField>

                <FormField label="Confirm Password" required error={createStaffForm.formState.errors.confirmPassword?.message}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    spellCheck={false}
                    className={inputCls}
                    placeholder="Repeat password"
                    {...createStaffForm.register("confirmPassword")}
                  />
                </FormField>
              </div>

              {createStaff.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(createStaff.error)}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <Button type="submit" variant="hero" size="lg" disabled={createStaff.isPending}>
                  <Plus className="size-4" />
                  {createStaff.isPending ? "Adding Staff..." : "Create Staff Account"}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => navigate("/account/team")} disabled={createStaff.isPending}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
