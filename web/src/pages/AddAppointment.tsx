import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Check, ChevronsUpDown, Clock3, Link2, PawPrint, Save, StickyNote, User, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest, type AppointmentRecord, type PetListItem } from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  formatPhoneForDisplay,
  getElsewhereLabel,
  getErrorMessage,
  getInitials,
  getPetAccent,
  getPetAgeLabel,
  getPetColorSwatch,
  getPetTypeLabel,
  titleCase,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/format";
import { getNavigationSource, readReturnTo } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { scrollFirstFormError } from "@/lib/form-scroll";

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toLocalTimeKey(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getDefaultAppointmentTime(dateKey: string) {
  const now = new Date();

  if (dateKey !== toLocalDateKey(now)) {
    return "09:00";
  }

  const nextSlot = new Date(now);
  const roundedMinutes = Math.ceil((nextSlot.getMinutes() + 1) / 30) * 30;
  nextSlot.setMinutes(roundedMinutes, 0, 0);

  return toLocalTimeKey(nextSlot);
}

function getScheduledDateTime(values: { scheduledDate?: string; scheduledTime?: string }) {
  if (!values.scheduledDate || !values.scheduledTime) {
    return null;
  }

  const dateTime = new Date(`${values.scheduledDate}T${values.scheduledTime}`);

  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

const appointmentSchema = z
  .object({
    petId: z.string().min(1, "Pet is required."),
    scheduledDate: z.string().min(1, "Date is required."),
    scheduledTime: z.string().min(1, "Time is required."),
    reason: z.string().trim().min(2, "Reason is required."),
    notes: z.string().trim().min(2, "Notes are required."),
  })
  .superRefine((values, ctx) => {
    if (!values.scheduledDate || !values.scheduledTime) {
      return;
    }

    const scheduledFor = getScheduledDateTime(values);
    if (!scheduledFor) {
      return;
    }

    if (scheduledFor <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledTime"],
        message: "Choose a future appointment time.",
      });
    }
  });

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

