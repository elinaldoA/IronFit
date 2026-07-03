-- Fotos de progresso novas passam a ir pro Supabase Storage em vez de base64
-- direto na linha do Postgres (image_data já chegava a ~6.7MB por foto e
-- fetchPhotos baixava tudo de uma vez, sem paginação). Fotos antigas continuam
-- lidas via image_data — nada é migrado/apagado aqui.

alter table public.progress_photos add column if not exists storage_path text;
alter table public.progress_photos alter column image_data drop not null;

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "progress_photos_own_select" on storage.objects;
create policy "progress_photos_own_select"
  on storage.objects for select
  using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "progress_photos_own_insert" on storage.objects;
create policy "progress_photos_own_insert"
  on storage.objects for insert
  with check (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "progress_photos_own_delete" on storage.objects;
create policy "progress_photos_own_delete"
  on storage.objects for delete
  using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);
