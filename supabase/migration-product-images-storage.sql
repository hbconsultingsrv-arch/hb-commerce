-- Images produits — bucket Storage public + policies admin
-- Exécuter dans Supabase SQL Editor après schema.sql

insert into storage.buckets (id, name, public, file_size_limit)
values ('product-images', 'product-images', true, 10485760)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760;

drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Admin upload product images" on storage.objects;
drop policy if exists "Admin update product images" on storage.objects;
drop policy if exists "Admin delete product images" on storage.objects;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admin upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admin update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());

create policy "Admin delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());
