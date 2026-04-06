"use client";

import { useState } from "react";
import { logoutAction } from "@/app/(auth)/actions";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName?: string;
}

export function UserProfileModal({
  isOpen,
  onClose,
  userEmail,
  userName,
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Account</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === "profile"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === "settings"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {userEmail}
                </p>
              </div>

              {userName && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Name
                  </label>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {userName}
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  You are currently using DevScope as an engineering analysis tool for repository intelligence.
                </p>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-900">
                    Auto-load AI Insights
                  </label>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Automatically fetch AI insights when loading a repository
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-900">
                    Analysis History Size
                  </label>
                  <select className="rounded border border-slate-300 px-2 py-1 text-xs">
                    <option>20</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Number of past analyses to keep in history
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-900">
                    Dark Mode
                  </label>
                  <input type="checkbox" className="h-4 w-4" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Coming soon in next release
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
          <form action={logoutAction} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