export default function AddAppointment() {
  const { appointmentId = "" } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [searchParams] = useSearchParams();
  const navigationSource = getNavigationSource(location);
  const selectedPetId = searchParams.get("petId") ?? "";
  const selectedDate = searchParams.get("date") ?? toDateInputValue(new Date().toISOString());
  const isEditing = Boolean(appointmentId);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [selectedPetPreview, setSelectedPetPreview] = useState<PetListItem | null>(null);
  const petSearchQuery = petSearch.trim();

  const petsQuery = useQuery({
    queryKey: ["pets-search", "appointments-picker", petSearchQuery],
    queryFn: () =>
      apiRequest<{ pets: PetListItem[] }>(petSearchQuery ? `/pets?q=${encodeURIComponent(petSearchQuery)}` : "/pets", { token }),
    enabled: Boolean(token),
    placeholderData: (previousData) => previousData,
  });
  const appointmentQuery = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => apiRequest<{ appointment: AppointmentRecord }>(`/appointments/${appointmentId}`, { token }),
    enabled: Boolean(token && appointmentId),
  });

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      petId: selectedPetId,
      scheduledDate: selectedDate,
      scheduledTime: getDefaultAppointmentTime(selectedDate),
      reason: "",
      notes: "",
    },
  });

  const watchedPetId = form.watch("petId");

  const selectedPet = useMemo(() => {
    const matchedPet = (petsQuery.data?.pets ?? []).find((pet) => pet.id === watchedPetId);
    if (matchedPet) {
      return matchedPet;
    }

    if (selectedPetPreview?.id === watchedPetId) {
      return selectedPetPreview;
    }

    const appointmentPet = appointmentQuery.data?.appointment.pet;
    if (appointmentPet && appointmentPet.id === watchedPetId) {
      return {
        id: appointmentPet.id,
        name: appointmentPet.name,
        species: appointmentPet.species,
        breed: appointmentPet.breed,
        color: appointmentPet.color,
        sex: appointmentPet.sex,
        birthDate: appointmentPet.birthDate ?? null,
        ageLabel: appointmentPet.ageLabel ?? null,
        updatedAt: "",
        owner: {
          id: appointmentPet.owner.id,
          fullName: appointmentPet.owner.fullName,
          mobile: appointmentPet.owner.mobile,
          address: appointmentPet.owner.address,
          email: appointmentPet.owner.email,
        },
        accessSummary: { linkedClinicCount: 1, hasSharedHistory: false },
      } satisfies PetListItem;
    }

    return null;
  }, [appointmentQuery.data?.appointment.pet, petsQuery.data?.pets, selectedPetPreview, watchedPetId]);
  const selectedPetMetadata = useMemo(
    () => (selectedPet ? [getPetTypeLabel(selectedPet.species), selectedPet.breed || "No breed", titleCase(selectedPet.sex)] : []),
    [selectedPet],
  );

  useEffect(() => {
    const appointment = appointmentQuery.data?.appointment;
    if (!appointment) {
      return;
    }

    form.reset({
      petId: appointment.pet.id,
      scheduledDate: toDateInputValue(appointment.scheduledFor),
      scheduledTime: toTimeInputValue(appointment.scheduledFor),
      reason: appointment.reason,
      notes: appointment.notes,
    });
  }, [appointmentQuery.data?.appointment, form]);

  useEffect(() => {
    if (selectedPet) {
      setSelectedPetPreview(selectedPet);
    }
  }, [selectedPet]);

  const saveAppointment = useMutation({
    mutationFn: (values: AppointmentFormValues) =>
      apiRequest(isEditing ? `/appointments/${appointmentId}` : "/appointments", {
        method: isEditing ? "PUT" : "POST",
        token,
        body: values,
      }),
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["appointment-summary"] });
      nav(`/calendar?date=${values.scheduledDate}`);
    },
  });

  const handleSubmit = form.handleSubmit(
    (values) => saveAppointment.mutate(values),
    (errors) => scrollFirstFormError(errors),
  );
  const returnTo = readReturnTo(location.state);

  const dismissForm = () => {
    if (typeof returnTo === "string" && returnTo) {
      nav(returnTo);
      return;
    }

    nav(-1);
  };

  return (
    <AppLayout showChrome={false} scrollContent={false}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="grid h-16 grid-cols-[auto_1fr_auto] items-center border-b border-border/60 bg-background/95 px-5 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close appointment form"
            onClick={dismissForm}
            className="flex size-10 -ml-2 items-center justify-center text-foreground/70"
          >
            <X className="size-5" />
          </button>
          <h1 className="text-center font-display text-lg font-bold text-primary">
            {isEditing ? "Edit Appointment" : "Add Appointment"}
          </h1>
          <span className="size-10" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {(!petsQuery.data && petsQuery.isLoading) || appointmentQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading appointment form...</div>
          ) : petsQuery.isError || appointmentQuery.isError ? (
            <div className="p-5">
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {getErrorMessage(petsQuery.error ?? appointmentQuery.error)}
              </div>
            </div>
          ) : !petSearchQuery && !(petsQuery.data?.pets.length) ? (
            <div className="p-5">
              <div className="index-card py-10 text-center">
                <h2 className="font-display text-xl font-bold">Add a pet first</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Appointments need to be linked to a patient record.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="hero">
                    <Link to="/pets/new" state={{ from: navigationSource }}>
                      Add New Pet
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/5 hover:text-primary">
                    <Link to="/pets/link" state={{ from: navigationSource }}>
                      <Link2 className="size-4" />
                      Link Pet
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form id="add-appointment-form" onSubmit={handleSubmit} className="space-y-5 p-5">
              {selectedPet ? (
                <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
                  <div className="flex items-center gap-4">
                    {selectedPet.avatarUrl ? (
                      <img
                        src={selectedPet.avatarUrl}
                        alt={selectedPet.name}
                        className="size-20 rounded-3xl border-2 border-background/80 object-cover shadow-card"
                      />
                    ) : (
                      <div
                        className={`flex size-20 items-center justify-center rounded-3xl text-lg font-bold shadow-soft ${getPetAccent(selectedPet.species)}`}
                      >
                        {getInitials(selectedPet.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-display text-2xl font-bold leading-tight">{selectedPet.name}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                        {selectedPetMetadata.map((value, index) => (
                          <span key={`${selectedPet.id}-${value}-${index}`} className="rounded-full bg-card/80 px-2.5 py-1 font-medium shadow-card">
                            {value}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" /> {getPetAgeLabel(selectedPet.birthDate, selectedPet.ageLabel)}
                        </span>
                        <span className="text-border">|</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="size-2.5 rounded-full ring-1 ring-border/80"
                            style={{ backgroundColor: getPetColorSwatch(selectedPet.color) }}
                          />
                          {selectedPet.color || "No color"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-card/80 px-4 py-3 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                        <User className="size-4" strokeWidth={2} />
                      </div>
                        <div className="min-w-0 flex-1">
                          <div className="label-eyebrow">Owner</div>
                          <div className="truncate text-sm font-semibold">{selectedPet.owner.fullName}</div>
                          <div className="break-words text-xs text-muted-foreground">{formatPhoneForDisplay(selectedPet.owner.mobile)}</div>
                        </div>
                      </div>
                    </div>
                    {getElsewhereLabel(selectedPet.accessSummary) ? (
                      <div className="mt-3 rounded-2xl border border-primary/20 bg-primary-soft/60 px-4 py-3 text-sm text-foreground">
                        {getElsewhereLabel(selectedPet.accessSummary)}
                      </div>
                    ) : null}
                  </section>
                ) : null}

              <section className="index-card space-y-4">
                <FormField label="Pet" required error={form.formState.errors.petId?.message}>
                  <input type="hidden" {...form.register("petId")} />
                  <Popover
                    open={petPickerOpen}
                    onOpenChange={(open) => {
                      setPetPickerOpen(open);
                      if (!open) {
                        setPetSearch("");
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={petPickerOpen}
                        className={cn(
                          "h-auto min-h-11 w-full justify-between rounded-lg border border-border bg-card px-3 py-3 text-left font-normal",
                          !selectedPet && "text-muted-foreground",
                        )}
                      >
                        <span className="min-w-0">
                          {selectedPet ? (
                            <span className="block">
                              <span className="block truncate font-medium text-foreground">{selectedPet.name}</span>
                              <span className="block truncate text-sm text-muted-foreground">
                                {selectedPet.owner.fullName} · {formatPhoneForDisplay(selectedPet.owner.mobile)}
                              </span>
                            </span>
                          ) : (
                            "Search pet by name, owner, or mobile"
                          )}
                        </span>
                        <ChevronsUpDown className="ml-3 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Search pet..." value={petSearch} onValueChange={setPetSearch} />
                        <CommandList>
                          <CommandEmpty>
                            {petSearchQuery ? "No pets matched that search." : "No pets available."}
                          </CommandEmpty>
                          <CommandGroup>
                            {petsQuery.data?.pets.map((pet) => (
                              <CommandItem
                                key={pet.id}
                                value={`${pet.name} ${pet.owner.fullName} ${pet.owner.mobile}`}
                                onSelect={() => {
                                  form.setValue("petId", pet.id, { shouldDirty: true, shouldValidate: true });
                                  setSelectedPetPreview(pet);
                                  setPetPickerOpen(false);
                                  setPetSearch("");
                                }}
                                className="items-start gap-3 py-3"
                              >
                                <Check
                                  className={cn(
                                    "mt-1 size-4 shrink-0 text-primary transition-opacity",
                                    watchedPetId === pet.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{pet.name}</div>
                                  <div className="truncate text-sm text-muted-foreground">
                                    {pet.owner.fullName} · {formatPhoneForDisplay(pet.owner.mobile)}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {pet.species} · {getPetAgeLabel(pet.birthDate, pet.ageLabel)}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Date" required error={form.formState.errors.scheduledDate?.message}>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input type="date" className={`${inputCls} pl-10`} {...form.register("scheduledDate")} />
                    </div>
                  </FormField>

                  <FormField label="Time" required error={form.formState.errors.scheduledTime?.message}>
                    <div className="relative">
                      <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input type="time" className={`${inputCls} pl-10`} {...form.register("scheduledTime")} />
                    </div>
                  </FormField>
                </div>

                <FormField label="Reason" required error={form.formState.errors.reason?.message}>
                  <div className="relative">
                    <PawPrint className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <input
                      className={`${inputCls} pl-10`}
                      placeholder="e.g. Vaccine follow-up, skin concern"
                      {...form.register("reason")}
                    />
                  </div>
                </FormField>

                <FormField label="Booking Notes" required error={form.formState.errors.notes?.message}>
                  <div className="relative">
                    <StickyNote className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <textarea
                      className={`${inputCls} h-28 py-2 pl-10`}
                      placeholder="Add booking context the team should see before the visit..."
                      {...form.register("notes")}
                    />
                  </div>
                </FormField>
              </section>

              {saveAppointment.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(saveAppointment.error)}
                </div>
              ) : null}
            </form>
          )}
        </div>

        <div className="border-t border-border/70 bg-background/95 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-14px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-md">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={dismissForm}>
              Cancel
            </Button>
            <Button
              form="add-appointment-form"
              type="submit"
              variant="hero"
              size="lg"
              className="rounded-xl"
              disabled={saveAppointment.isPending || petsQuery.isLoading || appointmentQuery.isLoading || !(petsQuery.data?.pets.length)}
            >
              <Save className="size-4" /> {saveAppointment.isPending ? "Saving..." : isEditing ? "Update Appointment" : "Save Appointment"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
