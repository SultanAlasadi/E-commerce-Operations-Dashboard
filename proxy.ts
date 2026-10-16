import { clerkMiddleware } from "@clerk/nextjs/server";

// Makes the Clerk session available to server code. It deliberately does not
// gate routes by path: Clerk deprecated path-based protection, and PLAN §3
// requires checks inside each page, layout, Server Action and Route Handler
// (see lib/auth/session.ts).
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
