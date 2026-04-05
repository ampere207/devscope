"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function backendApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";
}

/**
 * Starts GitHub OAuth by generating state, persisting it in a short-lived cookie,
 * and redirecting users to GitHub via the backend OAuth start endpoint.
 */
export async function startGithubOAuthAction() {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("github_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const redirectUri = `${appBaseUrl()}/repo/github/callback`;
  const url = `${backendApiBaseUrl()}/api/github/oauth/start?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", cache: "no-store" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not contact backend";
    redirect(`/repo?error=${encodeURIComponent(`Failed to start GitHub OAuth: ${message}`)}`);
  }

  if (!response.ok) {
    redirect("/repo?error=Failed+to+start+GitHub+OAuth");
  }

  const payload = (await response.json()) as { authorization_url?: string };
  if (!payload.authorization_url) {
    redirect("/repo?error=Backend+did+not+return+OAuth+authorization+URL");
  }

  redirect(payload.authorization_url);
}
