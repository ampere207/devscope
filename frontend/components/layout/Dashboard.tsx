"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfileModal } from "@/components/layout/UserProfileModal";
import type { AnalysisListItem } from "@/lib/api/types";

interface DashboardProps {
  userEmail: string;
  initialAnalyses: AnalysisListItem[];
}

function formatUtcTimestamp(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export function Dashboard({ userEmail, initialAnalyses }: DashboardProps) {
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const analyses = initialAnalyses;
  const loading = false;

  function handleSelectRepo(analysisId: string) {
    router.push(`/repo/${analysisId}`);
  }

  function handleOpenGitHubImport() {
    router.push("/repo");
  }

  return (
    <main className="mx-auto flex w-full min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">DevScope</h1>
              <p className="text-sm text-slate-600">Repository Intelligence Platform</p>
            </div>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* User Welcome */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">Account</h2>
            <p className="text-sm text-slate-600">{userEmail}</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage Account
              </button>
              <button
                onClick={handleOpenGitHubImport}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Import from GitHub
              </button>
            </div>
          </div>

          {/* Repository History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Analysis History</h2>
                <p className="text-sm text-slate-600">
                  {analyses.length} repositories analyzed
                </p>
              </div>
              <button onClick={handleOpenGitHubImport} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Import from GitHub
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : analyses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                <p className="text-sm text-slate-600">
                  No repositories analyzed yet.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Click "Import from GitHub" to connect a repo.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {analyses.map((analysis) => (
                  <button
                    key={analysis.analysis_id}
                    onClick={() => handleSelectRepo(analysis.analysis_id)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {analysis.repo_url}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatUtcTimestamp(analysis.created_at)}
                        </p>
                      </div>
                      <div className="text-xl">→</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 font-semibold text-slate-900">GitHub Integration</h3>
              <p className="text-sm text-slate-600">
                DevScope analyzes repositories from GitHub. Connect your account for seamless analysis of public and private repositories.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 font-semibold text-slate-900">How It Works</h3>
              <p className="text-sm text-slate-600">
                1. Provide repository URL
              </p>
              <p className="text-sm text-slate-600">
                2. DevScope analyzes architecture
              </p>
              <p className="text-sm text-slate-600">
                3. View insights on the analysis page
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userEmail={userEmail}
      />
    </main>
  );
}
