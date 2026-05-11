import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ChevronLeft, PawPrint, Save, User2 } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest, type PetDetail } from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  formatPhoneForDisplay,
  getElsewhereLabel,
  getErrorMessage,
  getPetAgeLabel,
  normalizePhilippineMobileInput,
  toDateInputValue,
} from "@/lib/format";
import { readReturnTo } from "@/lib/navigation";
import { scrollFirstFormError } from "@/lib/form-scroll";

const petSchema = z
  .object({
    petName: z.string().trim().min(1, "Pet name is required."),
    petType: z.enum(["DOG", "CAT", "OTHER"], {
      required_error: "Type is required.",
    }),
    otherType: z.string().trim().optional(),
    breed: z.string().trim().min(1, "Breed is required."),
    color: z.string().trim().min(1, "Color is required."),
    weightKg: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 200), {
        message: "Weight must be between 0 and 200 kg.",
      }),
    sex: z.enum(["MALE", "FEMALE", "UNKNOWN"]),
    birthDate: z.string().optional(),
    ownerName: z.string().trim().min(1, "Owner name is required."),
    ownerMobile: z.string().trim().min(7, "Primary phone is required."),
    ownerAddress: z.string().trim().min(3, "Address is required."),
    ownerEmail: z.string().trim().email("Use a valid email.").or(z.literal("")).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.petType === "OTHER" && !values.otherType?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherType"],
        message: "Please specify the pet type.",
      });
    }
  });

type PetFormValues = z.infer<typeof petSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

function getPetTypeDefaults(species: string) {
  const normalized = species.trim().toLowerCase();

  if (normalized.includes("dog") || normalized.includes("canine")) {
    return { petType: "DOG" as const, otherType: "" };
  }

  if (normalized.includes("cat") || normalized.includes("feline")) {
    return { petType: "CAT" as const, otherType: "" };
  }

  return {
    petType: "OTHER" as const,
    otherType: species,
  };
}

