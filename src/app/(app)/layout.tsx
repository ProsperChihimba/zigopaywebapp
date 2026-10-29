import { auth, signOut } from "@/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar userName={session?.user?.name ?? ""} signOutAction={signOutAction} />
      <main className="min-w-0 flex-1 p-4 lg:py-10 lg:pr-8 lg:pl-0">
        <div className="min-h-[calc(100vh-5rem)] overflow-hidden rounded-3xl border border-line bg-white">{children}</div>
      </main>
    </div>
  );
}
