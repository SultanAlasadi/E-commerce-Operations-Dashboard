"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesColumn,
  PanelsTopLeft,
  UsersRound,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Sales", href: "/sales", icon: ChartNoAxesColumn },
  { label: "Platforms", href: "/platforms", icon: PanelsTopLeft },
  { label: "Team", href: "/team", icon: UsersRound },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export type NavigationPath = (typeof navigation)[number]["href"];

export function AppNavigation({
  paths,
  mobile = false,
}: {
  paths: NavigationPath[];
  mobile?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={mobile ? "Mobile navigation" : "Main navigation"}
      className={mobile ? "flex w-full items-center justify-around gap-1" : "space-y-1"}
    >
      {navigation
        .filter((item) => paths.includes(item.href))
        .map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-visible:outline-ring transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                mobile
                  ? "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] sm:text-xs"
                  : "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                active
                  ? mobile
                    ? "text-accent-foreground"
                    : "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className={mobile ? "size-5" : "size-4"} strokeWidth={1.8} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
    </nav>
  );
}
