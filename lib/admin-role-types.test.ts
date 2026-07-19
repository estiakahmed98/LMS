import { describe, expect, it } from "vitest";
import {
  modulesForRole,
  PERMISSION_MODULE_VALUES,
  ROLE_VALUES,
} from "./admin-role-types";

describe("role permission matrix modules", () => {
  it.each(ROLE_VALUES)(
    "shows every permission module for %s",
    (role) => {
      expect(modulesForRole(role)).toEqual([...PERMISSION_MODULE_VALUES]);
    },
  );
});
