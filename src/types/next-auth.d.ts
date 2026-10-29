import type { DefaultSession } from "next-auth";

type Role = "admin" | "finance" | "warehouse";

declare module "next-auth" {
  interface User {
    companyId: string;
    role: Role;
  }
  interface Session {
    user: { id: string; companyId: string; role: Role } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    companyId: string;
    role: Role;
  }
}
