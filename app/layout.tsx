import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import "./globals.css";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="flex items-center justify-between p-4">
            <span>E-commerce Operations Dashboard</span>
            <nav aria-label="Account" className="flex items-center gap-4">
              <Show when="signed-out">
                {/* Invitation-only: no public sign-up. */}
                <SignInButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </nav>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
