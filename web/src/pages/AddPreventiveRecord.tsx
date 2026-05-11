import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpenCheck, CalendarClock, ChevronLeft, HeartPulse, Pill, Repeat, Save, Stethoscope, Syringe } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest, type CareCategory, type IntervalUnit, type PetDetail, type PreventiveRecordSource } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { scrollFirstFormError } from "@/lib/form-scroll";
import { formatDate, getErrorMessage, toDateInputValue } from "@/lib/format";
import { readReturnTo } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const recordSchema = z
  .object({
    careName: z.string().trim().min(2, "Enter a care item name."),
    category: z.enum(["VACCINATION", "DEWORMING", "HEARTWORM", "OTHER"]),
    administeredOn: z.string().min(1, "Administration date is required."),
    recurrenceKind: z.enum(["ONE_TIME", "RECURRING"]),
    intervalValue: z.coerce.number().int().positive("Enter how often this repeats.").optional(),
    intervalUnit: z.enum(["DAY", "WEEK", "MONTH", "YEAR"]).optional(),
    productName: z.string().optional(),
    manufacturer: z.string().optional(),
    lotNumber: z.string().optional(),
    serialNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    sourceType: z.enum(["CLINIC_RECORDED", "HISTORICAL_BOOKLET"]),
    sourceNote: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.recurrenceKind !== "RECURRING") {
      return;
    }

    if (typeof values.intervalValue !== "number") {
      ctx.addIssue({
        code: "custom",
        message: "Enter how often this repeats.",
        path: ["intervalValue"],
      });
    }

    if (!values.intervalUnit) {
      ctx.addIssue({
        code: "custom",
        message: "Select the repeat frequency.",
        path: ["intervalUnit"],
      });
    }
  });

type RecordFormValues = z.infer<typeof recordSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

const frequencyOptions: Array<{ value: IntervalUnit; label: string }> = [
  { value: "DAY", label: "Days" },
  { value: "WEEK", label: "Weeks" },
  { value: "MONTH", label: "Months" },
  { value: "YEAR", label: "Years" },
];

const recurrenceOptions = [
  {
    value: "ONE_TIME" as const,
    label: "One time",
    description: "Save this in the pet's history without creating another due date.",
  },
  {
    value: "RECURRING" as const,
    label: "Recurring",
    description: "Start a repeating schedule from the date you select.",
  },
];

const sourceOptions: Array<{
  value: PreventiveRecordSource;
  label: string;
  description: string;
  icon: typeof Stethoscope;
}> = [
  {
    value: "CLINIC_RECORDED",
    label: "Recorded at this clinic",
    description: "Use for care administered or directly confirmed during normal clinic work.",
    icon: Stethoscope,
  },
  {
    value: "HISTORICAL_BOOKLET",
    label: "Copied from paper booklet",
    description: "Use for one-time backfill from an owner booklet or older paper record.",
    icon: BookOpenCheck,
  },
];

const categoryOptions: Array<{
  value: CareCategory;
  label: string;
  description: string;
  icon: typeof Syringe;
}> = [
  {
    value: "VACCINATION",
    label: "Vaccine",
    description: "Booklet-style vaccine entry with product and lot details.",
    icon: Syringe,
  },
  {
    value: "DEWORMING",
    label: "Deworming",
    description: "Medication history and next deworming schedule.",
    icon: Pill,
  },
  {
    value: "HEARTWORM",
    label: "Heartworm",
    description: "Prevention, therapy, and recurring reminders.",
    icon: HeartPulse,
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Follow-ups, rechecks, and clinic-specific care.",
    icon: Stethoscope,
  },
];

const categoryLabelByValue: Record<CareCategory, string> = {
  VACCINATION: "Vaccine",
  DEWORMING: "Deworming",
  HEARTWORM: "Heartworm",
  OTHER: "Care Item",
};

const categoryFieldCopy: Record<
  CareCategory,
  {
    careNamePlaceholder: string;
    detailEyebrow: string;
    detailDescription: string;
    productLabel: string;
    productPlaceholder: string;
    notesPlaceholder: string;
  }
