import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PreventiveCare from "@/pages/PreventiveCare";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    token: "session-token",
  }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

function renderPreventiveCarePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/pets/pet-1/preventive", state: { from: "/pets/pet-1" } }]}>
        <Routes>
          <Route path="/pets/:id/preventive" element={<PreventiveCare />} />
          <Route path="/pets/:id/preventive/new" element={<div>Preventive form</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PreventiveCare", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("shows the unified care schedule without category filters", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      pet: {
        id: "pet-1",
        name: "Bruno",
        avatarUrl: null,
        species: "Dog",
        breed: "Beagle Mix",
        color: "Brown",
        weightKg: 12.5,
        sex: "MALE",
        birthDate: "2023-05-10T00:00:00.000Z",
        ageLabel: "2 yr",
        owner: {
          id: "owner-1",
          fullName: "Jeffrey Sapitan",
          mobile: "639123456789",
          address: "Poblacion, Malolos",
          email: "sapitan.jeffrey@gmail.com",
        },
        accessSummary: {
          linkedClinicCount: 2,
          hasSharedHistory: true,
        },
        visits: [],
        appointments: [],
        preventiveRecords: [
          {
            id: "record-1",
            administeredOn: "2026-04-01T00:00:00.000Z",
            nextDueDate: "2027-04-01T00:00:00.000Z",
            dueDateOverridden: false,
            notes: "Rabies booster",
            recordedHere: true,
            sourceLabel: "Recorded here",
            careType: {
              id: "care-1",
              name: "Rabies",
              isRecurring: true,
              defaultIntervalValue: 1,
              defaultIntervalUnit: "YEAR",
              defaultIntervalDays: 365,
            },
            administeredBy: {
              fullName: "Dr. Lara Santos",
              role: "VETERINARIAN",
            },
          },
          {
            id: "record-2",
            administeredOn: "2026-04-15T00:00:00.000Z",
            nextDueDate: "2026-07-14T00:00:00.000Z",
            dueDateOverridden: false,
            notes: "Routine deworming",
            recordedHere: true,
            sourceLabel: "Recorded here",
            careType: {
              id: "care-2",
              name: "Routine Deworming",
              isRecurring: true,
              defaultIntervalValue: 3,
              defaultIntervalUnit: "MONTH",
              defaultIntervalDays: 90,
            },
            administeredBy: {
              fullName: "Dr. Lara Santos",
              role: "VETERINARIAN",
            },
          },
          {
            id: "record-3",
            administeredOn: "2026-04-20T00:00:00.000Z",
            nextDueDate: "2026-05-04T00:00:00.000Z",
            dueDateOverridden: false,
            notes: "Skin check reminder",
            recordedHere: true,
            sourceLabel: "Recorded here",
            careType: {
              id: "care-3",
              name: "Skin recheck",
              isRecurring: true,
              defaultIntervalValue: 2,
              defaultIntervalUnit: "WEEK",
              defaultIntervalDays: 14,
            },
            administeredBy: {
              fullName: "Dr. Lara Santos",
              role: "VETERINARIAN",
            },
          },
          {
            id: "record-4",
            administeredOn: "2026-04-22T00:00:00.000Z",
            nextDueDate: null,
            dueDateOverridden: false,
            notes: "Travel certificate requirement",
            recordedHere: true,
            sourceLabel: "Recorded here",
            careType: {
              id: "care-4",
              name: "Travel certificate check",
              isRecurring: false,
              defaultIntervalValue: 0,
              defaultIntervalUnit: "DAY",
              defaultIntervalDays: 0,
            },
            administeredBy: {
              fullName: "Dr. Lara Santos",
              role: "VETERINARIAN",
            },
          },
        ],
      },
    });

    renderPreventiveCarePage();

    expect(await screen.findByRole("heading", { name: "Care Schedule" })).toBeInTheDocument();
    expect(screen.getByText("Rabies")).toBeInTheDocument();
    expect(screen.getByText("Routine Deworming")).toBeInTheDocument();
    expect(screen.getAllByText("Skin recheck").length).toBeGreaterThan(0);
    expect(screen.getByText("Travel certificate check")).toBeInTheDocument();
    expect(screen.getByText("One time")).toBeInTheDocument();
    expect(screen.getByText("No repeat scheduled")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recorded care items (4)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Vaccinations/ })).not.toBeInTheDocument();
  });
});
