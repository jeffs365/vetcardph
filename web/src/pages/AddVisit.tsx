import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Pill, Save, Scale, Stethoscope, UserRound, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest, type AppointmentRecord, type PetDetail, type StaffMember, type VisitRecord } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { scrollFirstFormError } from "@/lib/form-scroll";
import { formatDate, formatTime, getErrorMessage, toDateInputValue } from "@/lib/format";
import { readReturnTo } from "@/lib/navigation";
import { toast } from "sonner";

const visitSchema = z.object({
  visitDate: z.string().min(1, "Visit date is required."),
  attendedById: z.string().min(1, "Select attending staff."),
  weightKg: z.union([z.coerce.number().positive("Weight must be greater than 0.").max(200, "Weight looks too high."), z.literal("")]).optional(),
  reasonForVisit: z.string().trim().min(2, "Reason for visit is required."),
  findingsNotes: z.string().trim().min(2, "Findings are required."),
  treatmentGiven: z.string().trim().min(2, "Treatment is required."),
  diagnosis: z.string().optional(),
  followUpNotes: z.string().optional(),
  appointmentId: z.string().optional(),
});

type VisitFormValues = z.infer<typeof visitSchema>;

const inputCls = "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

type VisitWithPet = VisitRecord & { pet: { id: string; name: string } };

