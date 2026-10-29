import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db, schema } from "./db";

const credentials = z.object({ email: z.email(), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(input) {
        const parsed = credentials.safeParse(input);
        if (!parsed.success) return null;
        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, parsed.data.email.toLowerCase()),
        });
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, companyId: user.companyId, role: user.role };
      },
    }),
  ],
});

/** The signed-in staff member. Pages behind the middleware can rely on it. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.companyId) throw new Error("Not signed in");
  return session.user;
}
