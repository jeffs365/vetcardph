import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddVisit from "@/pages/AddVisit";
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

function renderEditVisitPage() {
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
      <MemoryRouter
        initialEntries={[{ pathname: "/pets/pet-1/visits/visit-1/edit", state: { from: "/pets/pet-1" } }]}
      >
        <Routes>
          <Route path="/pets/:id/visits/:visitId/edit" element={<AddVisit />} />
          <Route path="/pets/:id/visits/:visitId" element={<div>Visit detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderNewVisitFromAppointmentPage() {
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
      <MemoryRouter
        initialEntries={[{ pathname: "/pets/pet-1/visits/new", search: "?appointmentId=appt-1", state: { from: "/appointments/appt-1" } }]}
      >
        <Routes>
          <Route path="/pets/:id/visits/new" element={<AddVisit />} />
          <Route path="/pets/:id/visits/:visitId" element={<div>Visit detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AddVisit edit flow", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("loads an existing visit and saves updates through the visit update route", async () => {
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
            visits: [
              {
                id: "visit-1",
                appointmentId: null,
                visitDate: "2026-04-20T00:00:00.000Z",
                reasonForVisit: "Annual wellness exam",
                findingsNotes: "Healthy exam with normal vitals.",
                treatmentGiven: "Routine exam completed.",
                diagnosis: "Healthy",
                followUpNotes: "Return in 12 months.",
                recordedHere: true,
                sourceLabel: "Recorded here",
                attendedBy: {
                  id: "staff-1",
                  fullName: "Dr. Lara Santos",
                  role: "VETERINARIAN",
                },
              },
            ],
            appointments: [],
            preventiveRecords: [],
          },
        };
      }

      if (path === "/staff") {
        return {
          staff: [
            {
              id: "staff-1",
              fullName: "Dr. Lara Santos",
              email: "lara@demo.vetcard.app",
              phone: "09123456789",
              role: "VETERINARIAN",
            },
          ],
        };
      }

      if (path === "/visits/visit-1") {
        return {
          visit: {
            id: "visit-1",
            appointmentId: null,
            visitDate: "2026-04-20T00:00:00.000Z",
            reasonForVisit: "Annual wellness exam",
            findingsNotes: "Healthy exam with normal vitals.",
            treatmentGiven: "Routine exam completed.",
            diagnosis: "Healthy",
            followUpNotes: "Return in 12 months.",
            recordedHere: true,
            sourceLabel: "Recorded here",
            attendedBy: {
              id: "staff-1",
              fullName: "Dr. Lara Santos",
              role: "VETERINARIAN",
            },
            pet: {
              id: "pet-1",
              name: "Bruno",
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderEditVisitPage();

    expect(await screen.findByDisplayValue("Annual wellness exam")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Healthy exam with normal vitals.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Routine exam completed.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("e.g. Otitis externa"), {
      target: { value: "Seasonal dermatitis" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Visit" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/visits/visit-1",
        expect.objectContaining({
          method: "PUT",
          token: "session-token",
          body: expect.objectContaining({
            diagnosis: "Seasonal dermatitis",
            reasonForVisit: "Annual wellness exam",
          }),
        }),
      );
    });
  });

  it("keeps appointment booking notes out of the visit follow-up field", async () => {
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

      if (path === "/staff") {
        return {
          staff: [
            {
              id: "staff-1",
              fullName: "Dr. Lara Santos",
              email: "lara@demo.vetcard.app",
              phone: "09123456789",
              role: "VETERINARIAN",
            },
          ],
        };
      }

      if (path === "/appointments/appt-1") {
        return {
          appointment: {
            id: "appt-1",
            scheduledFor: "2026-04-24T09:00:00.000Z",
            reason: "Routine checkup",
            notes: "Bring previous prescriptions if symptoms continue.",
            status: "SCHEDULED",
            pet: {
              id: "pet-1",
              name: "Bruno",
              species: "Dog",
              breed: "Beagle Mix",
              color: "Brown",
              sex: "MALE",
              avatarUrl: null,
              birthDate: "2023-05-10T00:00:00.000Z",
              ageLabel: "2 yr",
              weightKg: 12.5,
              owner: {
                id: "owner-1",
                fullName: "Jeffrey Sapitan",
                mobile: "639123456789",
                address: "Poblacion, Malolos",
                email: "sapitan.jeffrey@gmail.com",
              },
            },
            createdBy: {
              id: "staff-1",
              fullName: "Demo Owner",
              role: "OWNER",
            },
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderNewVisitFromAppointmentPage();

    expect(await screen.findByDisplayValue("Routine checkup")).toBeInTheDocument();
    expect(screen.getByText("Booking notes")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Recheck in 2 weeks")).toHaveValue("");
  });
});
