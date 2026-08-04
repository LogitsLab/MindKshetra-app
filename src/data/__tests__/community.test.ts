/** @jest-environment node */
import { CARE_RESOURCES, COMMUNITY_ROUTE_TARGETS } from "../community";

describe("community native handoffs", () => {
  it("targets the native care and support routes", () => {
    expect(COMMUNITY_ROUTE_TARGETS).toEqual({
      care: "/care",
      support: "/support",
    });
  });

  it("keeps every helpline directly callable", () => {
    expect(CARE_RESOURCES).toHaveLength(3);
    expect(new Set(CARE_RESOURCES.map((resource) => resource.id)).size).toBe(
      CARE_RESOURCES.length
    );

    for (const resource of CARE_RESOURCES) {
      expect(resource.phone).toMatch(/^\d+$/);
      expect(resource.phoneUrl).toBe(`tel:${resource.phone}`);
    }
  });
});
