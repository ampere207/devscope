import { redirect } from "next/navigation";
import { RepoAnalysis } from "@/components/layout/RepoAnalysis";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RepoPageProps {
  params: Promise<{ id: string }>;
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <RepoAnalysis analysisId={id} />;
}
