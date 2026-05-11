import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddPreventiveRecord from "@/pages/AddPreventiveRecord";
import { apiRequest } from "@/lib/api";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  useSession: () => ({
    token: "session-token",
    user: {
      staffId: "staff-1",
      fullName: "Demo Owner",
    },
  }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

function renderAddPreventiveRecordPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/pets/pet-1/preventive/new", state: { from: "/pets/pet-1/preventive" } }]}>
        <Routes>
          <Route path="/pets/:id/preventive/new" element={<AddPreventiveRecord />} />
          <Route path="/pets/:id/preventive" element={<div>Care schedule</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AddPreventiveRecord", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("saves a recurring care item with structured cadence fields", async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === "/pets/pet-1") {
        return {
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
            preventiveRecords: [],
          },
        };
      }

      if (path === "/pets/pet-1/preventive-records") {
        return {
          record: {
            id: "record-1",
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderAddPreventiveRecordPage();

    expect(await screen.findByRole("heading", { name: "Record Vaccine" })).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText(/Care item name/i), {
      target: { value: "Skin recheck" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Recurring/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "WEEK" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/pets/pet-1/preventive-records",
        expect.objectContaining({
          method: "POST",
          token: "session-token",
          body: expect.objectContaining({
            careName: "Skin recheck",
            recurrenceKind: "RECURRING",
            intervalValue: 2,
            intervalUnit: "WEEK",
          }),
        }),
      );
    });
  });

  it("saves a one-time care item without recurrence fields", async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === "/pets/pet-1") {
        return {
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
            preventiveRecords: [],
          },
        };
      }

      if (path === "/pets/pet-1/preventive-records") {
        return {
          record: {
            id: "record-2",
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderAddPreventiveRecordPage();

    fireEvent.change(await screen.findByLabelText(/Care item name/i), {
      target: { value: "Post-op check" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));

    await waitFor(() => {
      const saveCall = vi.mocked(apiRequest).mock.calls.find(([path]) => path === "/pets/pet-1/preventive-records");
      expect(saveCall).toBeTruthy();
      expect(saveCall?.[1]).toEqual(
        expect.objectContaining({
          method: "POST",
          token: "session-token",
          body: expect.objectContaining({
            careName: "Post-op check",
            recurrenceKind: "ONE_TIME",
          }),
        }),
      );
      expect(saveCall?.[1]?.body).not.toHaveProperty("intervalValue");
      expect(saveCall?.[1]?.body).not.toHaveProperty("intervalUnit");
      expect(saveCall?.[1]?.body).not.toHaveProperty("administeredById");
    });
  });

  it("marks a backfilled paper booklet entry as historical", async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === "/pets/pet-1") {
        return {
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
            clinics: [],
            visits: [],
            appointments: [],
            preventiveRecords: [],
            allergies: [],
            medications: [],
            dietNotes: [],
          },
        };
      }

      if (path === "/pets/pet-1/preventive-records") {
        return {
          record: {
            id: "record-3",
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderAddPreventiveRecordPage();

    fireEvent.change(await screen.findByLabelText(/Care item name/i), {
      target: { value: "Rabies" },
    });
    fireEvent.change(screen.getByLabelText(/^Date/i), {
      target: { value: "2024-05-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Copied from paper booklet/i }));
    fireEvent.change(screen.getByLabelText(/Source note/i), {
      target: { value: "Owner booklet page 3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Record" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/pets/pet-1/preventive-records",
        expect.objectContaining({
          body: expect.objectContaining({
            careName: "Rabies",
            administeredOn: "2024-05-15",
            sourceType: "HISTORICAL_BOOKLET",
            sourceNote: "Owner booklet page 3",
          }),
        }),
      );
    });
  });
});
