import { UserButton } from "@clerk/nextjs";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { visiblePaths } from "@/components/navigation/visible-paths";
import { requireMember } from "@/lib/auth/membership";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ctx = await requireMember();
  const paths = visiblePaths(ctx);

  return (
    <div className="bg-background min-h-screen md:flex">
      <aside className="hidden min-h-screen w-60 shrink-0 flex-col border-r bg-[#151222] px-4 py-8 md:flex">
        <div className="px-2">
          <p className="text-2xl font-bold tracking-tight">
            ledgerline<span className="text-primary">.</span>
          </p>
          <p className="text-muted-foreground mt-2 truncate text-[11px] font-semibold tracking-[0.12em] uppercase">
            {ctx.workspace.name}
          </p>
        </div>
        <div className="mt-12">
          <AppNavigation paths={paths} />
        </div>
        <div className="bg-secondary mt-auto flex items-center gap-3 rounded-xl border p-3">
          <UserButton />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ctx.member.displayName}</p>
            <p className="text-muted-foreground text-xs capitalize">
              {ctx.member.role.toLowerCase()}
            </p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b px-5 py-5 md:hidden">
          <div>
            <p className="text-2xl font-bold tracking-tight">
              ledgerline<span className="text-primary">.</span>
            </p>
            <p className="text-muted-foreground max-w-56 truncate text-xs">{ctx.workspace.name}</p>
          </div>
          <UserButton />
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1600px] px-5 pt-8 pb-28 sm:px-8 md:px-10 md:pt-10 md:pb-12"
        >
          {children}
        </main>
      </div>
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <AppNavigation paths={paths} mobile />
      </div>
    </div>
  );
}
