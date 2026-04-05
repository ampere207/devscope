"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getRedirectPath(formData: FormData, fallback = "/dashboard") {
  const nextPath = formData.get("next");
  if (typeof nextPath === "string" && nextPath.startsWith("/")) {
    return nextPath;
  }
  return fallback;
}

/**
 * Creates a user with email/password and starts a server-side session.
 * Keeps onboarding inside the app flow and redirects to the dashboard.
 */
export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = getRedirectPath(formData);

  if (!email || !password) {
    redirect("/signup?error=Missing+credentials");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(redirectTo);
}

/**
 * Signs the user in and redirects to protected product routes.
 */
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = getRedirectPath(formData);

  if (!email || !password) {
    redirect("/login?error=Missing+credentials");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(redirectTo);
}

/**
 * Clears the active session and sends users back to the auth screen.
 */
export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
