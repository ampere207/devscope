import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "./lib/supabase/proxy-session";

const protectedRoutes = ["/dashboard", "/repo"];

/**
 * Enforces authenticated access for product routes.
 * Public auth routes remain accessible for signup and login.
 */
export async function proxy(request: NextRequest) {
  const { supabase, response } = await updateSession(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedPath = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtectedPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/repo/:path*", "/login", "/signup"],
};
