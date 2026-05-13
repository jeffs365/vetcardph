import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ChevronLeft, PawPrint, Save } from "lucide-react";
import { toast } from "sonner";
import OwnerLayout from "@/components/OwnerLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest, type OwnerPetDetail } from "@/lib/api";
import { getErrorMessage, getPetAgeLabel, toDateInputValue } from "@/lib/format";
import { scrollFirstFormError } from "@/lib/form-scroll";
import { useOwnerSession } from "@/lib/owner-auth";

const ownerPetSchema = z.object({
  petName: z.string().trim().min(1, "Pet name is required."),
  species: z.string().trim().min(1, "Type is required."),
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
});

type OwnerPetFormValues = z.infer<typeof ownerPetSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

export default function OwnerAddPet() {
  const navigate = useNavigate();
  const { id: petId = "" } = useParams();
  const isEditing = Boolean(petId);
  const queryClient = useQueryClient();
  const { token } = useOwnerSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [storedAvatarUrl, setStoredAvatarUrl] = useState<string | null>(null);
  const [avatarAction, setAvatarAction] = useState<"keep" | "remove" | "replace">("keep");

  const form = useForm<OwnerPetFormValues>({
    resolver: zodResolver(ownerPetSchema),
    defaultValues: {
      petName: "",
      species: "Dog",
      breed: "",
      color: "",
      weightKg: "",
      sex: "UNKNOWN",
      birthDate: "",
    },
  });

  const petQuery = useQuery({
    queryKey: ["owner-pet", petId],
    queryFn: () => apiRequest<{ pet: OwnerPetDetail }>(`/owner/pets/${petId}`, { token }),
    enabled: isEditing && Boolean(token),
  });

  useEffect(() => {
    if (!avatarFile) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(avatarFile);

    return () => {
      reader.abort();
    };
  }, [avatarFile]);

  useEffect(() => {
    if (!isEditing || !petQuery.data) {
      return;
    }

    const pet = petQuery.data.pet;

    form.reset({
      petName: pet.name,
      species: pet.species,
      breed: pet.breed,
      color: pet.color,
      weightKg: typeof pet.weightKg === "number" ? String(pet.weightKg) : "",
      sex: pet.sex,
      birthDate: toDateInputValue(pet.birthDate),
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
    mutationFn: async (values: OwnerPetFormValues) => {
      let avatarUrl: string | undefined = undefined;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const upload = await apiRequest<{ avatarUrl: string }>("/owner/pets/avatar/upload", {
          method: "POST",
          token,
          body: formData,
        });
        avatarUrl = upload.avatarUrl;
      } else if (isEditing && avatarAction === "remove") {
        avatarUrl = "";
      }

      return apiRequest<{ pet: { id: string } }>(isEditing ? `/owner/pets/${petId}` : "/owner/pets", {
        method: isEditing ? "PUT" : "POST",
        token,
        body: {
          petName: values.petName,
          avatarUrl,
          species: values.species,
          breed: values.breed,
          color: values.color,
          weightKg: values.weightKg?.trim() ? Number(values.weightKg) : undefined,
          sex: values.sex,
          birthDate: values.birthDate,
          ageLabel: values.birthDate ? getPetAgeLabel(values.birthDate, "") : "",
        },
      });
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner-pets"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-pet", result.pet.id] }),
        queryClient.invalidateQueries({ queryKey: ["owner-share-tokens"] }),
      ]);

      toast.success(isEditing ? "Pet profile updated." : "Pet added to your VetCard.");
      navigate(`/owner/pets/${result.pet.id}`);
    },
  });

  const handleSubmit = form.handleSubmit(
    (values, event) => {
      const addPetForm = document.getElementById("owner-add-pet-form");
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

  const pageTitle = isEditing ? "Edit Pet" : "Add Pet";

  return (
    <OwnerLayout
      title={pageTitle}
      titleHref={null}
      headerStart={
        <Link
          to={isEditing ? `/owner/pets/${petId}` : "/owner/pets"}
          aria-label="Back to pets"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
    >
      {isEditing && petQuery.isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading pet details...</div>
      ) : isEditing && petQuery.isError ? (
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(petQuery.error)}
          </div>
        </div>
      ) : (
      <form id="owner-add-pet-form" onSubmit={handleSubmit} className="space-y-5 px-5 pb-28">
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
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex min-h-24 w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-border bg-muted px-4 py-3 text-muted-foreground transition hover:bg-secondary"
          >
            <div className="flex min-w-0 items-center gap-3">
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="Pet avatar preview" className="size-14 shrink-0 rounded-2xl object-cover shadow-card" />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card">
                  <Camera className="size-5" />
                </span>
              )}
              <div className="min-w-0 text-left">
                <div className="truncate text-sm font-semibold text-foreground">
                  {avatarFile ? avatarFile.name : avatarPreviewUrl ? "Current pet photo" : "Pet photo"}
                </div>
                <div className="text-xs">
                  {avatarFile
                    ? "Tap to change photo"
                    : avatarPreviewUrl
                      ? "Tap to replace photo"
                      : "Upload a clear pet photo for easier recognition"}
                </div>
              </div>
            </div>
            <span className="shrink-0 text-sm font-medium text-primary">{avatarPreviewUrl || avatarFile ? "Change" : "Add"}</span>
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
              <input className={inputCls} placeholder="e.g. Bruno" {...form.register("petName")} />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Type" required error={form.formState.errors.species?.message}>
                <input className={inputCls} placeholder="e.g. Dog" {...form.register("species")} />
              </FormField>
              <FormField label="Breed" required error={form.formState.errors.breed?.message}>
                <input className={inputCls} placeholder="e.g. Beagle Mix" {...form.register("breed")} />
              </FormField>
            </div>

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
                  placeholder="e.g. 12.5"
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

        {savePet.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(savePet.error)}
          </div>
        ) : null}

      </form>
      )}
      <div className="sticky bottom-0 z-20 border-t border-border/70 bg-background/95 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-14px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-md">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={() => navigate(isEditing ? `/owner/pets/${petId}` : "/owner/pets")}>
            Cancel
          </Button>
          <Button
            form="owner-add-pet-form"
            type="submit"
            size="lg"
            className="rounded-xl bg-tertiary text-tertiary-foreground shadow-[0_16px_32px_-20px_hsl(var(--tertiary)_/_0.8)] hover:bg-tertiary/90"
            disabled={savePet.isPending || (isEditing && (petQuery.isLoading || petQuery.isError))}
          >
            <Save className="size-4" /> {savePet.isPending ? "Saving..." : isEditing ? "Update Pet" : "Save Pet"}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
}
