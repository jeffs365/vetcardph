import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, PawPrint, Pencil, Plus, Stethoscope, Trash2 } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, type PetDetail, type PreventiveRecord } from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  formatCadence,
  formatDate,
  getDueStatus,
  getErrorMessage,
  getPreventiveRecordSourceLabel,
  getRecordOriginLabel,
} from "@/lib/format";
import { getCurrentPath, readReturnTo } from "@/lib/navigation";

type CareRecordCardProps = {
  record: PreventiveRecord;
  petId: string;
  currentPath: string;
  confirmingDeleteId: string | null;
  isDeleting: boolean;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
};

function CareRecordCard({
  record,
  petId,
  currentPath,
  confirmingDeleteId,
  isDeleting,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: CareRecordCardProps) {
  const isRecurring = Boolean(record.careType.isRecurring && record.nextDueDate);
  const status = isRecurring ? getDueStatus(record.nextDueDate) : { label: "One time", tone: "neutral" as const };
  const isConfirming = confirmingDeleteId === record.id;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Stethoscope className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{record.careType.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Recorded by {record.administeredBy.fullName} · {formatDate(record.administeredOn)}
              </div>
              {isRecurring &&
              typeof record.careType.defaultIntervalValue === "number" &&
              record.careType.defaultIntervalValue > 0 &&
              record.careType.defaultIntervalUnit ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatCadence(record.careType.defaultIntervalValue, record.careType.defaultIntervalUnit)}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <StatusBadge tone={record.recordedHere ? "success" : "neutral"}>
                {getRecordOriginLabel(record.recordedHere, record.sourceLabel)}
              </StatusBadge>
              {record.sourceType === "HISTORICAL_BOOKLET" ? (
                <StatusBadge tone="neutral">{getPreventiveRecordSourceLabel(record.sourceType)}</StatusBadge>
              ) : null}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {isRecurring && record.nextDueDate ? `Next due: ${formatDate(record.nextDueDate)}` : "No repeat scheduled"}
          </div>
          {record.productName || record.lotNumber || record.serialNumber || record.expiryDate ? (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-secondary/25 p-3 text-xs">
              {record.productName ? (
                <div>
                  <div className="font-semibold text-foreground">Product</div>
                  <div className="mt-0.5 text-muted-foreground">{record.productName}</div>
                </div>
              ) : null}
              {record.lotNumber ? (
                <div>
                  <div className="font-semibold text-foreground">Lot / batch</div>
                  <div className="mt-0.5 text-muted-foreground">{record.lotNumber}</div>
                </div>
              ) : null}
              {record.serialNumber ? (
                <div>
                  <div className="font-semibold text-foreground">Serial</div>
                  <div className="mt-0.5 text-muted-foreground">{record.serialNumber}</div>
                </div>
              ) : null}
              {record.expiryDate ? (
                <div>
                  <div className="font-semibold text-foreground">Expiry</div>
                  <div className="mt-0.5 text-muted-foreground">{formatDate(record.expiryDate)}</div>
                </div>
              ) : null}
            </div>
          ) : null}
          {record.notes ? <div className="mt-2 text-sm text-muted-foreground">{record.notes}</div> : null}
          {record.sourceNote ? (
            <div className="mt-2 rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
              Source: {record.sourceNote}
            </div>
          ) : null}

          {record.recordedHere ? (
            <div className="mt-3 flex items-center gap-4 border-t border-border/50 pt-3">
              {record.careType.id ? (
                <Link
                  to={`/pets/${petId}/preventive/${record.id}/edit`}
                  state={{ from: currentPath }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="size-3" /> Edit
                </Link>
              ) : null}
              {isConfirming ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Delete permanently?</span>
                  <button
                    type="button"
                    onClick={() => onConfirmDelete(record.id)}
                    disabled={isDeleting}
                    className="text-xs font-semibold text-destructive disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRequestDelete(record.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3" /> Delete
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PreventiveCare() {
  const { id = "" } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const currentPath = getCurrentPath(location.pathname, location.search);
  const returnTo = readReturnTo(location.state);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const petQuery = useQuery({
    queryKey: ["pet", id],
    queryFn: () => apiRequest<{ pet: PetDetail }>(`/pets/${id}`, { token }),
    enabled: Boolean(token && id),
  });

  const deleteRecord = useMutation({
    mutationFn: (recordId: string) =>
      apiRequest(`/preventive-records/${recordId}`, { method: "DELETE", token }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pet", id] });
      await queryClient.invalidateQueries({ queryKey: ["due-records"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setConfirmingDeleteId(null);
    },
  });

  const records = useMemo(() => petQuery.data?.pet.preventiveRecords ?? [], [petQuery.data?.pet.preventiveRecords]);
  const overdueRecords = useMemo(
    () =>
      records.filter(
        (record) => Boolean(record.careType.isRecurring && record.nextDueDate) && getDueStatus(record.nextDueDate).tone === "danger",
      ),
    [records],
  );

  return (
    <AppLayout>
      {petQuery.isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading records...</div>
      ) : petQuery.isError ? (
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {getErrorMessage(petQuery.error)}
          </div>
        </div>
      ) : petQuery.data ? (
        <>
          <div className="px-5 pt-4">
            <Link
              to={returnTo ?? `/pets/${petQuery.data.pet.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
            >
              <ChevronLeft className="size-4" /> {petQuery.data.pet.name}
            </Link>
          </div>

          <section className="px-5 pt-3">
            <h1 className="font-display text-3xl font-bold tracking-tight">Care Schedule</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <PawPrint className="size-4" /> {petQuery.data.pet.name} • {petQuery.data.pet.breed}
            </div>
            <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
              Staff can record one-time or recurring care items here, including vaccines, deworming, follow-ups, and rechecks.
            </div>

            <Button asChild variant="hero" size="lg" className="w-full mt-5">
              <Link to={`/pets/${petQuery.data.pet.id}/preventive/new`} state={{ from: currentPath }}>
                <Plus className="size-4" /> Record Care Item
              </Link>
            </Button>
          </section>

          {overdueRecords.length ? (
            <section className="px-5 pt-6">
              <div className="mb-3 flex items-center gap-2 text-destructive font-semibold text-sm">
                <AlertCircle className="size-4" /> Needs attention
              </div>
              <div className="space-y-3">
                {overdueRecords.map((record) => (
                  <CareRecordCard
                    key={record.id}
                    record={record}
                    petId={id}
                    currentPath={currentPath}
                    confirmingDeleteId={confirmingDeleteId}
                    isDeleting={deleteRecord.isPending}
                    onRequestDelete={setConfirmingDeleteId}
                    onCancelDelete={() => setConfirmingDeleteId(null)}
                    onConfirmDelete={(recordId) => deleteRecord.mutate(recordId)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="px-5 pt-6 pb-6">
            <div className="mb-3">
              <div className="label-eyebrow">History</div>
              <h2 className="font-display text-xl font-bold">Recorded care items ({records.length})</h2>
            </div>

            {records.length ? (
              <div className="space-y-3">
                {records.map((record) => (
                  <CareRecordCard
                    key={record.id}
                    record={record}
                    petId={id}
                    currentPath={currentPath}
                    confirmingDeleteId={confirmingDeleteId}
                    isDeleting={deleteRecord.isPending}
                    onRequestDelete={setConfirmingDeleteId}
                    onCancelDelete={() => setConfirmingDeleteId(null)}
                    onConfirmDelete={(recordId) => deleteRecord.mutate(recordId)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No care items recorded yet.
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="p-8 text-center text-muted-foreground">Pet not found.</div>
      )}
    </AppLayout>
  );
}
