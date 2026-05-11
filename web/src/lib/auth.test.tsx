import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

const sessionUser = {
  staffId: "staff-1",
  clinicId: "clinic-1",
  clinicName: "Demo Animal Care",
  clinicPhone: "09123456789",
  clinicAddress: "123 VetCard Ave",
  role: "OWNER" as const,
  fullName: "Demo Owner",
  email: "owner@demo.vetcard.app",
  phone: "09123456789",
};

function SessionProbe() {
  const { isLoading, user, signIn, signOut } = useSession();

  return (
    <div>
      <div data-testid="session-state">{isLoading ? "loading" : user?.fullName ?? "signed-out"}</div>
      <button
        type="button"
        onClick={() => {
          void signIn({ email: sessionUser.email, password: "password123" });
        }}
      >
        sign-in
      </button>
      <button type="button" onClick={signOut}>
        sign-out
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(apiRequest).mockReset();
  });

  it("ignores and clears a saved legacy token while checking the cookie session", async () => {
    window.localStorage.setItem("vetcard.auth.token", "saved-token");
    vi.mocked(apiRequest).mockResolvedValueOnce({ user: sessionUser });

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent("Demo Owner");
    });
    expect(apiRequest).toHaveBeenCalledWith("/auth/me");
    expect(window.localStorage.getItem("vetcard.auth.token")).toBeNull();
  });

  it("checks for a cookie session on load without a saved token", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ user: sessionUser });

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent("Demo Owner");
    });
    expect(apiRequest).toHaveBeenCalledWith("/auth/me");
  });

  it("clears an invalid saved session", async () => {
    window.localStorage.setItem("vetcard.auth.token", "bad-token");
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("Invalid token"));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent("signed-out");
    });
    expect(window.localStorage.getItem("vetcard.auth.token")).toBeNull();
  });

  it("uses cookie session state after sign in without persisting the legacy token", async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string) => {
      if (path === "/auth/login") {
        return {
          token: "fresh-token",
          user: sessionUser,
        };
      }

      if (path === "/auth/me") {
        return {
          user: sessionUser,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "sign-in" }));

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent("Demo Owner");
    });
    expect(apiRequest).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: {
        email: "owner@demo.vetcard.app",
        password: "password123",
      },
    });
    expect(window.localStorage.getItem("vetcard.auth.token")).toBeNull();
  });

  it("calls the backend logout endpoint when signing out", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ user: sessionUser });

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent("Demo Owner");
    });

    fireEvent.click(screen.getByRole("button", { name: "sign-out" }));

    expect(screen.getByTestId("session-state")).toHaveTextContent("signed-out");
    expect(apiRequest).toHaveBeenCalledWith("/auth/logout", {
      method: "POST",
      retryOnUnauthorized: false,
    });
  });
});
