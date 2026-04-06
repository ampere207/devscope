import { redirect } from "next/navigation";

import { Dashboard } from "@/components/layout/Dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnalysisListItem } from "@/lib/api/types";

/**
 * Dashboard is protected by middleware and validated again in SSR.
 * The extra server check prevents accidental exposure on misconfigured deployments.
 * 
 * Dashboard only shows account details, history, and settings.
 * For repo analysis, navigate to /repo/[id]
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repositoriesResult = await supabase
    .from("repositories")
    .select("id, repo_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const repositoryRows = (repositoriesResult.data || []) as Array<{ id: string; repo_url: string }>;
  const repoIds = repositoryRows.map((row) => row.id);

  const analysesResult = repoIds.length
    ? await supabase
        .from("analyses")
        .select("id, repo_id, graph_data, created_at")
        .in("repo_id", repoIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ id: string; repo_id: string; graph_data: unknown; created_at: string }> };

  const repoUrlById = new Map(repositoryRows.map((row) => [row.id, row.repo_url]));
  const analyses: AnalysisListItem[] = (analysesResult.data || []).map((analysis) => {
    const graphData = (analysis.graph_data as { backend_analysis_id?: string; repo_url?: string }) || {};

    return {
      analysis_id: graphData.backend_analysis_id || analysis.id,
      repo_url: graphData.repo_url || repoUrlById.get(analysis.repo_id) || "unknown",
      created_at: analysis.created_at,
    };
  });

  return (
    <Dashboard
      userEmail={user.email ?? "unknown"}
      initialAnalyses={analyses}
    />
  );
}
