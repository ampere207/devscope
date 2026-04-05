import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function backendApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";
}

/**
 * Handles OAuth callback: validates state, exchanges code, persists token in DB when possible,
 * and falls back to secure cookie storage if github_connections table is not yet migrated.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const oauthError = url.searchParams.get("error") || "";

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/repo?error=${encodeURIComponent(`GitHub OAuth failed: ${oauthError}`)}`, appBaseUrl()),
    );
  }

  const expectedState = request.cookies.get("github_oauth_state")?.value;
  if (!code || !state || !expectedState || expectedState !== state) {
    return NextResponse.redirect(
      new URL("/repo?error=Invalid+GitHub+OAuth+state+or+missing+code", appBaseUrl()),
    );
  }

  const exchangeResponse = await fetch(`${backendApiBaseUrl()}/api/github/oauth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      redirect_uri: `${appBaseUrl()}/repo/github/callback`,
    }),
    cache: "no-store",
  });

  if (!exchangeResponse.ok) {
    let detail = "GitHub OAuth exchange failed";
    try {
      const payload = (await exchangeResponse.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep default when response is not parseable.
    }

    const errorResponse = NextResponse.redirect(
      new URL(`/repo?error=${encodeURIComponent(detail)}`, appBaseUrl()),
    );
    errorResponse.cookies.delete("github_oauth_state");
    return errorResponse;
  }

  const tokenPayload = (await exchangeResponse.json()) as {
    access_token: string;
    token_type: string;
    scope: string;
  };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginResponse = NextResponse.redirect(new URL("/login", appBaseUrl()));
    loginResponse.cookies.delete("github_oauth_state");
    return loginResponse;
  }

  const supabaseClient = supabase as any;
  const upsertResult = await supabaseClient.from("github_connections").upsert(
    {
      user_id: user.id,
      provider: "github",
      access_token: tokenPayload.access_token,
      token_type: tokenPayload.token_type,
      scope: tokenPayload.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );

  const redirectUrl = new URL("/repo?connected=1", appBaseUrl());
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete("github_oauth_state");

  const upsertErrorMessage = upsertResult.error?.message || "";
  const missingTable =
    upsertErrorMessage.includes("public.github_connections") ||
    upsertErrorMessage.toLowerCase().includes("schema cache");

  if (upsertResult.error && !missingTable) {
    return NextResponse.redirect(
      new URL(`/repo?error=${encodeURIComponent(upsertErrorMessage)}`, appBaseUrl()),
    );
  }

  if (missingTable) {
    // Temporary compatibility mode before running SQL migration.
    response.cookies.set("github_access_token", tokenPayload.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  return response;
}
