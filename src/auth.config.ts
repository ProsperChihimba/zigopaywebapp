import type { NextAuthConfig } from "next-auth";

// Paths anyone can open: the login page, customer PDF links, and provider webhooks.
const PUBLIC_PATHS = ["/login", "/i/", "/r/", "/api/webhooks/"];

// Kept free of database code so the middleware can use it.
export const authConfig = {
  // Auth.js sends its own errors (e.g. a missing AUTH_SECRET) to /login?error=… instead of a raw JSON page.
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.companyId = user.companyId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.companyId = token.companyId;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
