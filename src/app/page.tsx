import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowed-users";
import { signOut } from "./login/actions";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-bold text-gray-900">Leave Management</span>
          {/* Reads the session cookie, so it streams in behind a boundary. */}
          <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded bg-gray-100" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Welcome 👋</h1>
        <p className="mt-2 text-gray-600">
          You are signed in. Leave requests and approvals will appear here.
        </p>
      </main>
    </div>
  );
}

async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;

  // Defence in depth — the proxy already enforces this.
  if (!email || !isAllowedEmail(email)) {
    redirect("/login");
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">{email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
