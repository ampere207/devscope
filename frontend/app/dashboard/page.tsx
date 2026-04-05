import { redirect } from "next/navigation";

import { logoutAction } from "@/app/(auth)/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Dashboard is protected by middleware and validated again in SSR.
 * The extra server check prevents accidental exposure on misconfigured deployments.
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-12 md:px-8">
      <section className="panel-card w-full p-7 md:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">Authenticated as {user.email}</p>
          </div>

          <form action={logoutAction}>
            <button type="submit" className="btn-secondary">
              Logout
            </button>
          </form>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="feature-card">
            <h2 className="feature-title">Repository Ingestion</h2>
            <p className="feature-copy">Connect repository URLs and trigger analysis runs.</p>
          </article>
          <article className="feature-card">
            <h2 className="feature-title">System Graph</h2>
            <p className="feature-copy">Inspect nodes and links generated from parsed dependencies.</p>
          </article>
          <article className="feature-card">
            <h2 className="feature-title">Impact Explorer</h2>
            <p className="feature-copy">Choose a node to evaluate potential blast radius.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
