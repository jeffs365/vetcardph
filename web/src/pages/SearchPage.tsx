import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Calendar, Link2, Search as SearchIcon, SlidersHorizontal, User, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { apiRequest, type PetListItem } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { getNavigationSource } from "@/lib/navigation";
import {
  formatPhoneForDisplay,
  formatWeightKg,
  getElsewhereLabel,
  getErrorMessage,
  getInitials,
  getPetAccent,
  getPetAgeLabel,
  getPetTypeLabel,
  getPetColorSwatch,
  titleCase,
} from "@/lib/format";

type SearchFilters = {
  species: string;
  breed: string;
  color: string;
  sex: string;
  age: string;
};

const ageOptions = [
  { value: "all", label: "All ages" },
  { value: "under-1", label: "Under 1 year" },
  { value: "1-3", label: "1 - 3 years" },
  { value: "4-7", label: "4 - 7 years" },
  { value: "8-plus", label: "8+ years" },
  { value: "unknown", label: "Unknown" },
];

const defaultFilters: SearchFilters = {
  species: "all",
  breed: "all",
  color: "all",
  sex: "all",
  age: "all",
};

function readFilters(searchParams: URLSearchParams): SearchFilters {
  return {
    species: searchParams.get("species") ?? "all",
    breed: searchParams.get("breed") ?? "all",
    color: searchParams.get("color") ?? "all",
    sex: searchParams.get("sex") ?? "all",
    age: searchParams.get("age") ?? "all",
  };
}

function buildSearchParams(query: string, filters: SearchFilters) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("q", query.trim());
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value !== "all") {
      params.set(key, value);
    }
  }

  return params;
}

