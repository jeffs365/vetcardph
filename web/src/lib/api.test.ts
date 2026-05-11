import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.cookie = "vc_staff_csrf=; Max-Age=0; Path=/";
    document.cookie = "vc_owner_csrf=; Max-Age=0; Path=/";
  });

  it("includes cookies on API requests without sending the cookie-session marker as a bearer token", async () => {
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiRequest("/dashboard/summary", { token: "cookie-session" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboard/summary",
      expect.objectContaining({
        credentials: "include",
        headers: {},
      }),
    );
  });

  it("does not send legacy bearer tokens from the web client", async () => {
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiRequest("/dashboard/summary", { token: "legacy-token" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboard/summary",
      expect.objectContaining({
        headers: {},
      }),
    );
  });

  it("sends the staff CSRF token on unsafe staff requests", async () => {
    document.cookie = "vc_staff_csrf=staff-csrf-token; Path=/";
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiRequest("/appointments", {
      method: "POST",
      token: "cookie-session",
      body: { reason: "Checkup" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/appointments",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "staff-csrf-token",
        },
      }),
    );
  });

  it("sends the owner CSRF token on unsafe owner requests", async () => {
    document.cookie = "vc_owner_csrf=owner-csrf-token; Path=/";
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiRequest("/owner/pets", {
      method: "POST",
      token: "cookie-session",
      body: { name: "Bruno" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/owner/pets",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "owner-csrf-token",
        },
      }),
    );
  });

  it("refreshes staff cookies once after an unauthorized protected request", async () => {
    const fetchMock = vi
      .spyOn(window, "fetch")
      .mockResolvedValueOnce(jsonResponse({ message: "Authentication required." }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ user: { staffId: "staff-1" } }))
      .mockResolvedValueOnce(jsonResponse({ summary: true }));

    const result = await apiRequest<{ summary: boolean }>("/dashboard/summary", {
      token: "cookie-session",
    });

    expect(result).toEqual({ summary: true });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses the owner refresh endpoint for owner routes", async () => {
    const fetchMock = vi
      .spyOn(window, "fetch")
      .mockResolvedValueOnce(jsonResponse({ message: "Owner authentication required." }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ user: { ownerId: "owner-1" } }))
      .mockResolvedValueOnce(jsonResponse({ pets: [] }));

    await apiRequest("/owner/pets", { token: "cookie-session" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/owner-auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });
});