> = {
  VACCINATION: {
    careNamePlaceholder: "e.g. Rabies booster, DHPP, Bordetella",
    detailEyebrow: "Vaccine sticker details",
    detailDescription: "Capture the product name, lot, serial, and expiry while the booklet sticker is in front of you.",
    productLabel: "Vaccine product name",
    productPlaceholder: "e.g. Nobivac DHPP",
    notesPlaceholder: "Batch details, follow-up instructions, or reminder notes...",
  },
  DEWORMING: {
    careNamePlaceholder: "e.g. Routine deworming, Pyrantel, Drontal",
    detailEyebrow: "Deworming medication",
    detailDescription: "Capture the medication or product used, then set the next deworming date with a recurring schedule.",
    productLabel: "Medication or product name",
    productPlaceholder: "e.g. Drontal Plus",
    notesPlaceholder: "Dose, stool notes, re-deworming instructions, or owner reminders...",
  },
  HEARTWORM: {
    careNamePlaceholder: "e.g. Heartworm prevention, ProHeart, NexGard Spectra",
    detailEyebrow: "Heartworm product",
    detailDescription: "Capture the product or brand used, then set the next heartworm prevention due date.",
    productLabel: "Product or brand name",
    productPlaceholder: "e.g. Heartgard Plus",
    notesPlaceholder: "Test result, dose, prevention notes, or follow-up instructions...",
  },
  OTHER: {
    careNamePlaceholder: "e.g. Follow-up, Skin recheck, Travel certificate check",
    detailEyebrow: "Product details",
    detailDescription: "Optional structured details for the medication or care product used.",
    productLabel: "Product or medication name",
    productPlaceholder: "e.g. Apoquel",
    notesPlaceholder: "Follow-up instructions, owner reminders, or internal notes...",
  },
};

function parseCategoryParam(value: string | null): CareCategory {
  if (value === "VACCINATION" || value === "DEWORMING" || value === "HEARTWORM" || value === "OTHER") {
    return value;
  }

  return "VACCINATION";
}

function addInterval(dateInput: string, value: number, unit: IntervalUnit) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (unit === "DAY") {
    date.setDate(date.getDate() + value);
    return date;
  }

  if (unit === "WEEK") {
    date.setDate(date.getDate() + value * 7);
    return date;
  }

  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);

  if (unit === "MONTH") {
    result.setMonth(result.getMonth() + value);
  } else {
    result.setFullYear(result.getFullYear() + value);
  }

  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

