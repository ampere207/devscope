import Link from "next/link";

import { loginAction } from "../actions";

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextValue = typeof params.next === "string" ? params.next : "/dashboard";
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-16">
      <section className="panel-card animate-rise w-full p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Continue to your DevScope dashboard.</p>

        {error ? (
          <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="next" value={nextValue} />

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none ring-cyan-200 transition focus:ring-4"
              placeholder="you@company.com"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              required
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none ring-cyan-200 transition focus:ring-4"
              placeholder="••••••••"
            />
          </label>

          <button type="submit" className="btn-primary mt-2 w-full">
            Login
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          New to DevScope?{" "}
          <Link href="/signup" className="font-semibold text-cyan-800">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
