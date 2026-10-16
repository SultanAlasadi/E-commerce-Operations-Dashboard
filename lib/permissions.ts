import type { Permission, Role } from "@/generated/prisma/enums";

export const ALL_PERMISSIONS = [
  "VIEW_DASHBOARD",
  "VIEW_SALES",
  "ADD_SALES",
  "EDIT_SALES",
  "DELETE_SALES",
  "MANAGE_PLATFORMS",
  "MANAGE_TEAM",
] as const satisfies readonly Permission[];

/** Permissions written for a new member of each role (PLAN §3). */
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: ALL_PERMISSIONS,
  USER: ["VIEW_DASHBOARD"],
};

/** Permissions that are meaningless without another one. */
const REQUIRES: Partial<Record<Permission, Permission>> = {
  EDIT_SALES: "VIEW_SALES",
  DELETE_SALES: "VIEW_SALES",
};

/** Returns the dependency violations in a permission set, e.g. Edit sales without View sales. */
export function permissionDependencyErrors(permissions: readonly Permission[]): string[] {
  const set = new Set(permissions);
  return permissions.flatMap((permission) => {
    const required = REQUIRES[permission];
    return required && !set.has(required) ? [`${permission} requires ${required}`] : [];
  });
}
