-- Supabase schema for dynamic blog + admin publishing workflow
-- Run this in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) > 2),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '',
  content_md text not null,
  cover_image_url text,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists idx_posts_published_at on public.posts (published_at desc nulls last);
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_slug on public.posts (slug);
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

drop trigger if exists trg_posts_set_updated_at on public.posts;
create trigger trg_posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

drop trigger if exists trg_site_content_set_updated_at on public.site_content;
create trigger trg_site_content_set_updated_at
before update on public.site_content
for each row
execute function public.set_updated_at();

create or replace function public.is_site_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_admins admins
    where admins.user_id = uid
  );
$$;

grant execute on function public.is_site_admin(uuid) to anon, authenticated;

alter table public.site_admins enable row level security;
alter table public.posts enable row level security;
alter table public.site_content enable row level security;

drop policy if exists site_admins_select on public.site_admins;
drop policy if exists site_admins_manage on public.site_admins;

create policy site_admins_select
on public.site_admins
for select
to authenticated
using (user_id = auth.uid() or public.is_site_admin());

create policy site_admins_manage
on public.site_admins
for all
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists posts_public_read on public.posts;
drop policy if exists posts_admin_read on public.posts;
drop policy if exists posts_admin_insert on public.posts;
drop policy if exists posts_admin_update on public.posts;
drop policy if exists posts_admin_delete on public.posts;

create policy posts_public_read
on public.posts
for select
to anon, authenticated
using (is_published = true);

create policy posts_admin_read
on public.posts
for select
to authenticated
using (public.is_site_admin());

create policy posts_admin_insert
on public.posts
for insert
to authenticated
with check (public.is_site_admin() and author_id = auth.uid());

create policy posts_admin_update
on public.posts
for update
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

create policy posts_admin_delete
on public.posts
for delete
to authenticated
using (public.is_site_admin());

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

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists blog_images_public_read on storage.objects;
drop policy if exists blog_images_admin_insert on storage.objects;
drop policy if exists blog_images_admin_update on storage.objects;
drop policy if exists blog_images_admin_delete on storage.objects;

create policy blog_images_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'blog-images');

create policy blog_images_admin_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'blog-images' and public.is_site_admin());

create policy blog_images_admin_update
on storage.objects
for update
to authenticated
using (bucket_id = 'blog-images' and public.is_site_admin())
with check (bucket_id = 'blog-images' and public.is_site_admin());

create policy blog_images_admin_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'blog-images' and public.is_site_admin());

-- After running:
-- 1) Create your admin user in Supabase Authentication.
-- 2) Add that user's id into public.site_admins.
-- Example:
-- insert into public.site_admins (user_id) values ('00000000-0000-0000-0000-000000000000');