export default function AddPreventiveRecord() {
  const { id = "", recordId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const isEditing = Boolean(recordId);
  const defaultReturnTo = `/pets/${id}/preventive`;
  const returnTo = readReturnTo(location.state) ?? defaultReturnTo;

  const petQuery = useQuery({
    queryKey: ["pet", id],
    queryFn: () => apiRequest<{ pet: PetDetail }>(`/pets/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  const existingRecord = useMemo(
    () => petQuery.data?.pet.preventiveRecords.find((r) => r.id === recordId) ?? null,
    [petQuery.data?.pet.preventiveRecords, recordId],
  );

  const cannotEdit = isEditing && Boolean(existingRecord) && !existingRecord?.recordedHere;

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      careName: "",
      category: parseCategoryParam(searchParams.get("category")),
      administeredOn: toDateInputValue(new Date().toISOString()),
      recurrenceKind: "ONE_TIME",
      intervalValue: 1,
      intervalUnit: "MONTH",
      productName: "",
      manufacturer: "",
      lotNumber: "",
      serialNumber: "",
      expiryDate: "",
      sourceType: searchParams.get("source") === "historical" ? "HISTORICAL_BOOKLET" : "CLINIC_RECORDED",
      sourceNote: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isEditing) {
      return;
    }

    form.setValue("category", parseCategoryParam(searchParams.get("category")));
  }, [form, isEditing, searchParams]);

  useEffect(() => {
    if (!isEditing || !existingRecord) {
      return;
    }

    const isRecurring =
      Boolean(existingRecord.careType.isRecurring) &&
      typeof existingRecord.careType.defaultIntervalValue === "number" &&
      Boolean(existingRecord.careType.defaultIntervalUnit);

    form.reset({
      careName: existingRecord.careType.name,
      category: existingRecord.careType.category ?? "OTHER",
      administeredOn: toDateInputValue(existingRecord.administeredOn),
      recurrenceKind: isRecurring ? "RECURRING" : "ONE_TIME",
      intervalValue: existingRecord.careType.defaultIntervalValue ?? 1,
      intervalUnit: (existingRecord.careType.defaultIntervalUnit as IntervalUnit) ?? "MONTH",
      productName: existingRecord.productName ?? "",
      manufacturer: existingRecord.manufacturer ?? "",
      lotNumber: existingRecord.lotNumber ?? "",
      serialNumber: existingRecord.serialNumber ?? "",
      expiryDate: existingRecord.expiryDate ? toDateInputValue(existingRecord.expiryDate) : "",
      sourceType: existingRecord.sourceType ?? "CLINIC_RECORDED",
      sourceNote: existingRecord.sourceNote ?? "",
      notes: existingRecord.notes ?? "",
    });
  }, [form, isEditing, existingRecord]);

  const category = form.watch("category");
  const categoryLabel = categoryLabelByValue[category];
  const copy = categoryFieldCopy[category];
  const recurrenceKind = form.watch("recurrenceKind");
  const sourceType = form.watch("sourceType");
  const administeredOn = form.watch("administeredOn");
  const intervalValue = form.watch("intervalValue");
  const intervalUnit = form.watch("intervalUnit");

  const nextDuePreview =
    recurrenceKind === "RECURRING" && typeof intervalValue === "number" && intervalUnit
      ? addInterval(administeredOn, intervalValue, intervalUnit)
      : null;

  const saveRecord = useMutation({
    mutationFn: (values: RecordFormValues) => {
      const baseBody = {
        careName: values.careName,
        category: values.category,
        administeredOn: values.administeredOn,
        productName: values.productName,
        manufacturer: values.manufacturer,
        lotNumber: values.lotNumber,
        serialNumber: values.serialNumber,
        expiryDate: values.expiryDate,
        sourceType: values.sourceType,
        sourceNote: values.sourceNote,
        notes: values.notes,
      };
      const body =
        values.recurrenceKind === "RECURRING"
          ? {
              ...baseBody,
              recurrenceKind: values.recurrenceKind,
              intervalValue: values.intervalValue,
              intervalUnit: values.intervalUnit,
            }
          : {
              ...baseBody,
              recurrenceKind: values.recurrenceKind,
            };

      return apiRequest(
        isEditing ? `/preventive-records/${recordId}` : `/pets/${id}/preventive-records`,
        { method: isEditing ? "PUT" : "POST", token, body },
      );
    },
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({ queryKey: ["pet", id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["due-records"] });
      toast.success(isEditing ? `${values.careName} updated.` : `${values.careName} saved.`);
      navigate(returnTo);
    },
  });

  const handleSubmit = form.handleSubmit(
    (values) => saveRecord.mutate(values),
    (errors) => scrollFirstFormError(errors),
  );
  const dismissForm = () => navigate(returnTo);

  return (
    <AppLayout showChrome={false} scrollContent={false}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="grid h-16 grid-cols-[auto_1fr_auto] items-center border-b border-border/60 bg-background/95 px-5 backdrop-blur-md">
          <button
            type="button"
            aria-label={isEditing ? "Close care record editor" : "Close care record form"}
            onClick={dismissForm}
            className="flex size-10 -ml-2 items-center justify-center text-foreground/70"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-center font-display text-lg font-bold text-primary">
            {isEditing ? "Edit Care Record" : `Record ${categoryLabel}`}
          </h1>
          <span className="size-10" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {petQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading form...</div>
          ) : petQuery.isError ? (
            <div className="p-5">
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {getErrorMessage(petQuery.error)}
              </div>
            </div>
          ) : isEditing && !existingRecord ? (
            <div className="p-8 text-center text-muted-foreground">Care record not found.</div>
          ) : cannotEdit ? (
            <div className="p-5">
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                Only care records created in this clinic can be edited here.
              </div>
            </div>
          ) : (
            <form id="add-preventive-record-form" onSubmit={handleSubmit} className="space-y-5 p-5">
              <section className="index-card">
                <div className="flex items-center gap-3 border-b border-border/70 pb-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft">
                    <Stethoscope className="size-4 text-primary" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{petQuery.data?.pet.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {isEditing
                        ? "Update the care record details below."
                        : "Record new care or backfill a paper booklet entry into the digital record."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        Booklet section
                        <span className="text-destructive"> *</span>
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {categoryOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = category === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={isActive}
                            aria-label={`Select ${option.label} section`}
                            className={cn(
                              "min-h-[7.25rem] rounded-2xl border p-3 text-left transition",
                              isActive
                                ? "border-primary bg-primary-soft/60 shadow-card"
                                : "border-border/70 bg-card hover:border-primary/50 hover:bg-secondary/30",
                            )}
                            onClick={() =>
                              form.setValue("category", option.value, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              })
                            }
                          >
                            <span
                              className={cn(
                                "flex size-9 items-center justify-center rounded-2xl",
                                isActive ? "bg-card text-primary shadow-card" : "bg-secondary text-muted-foreground",
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            <div className="mt-2 text-sm font-semibold">{option.label}</div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <FormField label="Care item name" required error={form.formState.errors.careName?.message}>
                    <input
                      className={inputCls}
                      placeholder={copy.careNamePlaceholder}
                      {...form.register("careName")}
                    />
                  </FormField>

                  <div>
                    <FormField label="Date" required error={form.formState.errors.administeredOn?.message}>
                      <div className="relative">
                        <CalendarClock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input type="date" className={`${inputCls} pl-10`} {...form.register("administeredOn")} />
                      </div>
                    </FormField>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        Record source
                        <span className="text-destructive"> *</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Normal work vs one-time backfill.</span>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {sourceOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = sourceType === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={isActive}
                            className={cn(
                              "rounded-2xl border p-4 text-left transition",
                              isActive
                                ? "border-primary bg-primary-soft/60 shadow-card"
                                : "border-border/70 bg-card hover:border-primary/50 hover:bg-secondary/30",
                            )}
                            onClick={() =>
                              form.setValue("sourceType", option.value, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              })
                            }
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <span className="flex size-8 items-center justify-center rounded-xl bg-card text-primary shadow-card">
                                <Icon className="size-4" />
                              </span>
                              {option.label}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {sourceType === "HISTORICAL_BOOKLET" ? (
                    <FormField label="Source note" hint="Optional">
                      <input
                        className={inputCls}
                        placeholder="e.g. Owner booklet page 3, sticker copied from old card"
                        {...form.register("sourceNote")}
                      />
                    </FormField>
                  ) : null}

                  <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
                    <div className="mb-3">
                      <div className="label-eyebrow">{copy.detailEyebrow}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{copy.detailDescription}</p>
                    </div>

                    <div className="space-y-4">
                      <FormField label={copy.productLabel} hint="Optional">
                        <input
                          className={inputCls}
                          placeholder={copy.productPlaceholder}
                          {...form.register("productName")}
                        />
                      </FormField>

                      {category === "VACCINATION" ? (
                        <>
                          <FormField label="Manufacturer" hint="Optional">
                            <input className={inputCls} placeholder="e.g. MSD Animal Health" {...form.register("manufacturer")} />
                          </FormField>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Lot / batch number" hint="Optional">
                              <input className={inputCls} placeholder="e.g. RB24A71" {...form.register("lotNumber")} />
                            </FormField>
                            <FormField label="Serial number" hint="Optional">
                              <input className={inputCls} placeholder="e.g. 0021849" {...form.register("serialNumber")} />
                            </FormField>
                          </div>
                          <FormField label="Expiry date" hint="Optional">
                            <input type="date" className={inputCls} {...form.register("expiryDate")} />
                          </FormField>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        Does this repeat?
                        <span className="text-destructive"> *</span>
                      </span>
                      <span className="text-xs text-muted-foreground">This starts from the selected date.</span>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {recurrenceOptions.map((option) => {
                        const isActive = recurrenceKind === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={isActive}
                            className={cn(
                              "rounded-2xl border p-4 text-left transition",
                              isActive
                                ? "border-primary bg-primary-soft/60 shadow-card"
                                : "border-border/70 bg-card hover:border-primary/50 hover:bg-secondary/30",
                            )}
                            onClick={() =>
                              form.setValue("recurrenceKind", option.value, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              })
                            }
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <span
                                className={cn(
                                  "size-2.5 rounded-full",
                                  isActive ? "bg-primary" : "bg-border",
                                )}
                              />
                              {option.label}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {recurrenceKind === "RECURRING" ? (
                    <>
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                        <FormField
                          label="Repeat every"
                          required
                          error={form.formState.errors.intervalValue?.message}
                        >
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            className={inputCls}
                            {...form.register("intervalValue", { valueAsNumber: true })}
                          />
                        </FormField>

                        <FormField label="Frequency" required error={form.formState.errors.intervalUnit?.message}>
                          <select className={inputCls} {...form.register("intervalUnit")}>
                            {frequencyOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <Repeat className="size-4 text-primary" />
                          Recurring schedule
                        </div>
                        <div className="mt-1">Starts on {formatDate(administeredOn)}.</div>
                        <div className="mt-1">
                          Next due: {nextDuePreview ? formatDate(nextDuePreview) : "Select the repeat interval."}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                      This will be saved as a one-time care event and kept in the pet&apos;s history without creating a
                      future due reminder.
                    </div>
                  )}

                  <FormField label="Notes" hint="Optional">
                    <textarea
                      className={`${inputCls} h-24 py-2`}
                      placeholder={copy.notesPlaceholder}
                      {...form.register("notes")}
                    />
                  </FormField>
                </div>
              </section>

              {saveRecord.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(saveRecord.error)}
                </div>
              ) : null}
            </form>
          )}
        </div>

        <div className="border-t border-border/70 bg-background/95 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-md">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button type="button" variant="outline" size="lg" onClick={dismissForm}>
              Cancel
            </Button>
            <Button
              form="add-preventive-record-form"
              type="submit"
              variant="hero"
              size="lg"
              disabled={saveRecord.isPending || petQuery.isLoading}
            >
              <Save className="size-4" />
              {saveRecord.isPending ? "Saving..." : isEditing ? "Update Record" : "Save Record"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
