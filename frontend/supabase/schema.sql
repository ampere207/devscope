-- DevScope Phase 1 schema
-- Users are managed by Supabase Auth in auth.users.

create extension if not exists "pgcrypto";

create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  repo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists repositories_user_id_idx on public.repositories (user_id);
create unique index if not exists repositories_user_repo_url_uidx
  on public.repositories (user_id, repo_url);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.repositories (id) on delete cascade,
  graph_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists analyses_repo_id_idx on public.analyses (repo_id);

create table if not exists public.github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'github',
  access_token text not null,
  token_type text,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists github_connections_user_id_idx on public.github_connections (user_id);

alter table public.repositories enable row level security;
alter table public.analyses enable row level security;
alter table public.github_connections enable row level security;

create policy if not exists "Users can insert own repositories"
  on public.repositories
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can view own repositories"
  on public.repositories
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can update own repositories"
  on public.repositories
  for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete own repositories"
  on public.repositories
  for delete
  using (auth.uid() = user_id);

create policy if not exists "Users can insert analyses for own repositories"
  on public.analyses
  for insert
  with check (
    exists (
      select 1
      from public.repositories r
      where r.id = repo_id and r.user_id = auth.uid()
    )
  );

create policy if not exists "Users can view analyses for own repositories"
  on public.analyses
  for select
  using (
    exists (
      select 1
      from public.repositories r
      where r.id = repo_id and r.user_id = auth.uid()
    )
  );

create policy if not exists "Users can insert own github connections"
  on public.github_connections
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can view own github connections"
  on public.github_connections
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can update own github connections"
  on public.github_connections
  for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete own github connections"
  on public.github_connections
  for delete
  using (auth.uid() = user_id);
