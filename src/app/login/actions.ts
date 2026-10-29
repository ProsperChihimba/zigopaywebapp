"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error: string; email: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (err) {
    // A successful sign-in throws a redirect, which must be re-thrown.
    if (err instanceof AuthError) return { error: "Wrong email or password.", email: String(formData.get("email") ?? "") };
    throw err;
  }
}
