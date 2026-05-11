import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock3, Copy, ExternalLink, PawPrint, QrCode, ShieldCheck, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { apiRequest, type OwnerPetListItem, type OwnerShareToken } from "@/lib/api";
import { formatDateTime, formatWeightKg, getErrorMessage, getPetAgeLabel, getPetTypeLabel, titleCase } from "@/lib/format";
import { useOwnerSession } from "@/lib/owner-auth";

export default function OwnerShare() {
  const { token } = useOwnerSession();
  const [selectedPetId, setSelectedPetId] = useState("");
  const [busyType, setBusyType] = useState<"EMERGENCY" | "FULL_PROFILE" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const petsQuery = useQuery({
    queryKey: ["owner-pets"],
    queryFn: () => apiRequest<{ pets: OwnerPetListItem[] }>("/owner/pets", { token }),
    enabled: Boolean(token),
  });

  const shareTokensQuery = useQuery({
    queryKey: ["owner-share-tokens"],
    queryFn: () => apiRequest<{ tokens: OwnerShareToken[] }>("/owner/share-tokens", { token }),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!selectedPetId && petsQuery.data?.pets.length) {
      setSelectedPetId(petsQuery.data.pets[0].id);
    }
  }, [petsQuery.data?.pets, selectedPetId]);

  const selectedPet = useMemo(
    () => petsQuery.data?.pets.find((pet) => pet.id === selectedPetId) ?? null,
    [petsQuery.data?.pets, selectedPetId],
  );

  const activeTokens = useMemo(
    () =>
      (shareTokensQuery.data?.tokens ?? []).filter((shareToken) => shareToken.petId === selectedPetId && shareToken.isActive),
    [selectedPetId, shareTokensQuery.data?.tokens],
  );

  const emergencyToken = activeTokens.find((shareToken) => shareToken.type === "EMERGENCY") ?? null;
  const fullProfileTokens = activeTokens.filter((shareToken) => shareToken.type === "FULL_PROFILE");
  const latestFullProfileToken = fullProfileTokens[0] ?? null;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function createShareToken(type: "EMERGENCY" | "FULL_PROFILE") {
    if (!selectedPetId) {
      return;
    }

    setBusyType(type);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await apiRequest<{ token: OwnerShareToken }>("/owner/share-tokens", {
        method: "POST",
        token,
        body: {
          petId: selectedPetId,
          type,
          expiresInMinutes: type === "FULL_PROFILE" ? 60 : undefined,
        },
      });

      await shareTokensQuery.refetch();
      setStatusMessage(type === "EMERGENCY" ? "Emergency QR is ready." : "1-hour clinic share created.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyType(null);
    }
  }

  async function revokeShareToken(shareTokenId: string) {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await apiRequest<{ token: OwnerShareToken }>(`/owner/share-tokens/${shareTokenId}/revoke`, {
        method: "POST",
        token,
      });
      await shareTokensQuery.refetch();
      setStatusMessage("Share link revoked.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function copyShareUrl(shareToken: OwnerShareToken) {
    const shareUrl = `${baseUrl}/share/${shareToken.publicToken}`;
    await navigator.clipboard.writeText(shareUrl);
    setStatusMessage("Share link copied.");
  }

  return (
    <OwnerLayout
      title="Share & QR"
      titleHref={null}
      subtitle="Create a QR for emergencies or clinic visits."
    >
      <section className="space-y-5 px-5 pb-6">
        <section className="index-card bg-gradient-to-br from-card via-card to-primary-soft/60">
          <div className="flex items-start gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-float">
              <QrCode className="size-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold text-primary">Share your pet's VetCard</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose a pet, then create a QR for quick contact or a one-hour clinic view.
              </p>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="rounded-2xl border border-primary/10 bg-primary-soft px-4 py-3 text-sm text-primary">
            {statusMessage}
          </div>
        ) : null}

        <PetSelector
          pets={petsQuery.data?.pets ?? []}
          selectedPet={selectedPet}
          selectedPetId={selectedPetId}
          isLoading={petsQuery.isLoading}
          onSelect={setSelectedPetId}
        />

        <ShareCard
          title="Emergency QR"
          description="For collar tags, emergencies, and quick contact. This link stays limited-information and reusable."
          icon={<ShieldCheck className="size-5" />}
          tone="tertiary"
          shareToken={emergencyToken}
          shareUrl={emergencyToken ? `${baseUrl}/share/${emergencyToken.publicToken}` : null}
          helper={emergencyToken ? "Emergency page includes pet overview and owner contact." : "Generate once and keep it on the collar tag."}
          createLabel={emergencyToken ? "Regenerate later" : "Generate emergency QR"}
          onCreate={() => createShareToken("EMERGENCY")}
          onRevoke={emergencyToken ? () => revokeShareToken(emergencyToken.id) : undefined}
          onCopy={emergencyToken ? () => copyShareUrl(emergencyToken) : undefined}
          busy={busyType === "EMERGENCY"}
        />

        <ShareCard
          title="Clinic Visit QR"
          description="For intentional clinic sharing. This link opens the full pet profile and expires automatically after one hour."
          icon={<Clock3 className="size-5" />}
          tone="tertiary"
          shareToken={latestFullProfileToken}
          shareUrl={latestFullProfileToken ? `${baseUrl}/share/${latestFullProfileToken.publicToken}` : null}
          helper={
            latestFullProfileToken?.expiresAt
              ? `Expires ${formatDateTime(latestFullProfileToken.expiresAt)}`
              : "Generate a new temporary clinic share when needed."
          }
          createLabel="Generate 1-hour clinic QR"
          onCreate={() => createShareToken("FULL_PROFILE")}
          onRevoke={latestFullProfileToken ? () => revokeShareToken(latestFullProfileToken.id) : undefined}
          onCopy={latestFullProfileToken ? () => copyShareUrl(latestFullProfileToken) : undefined}
          busy={busyType === "FULL_PROFILE"}
        />
      </section>
    </OwnerLayout>
  );
}