export default function SearchPage() {
  const { token } = useSession();
  const location = useLocation();
  const navigationSource = getNavigationSource(location);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamKey = searchParams.toString();
  const queryValue = searchParams.get("q") ?? "";
  const [q, setQ] = useState(queryValue);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(() => readFilters(searchParams));
  const requestPath = useMemo(() => {
    const params = buildSearchParams(queryValue, filters);
    const query = params.toString();
    return query ? `/pets?${query}` : "/pets";
  }, [filters, queryValue]);

  useEffect(() => {
    setQ(queryValue);
    setFilters(readFilters(new URLSearchParams(searchParamKey)));
  }, [queryValue, searchParamKey]);

  const petsQuery = useQuery({
    queryKey: ["pets-search", requestPath],
    queryFn: () => apiRequest<{ pets: PetListItem[] }>(requestPath, { token }),
    enabled: Boolean(token),
  });

  const metadataQuery = useQuery({
    queryKey: ["pets-metadata"],
    queryFn: () => apiRequest<{ species: string[]; breed: string[]; color: string[] }>("/pets/metadata", { token }),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const pets = useMemo(() => petsQuery.data?.pets ?? [], [petsQuery.data?.pets]);
  const filterOptions = useMemo(
    () => ({
      species: metadataQuery.data?.species ?? [],
      breed: metadataQuery.data?.breed ?? [],
      color: metadataQuery.data?.color ?? [],
    }),
    [metadataQuery.data],
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== "all").length,
    [filters],
  );

  return (
    <AppLayout>
      <section
        aria-label="Search controls"
        className="sticky top-0 z-10 border-b border-border/50 bg-background/90 px-5 pb-3 pt-1 backdrop-blur-md"
        >
          <form
            className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearchParams(buildSearchParams(q, filters));
          }}
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search pet, owner, or mobile..."
              className="w-full h-14 pl-12 pr-12 rounded-2xl border-2 border-primary bg-card outline-none ring-4 ring-primary/10 transition"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center"
              aria-label="Search"
            >
              <SearchIcon className="size-4" />
            </button>
          </div>
          <button
            type="button"
            aria-label={showFilters ? "Hide search filters" : "Show search filters"}
            aria-expanded={showFilters}
            onClick={() => setShowFilters((current) => !current)}
            className="shrink-0 inline-flex items-center gap-2 h-14 px-4 rounded-2xl bg-secondary text-secondary-foreground text-sm font-semibold"
          >
            <SlidersHorizontal className="size-4" />
            {activeFilterCount ? (
              <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] px-1.5">
                {activeFilterCount}
              </span>
            ) : null}
            </button>
          </form>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild variant="hero" className="h-11 rounded-xl">
              <Link to="/pets/new" state={{ from: navigationSource }}>
                Add New Pet
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl border-primary text-primary hover:bg-primary/5 hover:text-primary">
              <Link to="/pets/link" state={{ from: navigationSource }}>
                <Link2 className="size-4" />
                Link Pet
              </Link>
            </Button>
          </div>
        </section>

      {showFilters ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 bg-foreground/15 backdrop-blur-[1px]"
            onClick={() => setShowFilters(false)}
            aria-label="Close filters"
          />
          <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px] rounded-t-[1.75rem] border border-border/70 bg-card px-5 pb-6 pt-5 shadow-float">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Filters</h2>
                <p className="text-sm text-muted-foreground">Drill down the patient list.</p>
              </div>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setShowFilters(false)}
                className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <select
                aria-label="Filter by type"
                className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                value={filters.species}
                onChange={(event) => setFilters((current) => ({ ...current, species: event.target.value }))}
              >
                <option value="all">All types</option>
                {filterOptions.species.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by breed"
                className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                value={filters.breed}
                onChange={(event) => setFilters((current) => ({ ...current, breed: event.target.value }))}
              >
                <option value="all">All breeds</option>
                {filterOptions.breed.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by color"
                className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                value={filters.color}
                onChange={(event) => setFilters((current) => ({ ...current, color: event.target.value }))}
              >
                <option value="all">All colors</option>
                {filterOptions.color.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by sex"
                className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                value={filters.sex}
                onChange={(event) => setFilters((current) => ({ ...current, sex: event.target.value }))}
              >
                <option value="all">All genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
              <select
                aria-label="Filter by age"
                className="col-span-2 h-11 rounded-xl border border-border bg-card px-3 text-sm"
                value={filters.age}
                onChange={(event) => setFilters((current) => ({ ...current, age: event.target.value }))}
              >
                {ageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setFilters(defaultFilters)
                }
                className="text-sm font-semibold text-primary"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchParams(buildSearchParams(q, filters));
                  setShowFilters(false);
                }}
                className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      ) : null}

      <section aria-labelledby="search-results-heading" className="px-5 pb-6 pt-4">
        {petsQuery.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Searching records...</div>
        ) : petsQuery.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(petsQuery.error)}
          </div>
        ) : (
          <>
            <h2 id="search-results-heading" className="label-eyebrow mb-3">
              Search Results · {pets.length}
            </h2>
            {pets.length >= 200 ? (
              <div className="mb-3 rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                Showing the 200 most recently updated records. Use the search or filters to find others.
              </div>
            ) : null}
            <ul className="space-y-3">
              {pets.map((pet) => {
                const petType = getPetTypeLabel(pet.species);
                const metadataChips = [petType, pet.breed || "No breed", titleCase(pet.sex)];
                const hasSharedHistory = Boolean(getElsewhereLabel(pet.accessSummary));

                return (
                  <li key={pet.id}>
                    <Link
                      to={`/pets/${pet.id}`}
                      className="block rounded-2xl border border-border bg-card p-3.5 shadow-card transition-colors hover:border-primary/40"
                    >
                      <div className="flex gap-3">
                        <div className="shrink-0">
                          {pet.avatarUrl ? (
                            <img src={pet.avatarUrl} alt={pet.name} className="size-[68px] rounded-xl object-cover bg-muted" />
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
                              {hasSharedHistory ? (
                                <span
                                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
                                  title="Shared record"
                                  aria-label="Shared record"
                                >
                                  <Link2 className="size-3" />
                                </span>
                              ) : null}
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
              {!pets.length ? (
                <li className="text-center py-16 text-muted-foreground">
                  No records match "{queryValue || q}" with the current filters.
                </li>
              ) : null}
            </ul>
          </>
        )}
      </section>
    </AppLayout>
  );
}
