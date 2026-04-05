import { redirect } from "next/navigation";

import { DashboardWorkspace } from "@/components/layout/DashboardWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Dashboard is protected by middleware and validated again in SSR.
 * The extra server check prevents accidental exposure on misconfigured deployments.
 */
interface DashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const repoId = typeof params.repo_id === "string" ? params.repo_id : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardWorkspace
      userEmail={user.email ?? "unknown"}
      repoId={repoId}
    />
  );
}
