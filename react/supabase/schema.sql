create extension if not exists pgcrypto;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  template text not null default 'romantic',
  payload jsonb not null,
  cover_image_url text,
  gallery_image_urls text[] default '{}',
  bg_music_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invitations_created_at_idx on public.invitations(created_at desc);

alter table public.invitations enable row level security;

drop policy if exists "public read invitations" on public.invitations;
create policy "public read invitations"
on public.invitations
for select
to anon, authenticated
using (true);

drop policy if exists "public insert invitations" on public.invitations;
create policy "public insert invitations"
on public.invitations
for insert
to anon, authenticated
with check (true);

insert into storage.buckets (id, name, public)
values
  ('wedding-images', 'wedding-images', true),
  ('wedding-audio', 'wedding-audio', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "public upload wedding images" on storage.objects;
create policy "public upload wedding images"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'wedding-images');

drop policy if exists "public read wedding images" on storage.objects;
create policy "public read wedding images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'wedding-images');

drop policy if exists "public upload wedding audio" on storage.objects;
create policy "public upload wedding audio"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'wedding-audio');

drop policy if exists "public read wedding audio" on storage.objects;
create policy "public read wedding audio"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'wedding-audio');
