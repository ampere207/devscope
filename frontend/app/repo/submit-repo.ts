import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface AnalyzeApiResponse {
  analysis_id: string;
  nodes: Array<{ id: string; type: string }>;
  edges: Array<{ source: string; target: string; relation: string }>;
}

function backendApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";
}

function parseRepositoryName(repoUrl: string) {
  const clean = repoUrl.replace(/\.git$/i, "");
  const segments = clean.split("/").filter(Boolean);
  return segments[segments.length - 1] || "repository";
}

function isMissingTableError(message: string, tableName: string) {
  const normalized = message.toLowerCase();
  return normalized.includes(`public.${tableName}`) && normalized.includes("schema cache");
}

/**
 * Runs repository analysis, persists repository and analysis metadata, and redirects to dashboard.
 */
export async function analyzeRepositorySubmission(formData: FormData) {
  const repoUrl =
    String(formData.get("repo_url") || "").trim() ||
    String(formData.get("manual_repo_url") || "").trim();
  const githubToken = String(formData.get("github_token") || "").trim();

  if (!repoUrl) {
    redirect("/repo?error=Repository+URL+is+required");
  }

  const supabase = await createSupabaseServerClient();
  const supabaseClient = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let resolvedToken = githubToken;
  if (!resolvedToken) {
    const connectionResult = await supabaseClient
      .from("github_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "github")
      .maybeSingle();

    if (!connectionResult.error) {
      resolvedToken = connectionResult.data?.access_token || "";
    }
  }

  if (!resolvedToken) {
    const cookieStore = await cookies();
    resolvedToken = cookieStore.get("github_access_token")?.value || "";
  }

  let response: Response;
  try {
    response = await fetch(`${backendApiBaseUrl()}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo_url: repoUrl,
        github_token: resolvedToken || null,
      }),
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `Backend request failed: ${error.message}`
        : "Backend request failed";
    redirect(`/repo?error=${encodeURIComponent(message)}`);
  }

  if (!response.ok) {
    let errorBody = "Analysis failed";
    try {
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { detail?: string };
        if (payload?.detail) {
          errorBody = payload.detail;
        }
      } else {
        const text = await response.text();
        if (text) {
          errorBody = text;
        }
      }
    } catch {
      // Keep default message when response body cannot be parsed.
    }
    redirect(`/repo?error=${encodeURIComponent(errorBody)}`);
  }

  let apiPayload: AnalyzeApiResponse;
  try {
    apiPayload = (await response.json()) as AnalyzeApiResponse;
  } catch {
    redirect("/repo?error=Invalid+analysis+response+from+backend");
  }

  if (!apiPayload.analysis_id) {
    redirect("/repo?error=Backend+did+not+return+analysis+id");
  }

  let repositoryId: string | null = null;
  let persistenceWarning = "";

  const existingRepository = await supabaseClient
    .from("repositories")
    .select("id")
    .eq("user_id", user.id)
    .eq("repo_url", repoUrl)
    .maybeSingle();

  if (existingRepository.error) {
    if (isMissingTableError(existingRepository.error.message, "repositories")) {
      persistenceWarning = "Supabase repositories table missing. Analysis persisted only in backend memory.";
    } else {
      redirect(`/repo?error=${encodeURIComponent(existingRepository.error.message)}`);
    }
  }

  repositoryId = existingRepository.data?.id ?? null;

  if (!repositoryId && !persistenceWarning) {
    const createdRepository = await supabaseClient
      .from("repositories")
      .insert({
        user_id: user.id,
        name: parseRepositoryName(repoUrl),
        repo_url: repoUrl,
      })
      .select("id")
      .single();

    if (createdRepository.error || !createdRepository.data) {
      const message = createdRepository.error?.message || "Repository save failed";
      if (isMissingTableError(message, "repositories")) {
        persistenceWarning = "Supabase repositories table missing. Analysis persisted only in backend memory.";
      } else {
        redirect(`/repo?error=${encodeURIComponent(message)}`);
      }
    }

    repositoryId = createdRepository.data?.id ?? null;
  }

  if (repositoryId) {
    const analysisInsert = await supabaseClient.from("analyses").insert({
      repo_id: repositoryId,
      graph_data: {
        backend_analysis_id: apiPayload.analysis_id,
        repo_url: repoUrl,
        nodes: apiPayload.nodes,
        edges: apiPayload.edges,
      },
    });

    if (analysisInsert.error) {
      if (isMissingTableError(analysisInsert.error.message, "analyses")) {
        persistenceWarning = "Supabase analyses table missing. Analysis persisted only in backend memory.";
      } else {
        redirect(`/repo?error=${encodeURIComponent(analysisInsert.error.message)}`);
      }
    }
  }

  const warningQuery = persistenceWarning
    ? `&warning=${encodeURIComponent(persistenceWarning)}`
    : "";

  redirect(`/repo/${encodeURIComponent(apiPayload.analysis_id)}${warningQuery}`);
}
