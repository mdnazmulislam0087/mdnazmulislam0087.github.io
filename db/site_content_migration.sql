-- Migration: add editable site content blocks for page CMS
-- Run this once if your project was initialized before site_content existed.

create table if not exists public.site_content (
  key text primary key check (key ~ '^[a-z0-9._-]+$'),
  page text not null check (page in ('home', 'about', 'research', 'contact', 'blog')),
  label text not null,
  kind text not null default 'text' check (kind in ('text', 'markdown')),
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Ensure columns exist even if table was created earlier with older structure.
alter table public.site_content add column if not exists page text;
alter table public.site_content add column if not exists label text;
alter table public.site_content add column if not exists kind text default 'text';
alter table public.site_content add column if not exists value text default '';
alter table public.site_content add column if not exists created_at timestamptz default now();
alter table public.site_content add column if not exists updated_at timestamptz default now();
alter table public.site_content add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.site_content
set
  page = coalesce(nullif(page, ''), 'home'),
  label = coalesce(nullif(label, ''), key),
  kind = coalesce(nullif(kind, ''), 'text'),
  value = coalesce(value, ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

create index if not exists idx_site_content_page on public.site_content (page);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_content_set_updated_at on public.site_content;
create trigger trg_site_content_set_updated_at
before update on public.site_content
for each row
execute function public.set_updated_at();

alter table public.site_content enable row level security;

drop policy if exists site_content_public_read on public.site_content;
drop policy if exists site_content_admin_manage on public.site_content;

create policy site_content_public_read
on public.site_content
for select
to anon, authenticated
using (true);

create policy site_content_admin_manage
on public.site_content
for all
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());