function PetSelector({
  pets,
  selectedPet,
  selectedPetId,
  isLoading,
  onSelect,
}: {
  pets: OwnerPetListItem[];
  selectedPet: OwnerPetListItem | null;
  selectedPetId: string;
  isLoading: boolean;
  onSelect: (petId: string) => void;
}) {
  if (isLoading) {
    return (
      <section className="index-card">
        <div className="label-eyebrow">Selected pet</div>
        <div className="mt-4 h-28 rounded-3xl bg-muted animate-pulse" />
      </section>
    );
  }

  if (!pets.length) {
    return (
      <section className="index-card text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-tertiary-soft text-tertiary">
          <PawPrint className="size-6" />
        </div>
        <h2 className="mt-3 font-display text-lg font-bold">No pets yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Add a pet first, then come back here to create their VetCard QR.
        </p>
      </section>
    );
  }

  if (!selectedPet) {
    return null;
  }

  return (
    <section className="index-card">
      <div className="label-eyebrow">Selected pet</div>
      <div className="relative mt-3 overflow-hidden rounded-[1.5rem] border border-tertiary/20 bg-gradient-to-br from-card via-card to-tertiary-soft/55 p-4">
        <div className="relative flex items-center gap-3">
          {selectedPet.avatarUrl ? (
            <img
              src={selectedPet.avatarUrl}
              alt={selectedPet.name}
              className="size-20 shrink-0 rounded-3xl border-2 border-background/80 object-cover shadow-card"
            />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-card text-tertiary shadow-card">
              <PawPrint className="size-9" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-tertiary px-2.5 py-1 text-[10px] font-bold uppercase text-tertiary-foreground">
              <CheckCircle2 className="size-3" /> QR will be for
            </div>
            <h2 className="mt-2 line-clamp-2 font-display text-2xl font-bold leading-tight text-primary">{selectedPet.name}</h2>
            <div className="mt-2 flex flex-wrap gap-1 text-[10.5px] text-foreground">
              {[getPetTypeLabel(selectedPet.species), selectedPet.breed || "No breed", titleCase(selectedPet.sex)].map((value, index) => (
                <span key={`${selectedPet.id}-${value}-${index}`} className="rounded-full bg-card/80 px-2.5 py-1 font-medium shadow-card">
                  {value}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" /> {getPetAgeLabel(selectedPet.birthDate, selectedPet.ageLabel)}
              </span>
              <span className="text-border">|</span>
              <span>{formatWeightKg(selectedPet.weightKg)}</span>
              <span className="text-border">|</span>
              <span>
                {selectedPet.clinics.length} linked clinic{selectedPet.clinics.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {pets.length > 1 ? (
        <div className="mt-4">
          <div className="label-eyebrow text-muted-foreground">Change pet</div>
          <div className="relative mt-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pr-8">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  aria-pressed={selectedPetId === pet.id}
                  onClick={() => onSelect(pet.id)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    selectedPetId === pet.id
                      ? "border-tertiary bg-tertiary text-tertiary-foreground"
                      : "border-border bg-card text-foreground hover:border-tertiary/40"
                  }`}
                >
                  {pet.name}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ShareCard({
  title,
  description,
  icon,
  tone,
  shareToken,
  shareUrl,
  helper,
  createLabel,
  onCreate,
  onRevoke,
  onCopy,
  busy,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  tone: "primary" | "tertiary";
  shareToken: OwnerShareToken | null;
  shareUrl: string | null;
  helper: string;
  createLabel: string;
  onCreate: () => void;
  onRevoke?: () => void;
  onCopy?: () => void;
  busy: boolean;
}) {
  const toneClasses =
    tone === "primary"
      ? "bg-primary-soft text-primary"
      : "bg-tertiary-soft text-tertiary";

  return (
    <section className="index-card">
      <div className="flex items-start gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      {shareToken && shareUrl ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr]">
          <div className="rounded-[1.75rem] border border-border/70 bg-card p-4 shadow-card">
            <QRCodeSVG
              value={shareUrl}
              size={188}
              level="M"
              includeMargin
              bgColor="transparent"
              fgColor={tone === "primary" ? "#155e66" : "#ea6a00"}
              className="mx-auto"
            />
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">Share link</div>
              <div className="mt-1 break-all">{shareUrl}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">Status</div>
              <div className="mt-1">
                Viewed {shareToken.viewCount} time{shareToken.viewCount === 1 ? "" : "s"}
                {shareToken.lastViewedAt ? ` · Last opened ${formatDateTime(shareToken.lastViewedAt)}` : ""}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{helper}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-tertiary text-tertiary-foreground shadow-[0_12px_24px_-18px_hsl(var(--tertiary)_/_0.75)] hover:bg-tertiary/90"
                onClick={onCopy}
              >
                <Copy className="size-4" /> Copy link
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={shareUrl}>
                  <ExternalLink className="size-4" /> Open page
                </a>
              </Button>
              {onRevoke ? (
                <Button type="button" variant="outline" size="sm" onClick={onRevoke}>
                  <Trash2 className="size-4" /> Revoke
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          {helper}
        </div>
      )}

      <div className="mt-4">
        <Button
          type="button"
          size="lg"
          className="w-full bg-tertiary text-tertiary-foreground shadow-[0_16px_32px_-20px_hsl(var(--tertiary)_/_0.8)] hover:bg-tertiary/90"
          onClick={onCreate}
          disabled={busy}
        >
          {busy ? "Working..." : createLabel}
        </Button>
      </div>
    </section>
  );
}
