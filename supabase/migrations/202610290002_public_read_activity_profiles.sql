-- Permite leer actividades publicadas desde el sitio público (clave anónima).
-- Sin estas políticas, activity_profiles y activity_hours devuelven vacío y las atracciones no se ven.

create policy "padmin_published_read"
  on public.activity_profiles
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = activity_profiles.service_id and s.status = 'published'
    )
  );

create policy "padmin_published_read"
  on public.activity_hours
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = activity_hours.service_id and s.status = 'published'
    )
  );

grant select on public.activity_profiles, public.activity_hours to anon, authenticated;
