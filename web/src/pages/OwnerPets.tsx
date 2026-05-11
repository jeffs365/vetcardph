import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Plus, Search as SearchIcon, User, X } from "lucide-react";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { apiRequest, type OwnerPetListItem } from "@/lib/api";
import {
  formatPhoneForDisplay,
  formatWeightKg,
  getErrorMessage,
  getInitials,
  getPetAccent,
  getPetAgeLabel,
  getPetColorSwatch,
  getPetTypeLabel,
  titleCase,
} from "@/lib/format";
import { useOwnerSession } from "@/lib/owner-auth";

export default function OwnerPets() {
  const { token } = useOwnerSession();
  const [query, setQuery] = useState("");

  const petsQuery = useQuery({
    queryKey: ["owner-pets"],
    queryFn: () => apiRequest<{ pets: OwnerPetListItem[] }>("/owner/pets", { token }),
    enabled: Boolean(token),
  });

  const pets = useMemo(() => petsQuery.data?.pets ?? [], [petsQuery.data?.pets]);
  const filteredPets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return pets;
    }

    return pets.filter((pet) => {
      const haystack = [
        pet.name,
        pet.owner.fullName,
        pet.owner.mobile,
        pet.species,
        pet.breed,
        pet.color,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [pets, query]);

  return (
    <OwnerLayout title="Pets" titleHref={null}>
      <section
        aria-label="Owner pet search controls"
        className="sticky top-0 z-10 border-b border-border/50 bg-background/90 px-5 pb-3 pt-1 backdrop-blur-md"
      >
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pet, breed, or contact..."
              className="h-14 w-full rounded-2xl border-2 border-primary bg-card pl-12 pr-12 outline-none ring-4 ring-primary/10 transition"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <SearchIcon className="size-4" />
              </span>
            )}
          </div>
        </form>

        <Button asChild variant="hero" className="mt-3 h-11 w-full rounded-xl">
          <Link to="/owner/pets/new">
            <Plus className="size-4" />
            Add Pet
          </Link>
        </Button>
      </section>

      <section aria-labelledby="owner-pet-results-heading" className="px-5 pb-6 pt-4">
        {petsQuery.isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Loading your pets...</div>
        ) : petsQuery.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(petsQuery.error)}
          </div>
        ) : (
          <>
            <h2 id="owner-pet-results-heading" className="label-eyebrow mb-3">
              Your Pets · {filteredPets.length}
            </h2>
            <ul className="space-y-3">
              {filteredPets.map((pet) => {
                const metadataChips = [getPetTypeLabel(pet.species), pet.breed || "No breed", titleCase(pet.sex)];

                return (
                  <li key={pet.id}>
                    <Link
                      to={`/owner/pets/${pet.id}`}
                      className="block rounded-2xl border border-border bg-card p-3.5 shadow-card transition-colors hover:border-primary/40"
                    >
                      <div className="flex gap-3">
                        <div className="shrink-0">
                          {pet.avatarUrl ? (
                            <img src={pet.avatarUrl} alt={pet.name} className="size-[68px] rounded-xl bg-muted object-cover" />
                          ) : (
                            <div
                              className={`flex size-[68px] items-center justify-center rounded-xl text-lg font-bold ${getPetAccent(pet.species)}`}
                            >
                              {getInitials(pet.name)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="truncate font-display text-base font-bold leading-tight">{pet.name}</div>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                              <User className="size-3 shrink-0" />
                              <span className="truncate">
                                {pet.owner.fullName} · {formatPhoneForDisplay(pet.owner.mobile)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1 text-[10.5px] text-foreground">
                            {metadataChips.map((value, index) => (
                              <span key={`${pet.id}-${value}-${index}`} className="rounded-full bg-muted px-2 py-0.5 font-medium">
                                {value}
                              </span>
                            ))}
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
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
                            <span className="text-border">|</span>
                            <span>{formatWeightKg(pet.weightKg)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}

              {!filteredPets.length ? (
                <li className="py-16 text-center text-muted-foreground">
                  No pets match "{query}".
                </li>
              ) : null}
            </ul>
          </>
        )}
      </section>
    </OwnerLayout>
  );
}
