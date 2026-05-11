import { describe, expect, it } from "vitest";
import { getNavigationSource } from "@/lib/navigation";

describe("getNavigationSource", () => {
  it("keeps the parent pet route for visit edit flows", () => {
    expect(
      getNavigationSource({
        pathname: "/pets/pet-123/visits/visit-456/edit",
        search: "",
        state: { from: "/pets/pet-123" },
      }),
    ).toBe("/pets/pet-123");
  });

  it("uses the current pets route when not inside a nested flow", () => {
    expect(
      getNavigationSource({
        pathname: "/pets",
        search: "?q=bruno",
        state: null,
      }),
    ).toBe("/pets?q=bruno");
  });

  it("keeps the parent pet route for generalized preventive flows", () => {
    expect(
      getNavigationSource({
        pathname: "/pets/pet-123/preventive/new",
        search: "",
        state: { from: "/pets/pet-123" },
      }),
    ).toBe("/pets/pet-123");
  });
});
