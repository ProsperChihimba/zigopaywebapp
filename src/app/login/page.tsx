import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Zigopay" };

// Errors Auth.js reports by redirecting here with ?error=…
const AUTH_ERRORS: Record<string, string> = {
  Configuration: "Sign-in isn't working because of a server setup problem. Ask whoever runs Zigopay to check the server logs (often a missing AUTH_SECRET).",
  AccessDenied: "This account is not allowed to sign in.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm setupError={error ? (AUTH_ERRORS[error] ?? "Sign-in failed. Please try again.") : undefined} />;
}
