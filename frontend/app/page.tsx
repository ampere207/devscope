import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="hero-orb hero-orb-left" aria-hidden="true" />
      <div className="hero-orb hero-orb-right" aria-hidden="true" />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-14 md:px-10 md:py-20">
        <section className="animate-rise rounded-3xl border border-white/50 bg-white/70 p-8 shadow-2xl shadow-cyan-900/10 backdrop-blur md:p-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-900/70">
            DevScope
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
            Understand your system before it breaks
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-700 md:text-lg">
            Ingest repositories, map dependencies, and reason about blast radius
            with an interactive graph your team can trust.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/repo" className="btn-primary">
              Connect Repository
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Open Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3">
          <article className="feature-card animate-rise" style={{ animationDelay: "80ms" }}>
            <h2 className="feature-title">System Visualization</h2>
            <p className="feature-copy">
              Traverse architecture as a living graph and inspect services,
              modules, and links in context.
            </p>
          </article>

          <article className="feature-card animate-rise" style={{ animationDelay: "160ms" }}>
            <h2 className="feature-title">Change Impact Analysis</h2>
            <p className="feature-copy">
              Select any node and reveal immediate and downstream impact before
              shipping risky changes.
            </p>
          </article>

          <article className="feature-card animate-rise" style={{ animationDelay: "240ms" }}>
            <h2 className="feature-title">Dependency Mapping</h2>
            <p className="feature-copy">
              Turn raw imports and function relationships into explorable,
              persisted system knowledge.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
