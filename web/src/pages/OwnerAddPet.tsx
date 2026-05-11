import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, PawPrint, Save } from "lucide-react";
import { toast } from "sonner";
import OwnerLayout from "@/components/OwnerLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getErrorMessage, getPetAgeLabel } from "@/lib/format";
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
  const queryClient = useQueryClient();
  const { token } = useOwnerSession();

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

  const savePet = useMutation({
    mutationFn: async (values: OwnerPetFormValues) => {
      return apiRequest<{ pet: { id: string } }>("/owner/pets", {
        method: "POST",
        token,
        body: {
          petName: values.petName,
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
        queryClient.invalidateQueries({ queryKey: ["owner-share-tokens"] }),
      ]);

      toast.success("Pet added to your VetCard.");
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

  return (
    <OwnerLayout
      title="Add Pet"
      titleHref={null}
      headerStart={
        <Link
          to="/owner/pets"
          aria-label="Back to pets"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
    >
      <form id="owner-add-pet-form" onSubmit={handleSubmit} className="space-y-5 px-5 pb-28">
        <section className="index-card">
          <div className="flex items-center gap-3 border-b border-border/70 pb-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft">
              <PawPrint className="size-4 text-primary" />
            </span>
            <h2 className="font-display text-lg font-semibold">Pet Details</h2>
          </div>

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
      <div className="sticky bottom-0 z-20 border-t border-border/70 bg-background/95 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-14px_35px_-28px_rgba(15,23,42,0.45)] backdrop-blur-md">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={() => navigate("/owner/pets")}>
            Cancel
          </Button>
          <Button
            form="owner-add-pet-form"
            type="submit"
            size="lg"
            className="rounded-xl bg-tertiary text-tertiary-foreground shadow-[0_16px_32px_-20px_hsl(var(--tertiary)_/_0.8)] hover:bg-tertiary/90"
            disabled={savePet.isPending}
          >
            <Save className="size-4" /> {savePet.isPending ? "Saving..." : "Save Pet"}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
}