export default function AddVisit() {
  const { id = "", visitId = "" } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { token, user } = useSession();
  const isEditing = Boolean(visitId);
  const requestedAppointmentId = searchParams.get("appointmentId") ?? "";
  const returnTo = readReturnTo(location.state) ?? `/pets/${id}`;

  const visitQuery = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => apiRequest<{ visit: VisitWithPet }>(`/visits/${visitId}`, { token }),
    enabled: Boolean(token && visitId && isEditing),
  });
  const petQuery = useQuery({
    queryKey: ["pet", id],
    queryFn: () => apiRequest<{ pet: PetDetail }>(`/pets/${id}`, { token }),
    enabled: Boolean(token && id && !isEditing),
  });
  const visit = visitQuery.data?.visit ?? null;
  const appointmentId = requestedAppointmentId || visit?.appointmentId || "";
  const cannotEditVisit = isEditing && Boolean(visit) && visit.recordedHere === false;

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiRequest<{ staff: StaffMember[] }>("/staff", { token }),
    enabled: Boolean(token),
  });
  const appointmentQuery = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => apiRequest<{ appointment: AppointmentRecord }>(`/appointments/${appointmentId}`, { token }),
    enabled: Boolean(token && appointmentId),
  });

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      visitDate: toDateInputValue(new Date().toISOString()),
      attendedById: "",
      weightKg: "",
      reasonForVisit: "",
      findingsNotes: "",
      treatmentGiven: "",
      diagnosis: "",
      followUpNotes: "",
      appointmentId: appointmentId || "",
    },
  });

  useEffect(() => {
    if (!isEditing || !visit) {
      return;
    }

    form.reset({
      visitDate: toDateInputValue(visit.visitDate),
      attendedById: visit.attendedBy?.id ?? "",
      weightKg: visit.weightKg ?? "",
      reasonForVisit: visit.reasonForVisit,
      findingsNotes: visit.findingsNotes,
      treatmentGiven: visit.treatmentGiven,
      diagnosis: visit.diagnosis ?? "",
      followUpNotes: visit.followUpNotes ?? "",
      appointmentId: visit.appointmentId ?? "",
    });
  }, [form, isEditing, visit]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (!form.getValues("attendedById") && user && staffQuery.data?.staff.length) {
      const currentStaff = staffQuery.data.staff.find((staff) => staff.id === user.staffId);
      const clinicalStaff =
        currentStaff?.role === "VETERINARIAN" || currentStaff?.role === "ASSISTANT"
          ? currentStaff
          : staffQuery.data.staff.find((staff) => staff.role === "VETERINARIAN" || staff.role === "ASSISTANT");

      if (clinicalStaff) {
        form.setValue("attendedById", clinicalStaff.id);
      }
    }
  }, [form, isEditing, staffQuery.data?.staff, user]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    const appointment = appointmentQuery.data?.appointment;
    if (!appointment) {
      return;
    }

    form.setValue("visitDate", toDateInputValue(appointment.scheduledFor));
    form.setValue("appointmentId", appointment.id);

    if (!form.getValues("reasonForVisit")) {
      form.setValue("reasonForVisit", appointment.reason);
    }
  }, [appointmentQuery.data?.appointment, form, isEditing]);

  const saveVisit = useMutation({
    mutationFn: (values: VisitFormValues) =>
      apiRequest<{ visit: { id: string } }>(isEditing ? `/visits/${visitId}` : `/pets/${id}/visits`, {
        method: isEditing ? "PUT" : "POST",
        token,
        body: values,
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["pet", id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["appointment-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      toast.success(isEditing ? "Visit updated." : "Visit recorded.");
      nav(`/pets/${id}/visits/${result.visit.id}`, { state: { from: returnTo } });
    },
  });

  const handleSubmit = form.handleSubmit(
    (values) => saveVisit.mutate(values),
    (errors) => scrollFirstFormError(errors),
  );
  const petName = isEditing ? visit?.pet?.name : petQuery.data?.pet.name;
  const pageTitle = isEditing ? "Edit Visit" : `New Visit${petName ? ` for ${petName}` : ""}`;

  const isFormLoading = (isEditing ? visitQuery.isLoading : petQuery.isLoading) || staffQuery.isLoading || appointmentQuery.isLoading;
  const isFormError = (isEditing ? visitQuery.isError : petQuery.isError) || staffQuery.isError || appointmentQuery.isError;
  const canShowForm = !isFormLoading && !isFormError && !(isEditing && !visit) && !cannotEditVisit;

  return (
    <AppLayout showChrome={false} scrollContent={false}>
      <div className="flex h-full min-h-0 flex-col">
      <header className="z-20 bg-background/85 backdrop-blur-md border-b border-border/60 h-16 px-5 grid grid-cols-[auto_1fr_auto] items-center">
        <Link
          to={returnTo}
          aria-label={isEditing ? "Close visit editor" : "Close visit form"}
          className="size-10 -ml-2 flex items-center justify-center text-foreground/70"
        >
          <X className="size-5" />
        </Link>
        <h1 className="text-center font-display font-bold text-foreground text-lg">
          {pageTitle}
        </h1>
        <span className="size-10" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
      {isFormLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading visit form...</div>
      ) : isFormError ? (
        <div className="p-5">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage((isEditing ? visitQuery.error : petQuery.error) ?? staffQuery.error ?? appointmentQuery.error)}
          </div>
        </div>
      ) : isEditing && !visit ? (
        <div className="p-8 text-center text-muted-foreground">Visit record not found.</div>
      ) : cannotEditVisit ? (
        <div className="p-5">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            Only visit records created in this clinic can be edited here.
          </div>
        </div>
      ) : (
          <form id="visit-form" onSubmit={handleSubmit} className="p-5 pb-28 space-y-5">
            {appointmentQuery.data?.appointment ? (
              <section className="index-card space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-lg font-bold">Linked Appointment</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(appointmentQuery.data.appointment.scheduledFor)} · {formatTime(appointmentQuery.data.appointment.scheduledFor)}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/appointments/${appointmentQuery.data.appointment.id}/edit`} state={{ from: returnTo }}>Edit</Link>
                  </Button>
                </div>
                <div className="rounded-2xl bg-secondary px-4 py-3">
                  <div className="font-semibold">{appointmentQuery.data.appointment.reason}</div>
                  <div className="mt-3 label-eyebrow">Booking notes</div>
                  <div className="mt-1 text-sm text-muted-foreground">{appointmentQuery.data.appointment.notes}</div>
                </div>
              </section>
            ) : null}

        <section className="index-card space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Date of Visit" required error={form.formState.errors.visitDate?.message}>
              <div className="relative mt-2">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input type="date" className={`${inputCls} pl-10`} {...form.register("visitDate")} />
              </div>
            </FormField>

            <FormField label="Attending Staff" required error={form.formState.errors.attendedById?.message}>
              <div className="relative mt-2">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <select className={`${inputCls} pl-10`} {...form.register("attendedById")}>
                  <option value="">Select staff</option>
                  {staffQuery.data?.staff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </FormField>
          </div>

          <FormField label="Visit Weight" hint="Optional" error={form.formState.errors.weightKg?.message}>
            <div className="relative mt-2">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="200"
                className={`${inputCls} pl-10`}
                placeholder="e.g. 13.2"
                {...form.register("weightKg")}
              />
            </div>
          </FormField>

          <FormField label="Reason for Visit" required error={form.formState.errors.reasonForVisit?.message}>
            <div className="relative mt-2">
              <input className={inputCls} placeholder="e.g. Annual checkup, limping, appetite loss" {...form.register("reasonForVisit")} />
            </div>
          </FormField>
        </section>

        <section className="index-card">
          <div className="flex items-center gap-2 pb-3 border-b border-border/70">
            <Stethoscope className="size-4 text-primary" />
            <h2 className="font-display font-semibold text-lg">Clinical Findings</h2>
          </div>
          <FormField label="Findings and Notes" required error={form.formState.errors.findingsNotes?.message}>
            <textarea
              className={`${inputCls} h-32 py-2 mt-4`}
              placeholder="Enter objective findings, vitals, and examination notes here…"
              {...form.register("findingsNotes")}
            />
          </FormField>
        </section>

        <section className="index-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/70">
            <Pill className="size-4 text-primary" />
            <h2 className="font-display font-semibold text-lg">Treatment & Plan</h2>
          </div>
          <FormField label="Treatment Given" required error={form.formState.errors.treatmentGiven?.message}>
            <textarea
              className={`${inputCls} h-24 py-2 mt-2`}
              placeholder="List medications, doses, and immediately administered treatments…"
              {...form.register("treatmentGiven")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Diagnosis" hint="Optional">
              <input className={`${inputCls} mt-2`} placeholder="e.g. Otitis externa" {...form.register("diagnosis")} />
            </FormField>
            <FormField label="Next Action / Follow-up" hint="Optional">
              <textarea
                className={`${inputCls} h-24 py-2 mt-2`}
                placeholder="e.g. Recheck in 2 weeks"
                {...form.register("followUpNotes")}
              />
            </FormField>
          </div>
        </section>

        {saveVisit.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(saveVisit.error)}
          </div>
        ) : null}

          </form>
      )}
      </div>

      {canShowForm ? (
        <div className="border-t border-border/70 bg-background/95 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-14px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-md">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link to={returnTo}>Cancel</Link>
            </Button>
            <Button form="visit-form" type="submit" variant="hero" size="lg" className="rounded-xl" disabled={saveVisit.isPending}>
              <Save className="size-4" /> {saveVisit.isPending ? "Saving..." : isEditing ? "Update Visit" : "Save Visit"}
            </Button>
          </div>
        </div>
      ) : null}
      </div>
    </AppLayout>
  );
}
