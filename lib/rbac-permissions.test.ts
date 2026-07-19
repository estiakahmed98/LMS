import { describe, expect, it } from "vitest";
import { PermissionModule } from "./generated/prisma/enums";
import {
  hasModulePermission,
  hasPermission,
  type PermissionAction,
  type PermissionGrant,
} from "./rbac-permissions";

const grant: PermissionGrant = {
  module: PermissionModule.COURSES,
  canView: true,
  canCreate: false,
  canEdit: true,
  canDelete: false,
  canExport: true,
};

describe("hasPermission", () => {
  it.each([
    ["view", true],
    ["create", false],
    ["edit", true],
    ["delete", false],
    ["export", true],
  ] satisfies [PermissionAction, boolean][])(
    "maps %s to its permission flag",
    (action, expected) => {
      expect(hasPermission(grant, action)).toBe(expected);
    },
  );

  it("denies access when no permission row exists", () => {
    expect(hasPermission(undefined, "view")).toBe(false);
    expect(hasPermission(null, "edit")).toBe(false);
  });

  it("resolves portal UI access by module and action", () => {
    expect(hasModulePermission([grant], PermissionModule.COURSES, "edit")).toBe(
      true,
    );
    expect(
      hasModulePermission([grant], PermissionModule.COURSES, "create"),
    ).toBe(false);
    expect(
      hasModulePermission([grant], PermissionModule.SETTINGS, "view"),
    ).toBe(false);
  });
});
