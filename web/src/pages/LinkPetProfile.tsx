import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronLeft, Link2, PawPrint, Phone, Search, User2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { apiRequest, type LinkPetLookupResult } from "@/lib/api";
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
  normalizePhilippineMobileInput,
  titleCase,
} from "@/lib/format";
import { getNavigationSource, readReturnTo } from "@/lib/navigation";

const linkPetSchema = z.object({
  ownerMobile: z
    .string()
    .trim()
    .min(7, "Owner phone is required.")
    .refine((value) => normalizePhilippineMobileInput(value).length === 12, {
      message: "Use a valid Philippine mobile number.",
    }),
  confirmOwnerAccess: z.boolean().refine((value) => value, {
    message: "Confirm owner approval before looking up shared pet profiles.",
  }),
});

type LinkPetFormValues = z.infer<typeof linkPetSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

export default function LinkPetProfile() {
  const nav = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [lookupResult, setLookupResult] = useState<LinkPetLookupResult | null>(null);
  const [searchedMobile, setSearchedMobile] = useState("");
  const returnTo = readReturnTo(location.state);
  const navigationSource = getNavigationSource(location);

  const form = useForm<LinkPetFormValues>({
    resolver: zodResolver(linkPetSchema),
    defaultValues: {
      ownerMobile: "",
      confirmOwnerAccess: false,
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (values: LinkPetFormValues) => {
      const normalizedOwnerMobile = normalizePhilippineMobileInput(values.ownerMobile);
      const result = await apiRequest<LinkPetLookupResult>(
        `/pets/link-candidates?ownerMobile=${encodeURIComponent(normalizedOwnerMobile)}`,
        { token },
      );

      return {
        normalizedOwnerMobile,
        result,
      };
    },
    onMutate: () => {
      setLookupResult(null);
    },
    onSuccess: ({ normalizedOwnerMobile, result }) => {
      setSearchedMobile(normalizedOwnerMobile);
      setLookupResult(result);
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (petId: string) =>
      apiRequest<{ pet: { id: string }; alreadyLinked: boolean }>(`/pets/${petId}/link`, {
        method: "POST",
        token,
        body: {
          ownerMobile: searchedMobile,
          confirmOwnerAccess: true,
        },
      }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pets-search"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["pet", result.pet.id] }),
      ]);

      toast.success(result.alreadyLinked ? "Pet profile is already linked here." : "Pet profile linked to this clinic.");
      nav(`/pets/${result.pet.id}`);
    },
  });

  const dismissForm = () => {
    if (typeof returnTo === "string" && returnTo) {
      nav(returnTo);
      return;
    }

    nav(-1);
  };

  const handleSearch = form.handleSubmit((values) => searchMutation.mutate(values));
  const owner = lookupResult?.owner ?? null;
  const pets = lookupResult?.pets ?? [];

  return (
    <AppLayout showChrome={false} scrollContent={false}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="grid h-16 grid-cols-[auto_1fr_auto] items-center border-b border-border/60 bg-background/95 px-5 backdrop-blur-md">
          <button
            type="button"
            aria-label="Back from link pet profile"
            onClick={dismissForm}
            className="flex size-10 -ml-2 items-center justify-center text-foreground/70"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-center font-display text-lg font-bold text-primary">Link Pet Profile</h1>
          <span className="size-10" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <form onSubmit={handleSearch} className="space-y-5 p-5">
            <section className="index-card">
              <div className="flex items-center gap-3 border-b border-border/70 pb-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft">
                  <Link2 className="size-4 text-primary" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">Find by owner phone</h2>
                  <p className="text-sm text-muted-foreground">Use the owner's mobile number to look up existing shared pet profiles.</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <FormField label="Owner Phone" required error={form.formState.errors.ownerMobile?.message}>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={inputCls}
                    placeholder="e.g. 09123456789"
                    {...form.register("ownerMobile")}
                  />
                </FormField>

                <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/40 px-3 py-3 text-sm text-foreground">
                  <input type="checkbox" className="mt-1 size-4" {...form.register("confirmOwnerAccess")} />
                  <span className="leading-5">
                    The owner confirmed that this clinic may look up and link their existing pet profiles.
                  </span>
                </label>
                {form.formState.errors.confirmOwnerAccess ? (
                  <p className="text-sm text-destructive">{form.formState.errors.confirmOwnerAccess.message}</p>
                ) : null}

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={searchMutation.isPending}>
                  <Search className="size-4" /> {searchMutation.isPending ? "Looking up profiles..." : "Find Pet Profiles"}
                </Button>
              </div>
            </section>

            {searchMutation.isError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {getErrorMessage(searchMutation.error)}
              </div>
            ) : null}

            {owner ? (
              <section className="index-card py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <User2 className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="label-eyebrow">Owner</div>
                    <div className="truncate text-sm font-semibold">{owner.fullName}</div>
                    <div className="break-words text-xs text-muted-foreground">{formatPhoneForDisplay(owner.mobile)}</div>
                    {owner.email ? <div className="break-words text-xs text-muted-foreground">{owner.email}</div> : null}
                    {owner.address ? <div className="break-words text-xs text-muted-foreground">{owner.address}</div> : null}
                  </div>
                </div>
              </section>
            ) : null}

            {lookupResult ? (
              <section className="space-y-3">
                <div>
                  <div className="label-eyebrow">Shared pet profiles</div>
                  <h2 className="font-display text-lg font-bold">
                    {owner ? `${pets.length} ${pets.length === 1 ? "profile" : "profiles"} found` : "No matching owner found"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {owner
                      ? "Choose which pet profile to link into this clinic workspace."
                      : `No shared pet profiles were found for ${formatPhoneForDisplay(searchedMobile)}.`}
                  </p>
                </div>

                {owner ? (
                  <ul className="space-y-3">
                    {pets.map((pet) => {
                      const metadataChips = [getPetTypeLabel(pet.species), pet.breed || "No breed", titleCase(pet.sex)];
                      const elsewhereLabel = getElsewhereLabel(pet.accessSummary);

                      return (
                        <li key={pet.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
                          <div className="flex gap-3">
                            <div className="shrink-0">
                              {pet.avatarUrl ? (
                                <img src={pet.avatarUrl} alt={pet.name} className="size-[68px] rounded-xl bg-muted object-cover" />
                              ) : (
                                <div className={`flex size-[68px] items-center justify-center rounded-xl text-lg font-bold ${getPetAccent(pet.species)}`}>
                                  {getInitials(pet.name)}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate font-display text-base font-bold leading-tight">{pet.name}</div>
                                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                                    {metadataChips.map((value, index) => (
                                      <span key={`${pet.id}-${value}-${index}`} className="rounded-full bg-muted px-2 py-0.5 font-medium">
                                        {value}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar className="size-3" /> {getPetAgeLabel(pet.birthDate, pet.ageLabel)}
                                    </span>
                                    <span className="text-border">|</span>
                                    <span className="inline-flex items-center gap-1">
                                      <span
                                        className="size-2.5 rounded-full ring-1 ring-border/80"
                                        style={{ backgroundColor: getPetColorSwatch(pet.color) }}
                                      />
                                      {pet.color || "No color"}
                                    </span>
                                  </div>
                                  {elsewhereLabel ? (
                                    <div className="mt-2 inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                                      Shared history available
                                    </div>
                                  ) : null}
                                </div>

                                {pet.linkedToCurrentClinic ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-label={`Open ${pet.name} profile`}
                                    onClick={() => nav(`/pets/${pet.id}`)}
                                  >
                                    Open Profile
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    aria-label={`Link ${pet.name} profile`}
                                    onClick={() => linkMutation.mutate(pet.id)}
                                    disabled={linkMutation.isPending}
                                  >
                                    {linkMutation.isPending ? "Linking..." : "Link Profile"}
                                  </Button>
                                )}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                                  <Phone className="size-3" />
                                  {formatPhoneForDisplay(pet.owner.mobile)}
                                </span>
                                {pet.linkedToCurrentClinic ? (
                                  <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                    Already in this clinic
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {linkMutation.isError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {getErrorMessage(linkMutation.error)}
              </div>
            ) : null}
          </form>
        </div>

        <div className="border-t border-border/70 bg-background/95 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-md">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button type="button" variant="outline" size="lg" onClick={dismissForm}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => nav("/pets/new", { state: { from: navigationSource } })}>
              <PawPrint className="size-4" /> New Pet Profile
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
