import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentDetail from "@/pages/AppointmentDetail";
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

function renderAppointmentDetail() {
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
      <MemoryRouter initialEntries={[{ pathname: "/appointments/appt-1", state: { from: "/calendar?date=2026-04-24" } }]}>
        <Routes>
          <Route path="/appointments/:appointmentId" element={<AppointmentDetail />} />
          <Route path="/pets/:id/visits/new" element={<div>Visit form</div>} />
          <Route path="/appointments/:appointmentId/edit" element={<div>Edit form</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppointmentDetail", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("lets staff mark a scheduled appointment as missed", async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string, options) => {
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

      if (path === "/appointments/appt-1/status") {
        return {
          appointment: {
            id: "appt-1",
            status: options?.body && typeof options.body === "object" ? (options.body as { status: string }).status : "MISSED",
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderAppointmentDetail();

    expect(await screen.findByRole("heading", { name: "Routine checkup" })).toBeInTheDocument();
    expect(screen.getByText("Booking Notes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark Missed" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/appointments/appt-1/status",
        expect.objectContaining({
          method: "PATCH",
          token: "session-token",
          body: { status: "MISSED" },
        }),
      );
    });
  });
});
