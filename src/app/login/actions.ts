"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error: string; email: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  // Without a secret, Auth.js answers with a raw JSON error page, so check first.
  if (!authSecretSet()) return { error: setupProblem("MissingSecret"), email };
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (err) {
    // A successful sign-in throws a redirect, which must be re-thrown.
    if (!(err instanceof AuthError)) throw err;
    if (err.type === "CredentialsSignin") return { error: "Wrong email or password.", email };
    console.error("[login]", err.type, err.message);
    return { error: setupProblem(err.type), email };
  }
}

/** The same variables Auth.js reads its secret from. */
function authSecretSet() {
  return !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
}

/** What staff see when sign-in fails for a reason other than their password. */
function setupProblem(type: string) {
  return type === "MissingSecret"
    ? "Sign-in is switched off: AUTH_SECRET is not set on the server. Ask whoever runs Zigopay to add it and redeploy."
    : `Sign-in failed because of a server problem (${type}). The server logs have the details.`;
}
