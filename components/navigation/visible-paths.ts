import { can, type MemberContext } from "@/lib/auth/membership";
import type { NavigationPath } from "./app-navigation";

export function visiblePaths(ctx: MemberContext): NavigationPath[] {
  const paths: NavigationPath[] = [];
  if (can(ctx, "VIEW_DASHBOARD")) paths.push("/");
  if (can(ctx, "VIEW_SALES") || can(ctx, "ADD_SALES")) paths.push("/sales");
  if (can(ctx, "MANAGE_PLATFORMS")) paths.push("/platforms");
  if (can(ctx, "MANAGE_TEAM")) paths.push("/team");
  if (ctx.member.role === "OWNER") paths.push("/settings");
  return paths;
}
