import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Repo ingestion page scaffold for Phase 1 pipeline trigger.
 * It stays behind authentication because analyses are user-scoped.
 */
export default async function RepoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-start px-6 py-12">
      <section className="panel-card w-full p-7">
        <h1 className="text-2xl font-bold text-slate-950">Connect Repository</h1>
        <p className="mt-2 text-sm text-slate-600">
          Phase 1 accepts a repository URL and triggers backend analysis.
        </p>

        <form className="mt-6 flex flex-col gap-4">
          <label className="text-sm font-medium text-slate-700">
            Repository URL
            <input
              type="url"
              required
              placeholder="https://github.com/org/repo"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none ring-cyan-200 transition focus:ring-4"
            />
          </label>

          <button type="button" className="btn-primary w-full sm:w-fit" disabled>
            Analyze (wired in next step)
          </button>
        </form>
      </section>
    </main>
  );
}
