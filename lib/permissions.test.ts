import { describe, expect, it } from "vitest";
import { ROLE_DEFAULT_PERMISSIONS, permissionDependencyErrors } from "./permissions";

describe("permissions", () => {
  it("starts normal users with View dashboard only", () => {
    expect(ROLE_DEFAULT_PERMISSIONS.USER).toEqual(["VIEW_DASHBOARD"]);
  });

  it("requires View sales for Edit and Delete sales", () => {
    expect(
      permissionDependencyErrors(["VIEW_DASHBOARD", "EDIT_SALES", "DELETE_SALES"]),
    ).toHaveLength(2);
    expect(permissionDependencyErrors(["VIEW_SALES", "EDIT_SALES"])).toEqual([]);
  });

  it("allows Add sales as entry-only", () => {
    expect(permissionDependencyErrors(["ADD_SALES"])).toEqual([]);
  });
});
