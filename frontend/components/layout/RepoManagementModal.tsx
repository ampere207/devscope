"use client";

import { useState } from "react";
import type { AnalysisListItem } from "@/lib/api/types";

interface RepoManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyses: AnalysisListItem[];
  onSelectRepo: (analysisId: string) => void;
  onAnalyzeRepo: (repoUrl: string) => void;
  isAnalyzing: boolean;
}

export function RepoManagementModal({
  isOpen,
  onClose,
  analyses,
  onSelectRepo,
  onAnalyzeRepo,
  isAnalyzing,
}: RepoManagementModalProps) {
  const [selectedTab, setSelectedTab] = useState<"repos" | "analyze">("repos");
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");

  const handleAnalyze = () => {
    if (!repoUrl.trim()) {
      setError("Repository URL is required");
      return;
    }
    if (
      !repoUrl.startsWith("https://github.com/") &&
      !repoUrl.startsWith("git@github.com:")
    ) {
      setError("Please provide a valid GitHub repository URL");
      return;
    }
    setError("");
    onAnalyzeRepo(repoUrl);
    setRepoUrl("");
  };

  if (!isOpen) return null;

  // Get unique repos from analyses
  const uniqueRepos = Array.from(
    new Map(
      analyses.map((a) => [a.repo_url, a])
    ).values()
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Repository Manager
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-16 flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setSelectedTab("repos")}
            className={`px-4 py-3 text-sm font-medium ${
              selectedTab === "repos"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Repositories ({uniqueRepos.length})
          </button>
          <button
            onClick={() => setSelectedTab("analyze")}
            className={`px-4 py-3 text-sm font-medium ${
              selectedTab === "analyze"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Analyze New
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {selectedTab === "repos" && (
            <div className="space-y-3">
              {uniqueRepos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-600">
                    No repositories analyzed yet.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Go to "Analyze New" to add your first repository.
                  </p>
                </div>
              ) : (
                uniqueRepos.map((repo) => (
                  <button
                    key={repo.analysis_id}
                    onClick={() => {
                      onSelectRepo(repo.analysis_id);
                      onClose();
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <p className="font-medium text-slate-900">{repo.repo_url}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Analyzed {new Date(repo.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedTab === "analyze" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    setError("");
                  }}
                  placeholder="https://github.com/owner/repo"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={isAnalyzing}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  DevScope will analyze the repository structure, dependencies, and data flows to create an interactive intelligence graph.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Analysis typically takes 10-30 seconds depending on repository size.
                </p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !repoUrl.trim()}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  isAnalyzing || !repoUrl.trim()
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Repository"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
