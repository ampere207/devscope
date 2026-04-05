import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { startGithubOAuthAction } from "./github-connect";
import { analyzeRepositorySubmission } from "./submit-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Repo ingestion page scaffold for Phase 1 pipeline trigger.
 * It stays behind authentication because analyses are user-scoped.
 */
interface RepoPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RepoPage({ searchParams }: RepoPageProps) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : "";
  const connected = params.connected === "1";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabaseClient = supabase as any;

  const connectionResult = await supabaseClient
    .from("github_connections")
    .select("access_token, scope")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("github_access_token")?.value || "";
  const githubToken = connectionResult.data?.access_token ?? cookieToken;
  const githubScope = connectionResult.data?.scope ?? (cookieToken ? "oauth-cookie-fallback" : "");

  let connectedRepos: Array<{ name: string; repo_url: string; private: boolean }> = [];
  if (githubToken) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000"}/api/github/repos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: githubToken }),
          cache: "no-store",
        },
      );

      if (response.ok) {
        const payload = (await response.json()) as {
          repositories: Array<{ name?: string; repo_url?: string; private?: boolean }>;
        };
        connectedRepos = (payload.repositories || [])
          .filter((repo) => Boolean(repo.repo_url))
          .map((repo) => ({
            name: repo.name || repo.repo_url || "unknown-repo",
            repo_url: repo.repo_url || "",
            private: Boolean(repo.private),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch {
      // Keep repo page usable even if repo listing fails.
    }
  }

  async function analyzeRepositoryAction(formData: FormData) {
    "use server";
    await analyzeRepositorySubmission(formData);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-start px-6 py-12">
      <section className="panel-card w-full p-7">
        <h1 className="text-2xl font-bold text-slate-950">Connect Repository</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connect GitHub, import a repository, and trigger analysis.
        </p>

        {connected ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            GitHub account connected successfully.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">GitHub Connection</h2>
          <p className="mt-1 text-xs text-slate-600">
            OAuth keeps access scoped to your account and avoids low anonymous GitHub limits.
          </p>

          {githubToken ? (
            <p className="mt-3 text-xs text-emerald-700">Connected. Scope: {githubScope || "repo read:user"}</p>
          ) : (
            <p className="mt-3 text-xs text-slate-600">Not connected yet.</p>
          )}

          <form action={startGithubOAuthAction} className="mt-3">
            <button type="submit" className="btn-secondary">
              {githubToken ? "Reconnect GitHub" : "Connect GitHub"}
            </button>
          </form>
        </div>

        <form action={analyzeRepositoryAction} className="mt-6 flex flex-col gap-4">
          {connectedRepos.length > 0 ? (
            <label className="text-sm font-medium text-slate-700">
              Import Repository from GitHub
              <select
                name="repo_url"
                defaultValue={connectedRepos[0].repo_url}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none ring-cyan-200 transition focus:ring-4"
              >
                {connectedRepos.map((repo) => (
                  <option key={repo.repo_url} value={repo.repo_url}>
                    {repo.name} {repo.private ? "(private)" : "(public)"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-sm font-medium text-slate-700">
            Or paste Repository URL manually
            <input
              name="manual_repo_url"
              type="url"
              placeholder="https://github.com/org/repo"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none ring-cyan-200 transition focus:ring-4"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            GitHub Token (optional override)
            <input
              name="github_token"
              type="password"
              placeholder="ghp_..."
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none ring-cyan-200 transition focus:ring-4"
            />
          </label>

          <button type="submit" className="btn-primary w-full sm:w-fit">
            Analyze Repository
          </button>
        </form>
      </section>
    </main>
  );
}