export default function AddPet() {
  const nav = useNavigate();
  const location = useLocation();
  const { id: petId = "" } = useParams();
  const isEditing = Boolean(petId);
  const queryClient = useQueryClient();
  const { token } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [storedAvatarUrl, setStoredAvatarUrl] = useState<string | null>(null);
  const [avatarAction, setAvatarAction] = useState<"keep" | "remove" | "replace">("keep");

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      petName: "",
      petType: "DOG",
      otherType: "",
      breed: "",
      color: "",
      weightKg: "",
      sex: "UNKNOWN",
      birthDate: "",
      ownerName: "",
      ownerMobile: "",
      ownerAddress: "",
      ownerEmail: "",
    },
  });

  const petQuery = useQuery({
    queryKey: ["pet", petId],
    queryFn: () => apiRequest<{ pet: PetDetail }>(`/pets/${petId}`, { token }),
    enabled: isEditing && Boolean(token),
  });

  useEffect(() => {
    if (!avatarFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  useEffect(() => {
    if (!isEditing || !petQuery.data) {
      return;
    }

    const pet = petQuery.data.pet;
    const { petType, otherType } = getPetTypeDefaults(pet.species);

    form.reset({
      petName: pet.name,
      petType,
      otherType,
      breed: pet.breed,
      color: pet.color,
      weightKg: typeof pet.weightKg === "number" ? String(pet.weightKg) : "",
      sex: pet.sex,
      birthDate: toDateInputValue(pet.birthDate),
      ownerName: pet.owner.fullName,
      ownerMobile: formatPhoneForDisplay(pet.owner.mobile),
      ownerAddress: pet.owner.address,
      ownerEmail: pet.owner.email ?? "",
    });

    setStoredAvatarUrl(pet.avatarUrl ?? null);
    setAvatarPreviewUrl(pet.avatarUrl ?? null);
    setAvatarFile(null);
    setAvatarAction("keep");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [form, isEditing, petQuery.data]);

  const savePet = useMutation({
    mutationFn: async (values: PetFormValues) => {
      let avatarUrl: string | undefined = undefined;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const upload = await apiRequest<{ avatarUrl: string }>("/pets/avatar/upload", {
          method: "POST",
          token,
          body: formData,
        });
        avatarUrl = upload.avatarUrl;
      } else if (isEditing) {
        avatarUrl = avatarAction === "remove" ? "" : storedAvatarUrl ?? "";
      }

      return apiRequest<{ pet: { id: string } }>(isEditing ? `/pets/${petId}` : "/pets", {
        method: isEditing ? "PUT" : "POST",
        token,
        body: {
          petName: values.petName,
          avatarUrl,
          species:
            values.petType === "DOG" ? "Dog" : values.petType === "CAT" ? "Cat" : values.otherType?.trim() || "Other",
          breed: values.breed,
          color: values.color,
          weightKg: values.weightKg?.trim() ? Number(values.weightKg) : undefined,
          sex: values.sex,
          birthDate: values.birthDate,
          ownerName: values.ownerName,
          ownerMobile: normalizePhilippineMobileInput(values.ownerMobile),
          ownerAddress: values.ownerAddress,
          ownerEmail: values.ownerEmail,
          ageLabel: values.birthDate ? getPetAgeLabel(values.birthDate, "") : "",
        },
      });
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pets-search"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["pet", result.pet.id] }),
      ]);

      toast.success(
        isEditing
          ? "Pet profile updated."
          : "Pet record saved.",
      );
      nav(`/pets/${result.pet.id}`);
    },
  });

  const handleSubmit = form.handleSubmit(
    (values, event) => {
      const addPetForm = document.getElementById("add-pet-form");
      const formElement =
        event?.currentTarget instanceof HTMLFormElement
          ? event.currentTarget
          : addPetForm instanceof HTMLFormElement
            ? addPetForm
            : null;
      const nativeBirthDate = formElement ? String(new FormData(formElement).get("birthDate") ?? "") : "";

      savePet.mutate({
        ...values,
        birthDate: values.birthDate || nativeBirthDate,
      });
    },
    (errors) => scrollFirstFormError(errors),
  );
  const watchedPetType = form.watch("petType");
  const returnTo = readReturnTo(location.state);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarAction("replace");
  };

  const clearAvatar = () => {
    setAvatarFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (storedAvatarUrl && avatarAction === "replace") {
      setAvatarPreviewUrl(storedAvatarUrl);
      setAvatarAction("keep");
      return;
    }

    setAvatarPreviewUrl(null);
    setAvatarAction("remove");
  };

  const pageTitle = isEditing ? "Edit Pet" : "New Pet Profile";
  const elsewhereLabel = !isEditing && petQuery.data ? getElsewhereLabel(petQuery.data.pet.accessSummary) : null;
  const dismissForm = () => {
    if (typeof returnTo === "string" && returnTo) {
      nav(returnTo);
      return;
    }

    if (isEditing) {
      nav(`/pets/${petId}`);
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
            aria-label={isEditing ? "Back to pet profile" : "Close pet form"}
            onClick={dismissForm}
            className="flex size-10 -ml-2 items-center justify-center text-foreground/70"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-center font-display text-lg font-bold text-primary">{pageTitle}</h1>
          <span className="size-10" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isEditing && petQuery.isLoading ? (
            <div className="p-5 text-center text-muted-foreground">Loading pet details...</div>
          ) : isEditing && petQuery.isError ? (
            <div className="p-5">
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {getErrorMessage(petQuery.error)}
              </div>
            </div>
          ) : (
            <form id="add-pet-form" onSubmit={handleSubmit} className="space-y-5 p-5">
              <section className="index-card">
                <div className="flex items-center gap-3 border-b border-border/70 pb-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft">
                    <PawPrint className="size-4 text-primary" />
                  </span>
                  <h2 className="font-display text-lg font-semibold">Pet Details</h2>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 flex h-24 w-full items-center justify-between rounded-2xl border-2 border-dashed border-border bg-muted px-4 text-muted-foreground transition hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    {avatarPreviewUrl ? (
                      <img src={avatarPreviewUrl} alt="Pet avatar preview" className="size-14 rounded-2xl object-cover shadow-card" />
                    ) : (
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-card shadow-card">
                        <Camera className="size-5" />
                      </span>
                    )}
                    <div className="text-left">
                      <div className="text-sm font-semibold text-foreground">
                        {avatarFile ? avatarFile.name : avatarPreviewUrl ? "Current pet photo" : "Pet photo"}
                      </div>
                      <div className="text-xs">
                        {avatarFile
                          ? "Tap to change photo"
                          : avatarPreviewUrl
                            ? "Tap to replace photo"
                            : "Upload a square avatar for easier recognition"}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {avatarPreviewUrl || avatarFile ? "Change" : "Add"}
                  </span>
                </button>
                {avatarPreviewUrl || avatarFile ? (
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={clearAvatar} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                      {storedAvatarUrl && avatarAction === "replace" ? "Revert photo" : "Remove photo"}
                    </button>
                  </div>
                ) : null}

                <div className="mt-4 space-y-4">
                  <FormField label="Pet Name" required error={form.formState.errors.petName?.message}>
                    <input className={inputCls} placeholder="e.g. Bella" {...form.register("petName")} />
                  </FormField>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Type" required error={form.formState.errors.petType?.message}>
                      <select className={inputCls} {...form.register("petType")}>
                        <option value="DOG">Dog</option>
                        <option value="CAT">Cat</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </FormField>
                    <FormField label="Breed" required error={form.formState.errors.breed?.message}>
                      <input className={inputCls} placeholder="e.g. Beagle" {...form.register("breed")} />
                    </FormField>
                  </div>

                  {watchedPetType === "OTHER" ? (
                    <FormField label="Specify Type" required error={form.formState.errors.otherType?.message}>
                      <input className={inputCls} placeholder="e.g. Rabbit" {...form.register("otherType")} />
                    </FormField>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Sex" required error={form.formState.errors.sex?.message}>
                      <select className={inputCls} {...form.register("sex")}>
                        <option value="UNKNOWN">Unknown</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </FormField>
                    <FormField label="Weight (kg)" error={form.formState.errors.weightKg?.message}>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.1"
                        max="200"
                        step="0.1"
                        className={inputCls}
                        placeholder="e.g. 12.4"
                        {...form.register("weightKg")}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Color" required error={form.formState.errors.color?.message}>
                      <input className={inputCls} placeholder="e.g. Brown" {...form.register("color")} />
                    </FormField>
                    <FormField label="Birth Date">
                      <input type="date" className={inputCls} {...form.register("birthDate")} />
                    </FormField>
                  </div>
                </div>
              </section>

              <section className="index-card">
                <div className="flex items-center gap-3 border-b border-border/70 pb-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft">
                    <User2 className="size-4 text-primary" />
                  </span>
                  <h2 className="font-display text-lg font-semibold">Owner Details</h2>
                </div>
                <div className="mt-4 space-y-4">
                  <FormField label="Owner Full Name" required error={form.formState.errors.ownerName?.message}>
                    <input className={inputCls} placeholder="e.g. Jane Doe" {...form.register("ownerName")} />
                  </FormField>
                  <FormField label="Primary Phone" required error={form.formState.errors.ownerMobile?.message}>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className={inputCls}
                      placeholder="e.g. 09123456789"
                      {...form.register("ownerMobile")}
                    />
                  </FormField>
                  <FormField label="Address" required error={form.formState.errors.ownerAddress?.message}>
                    <textarea
                      className={`${inputCls} h-20 py-2`}
                      placeholder="123 Main St…"
                      {...form.register("ownerAddress")}
                    />
                  </FormField>
                  <FormField label="Owner Email" error={form.formState.errors.ownerEmail?.message}>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="off"
                      spellCheck={false}
                      className={inputCls}
                      placeholder="e.g. jane@email.com"
                      {...form.register("ownerEmail")}
                    />
                  </FormField>
                </div>
              </section>

              {elsewhereLabel ? (
                <div className="rounded-2xl border border-primary/20 bg-primary-soft/60 px-4 py-3 text-sm text-foreground">
                  {elsewhereLabel}
                </div>
              ) : null}

              {savePet.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(savePet.error)}
                </div>
              ) : null}
            </form>
          )}
        </div>

        <div className="border-t border-border/70 bg-background/95 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-14px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-md">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={dismissForm}
            >
              Cancel
            </Button>
            <Button
              form="add-pet-form"
              type="submit"
              variant="hero"
              size="lg"
              className="rounded-xl"
              disabled={savePet.isPending || (isEditing && petQuery.isLoading)}
            >
              <Save className="size-4" /> {savePet.isPending ? "Saving..." : isEditing ? "Save Changes" : "Save Record"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
