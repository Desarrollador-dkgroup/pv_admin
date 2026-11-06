-- Solicitudes de propietarios que quieren publicar su negocio en la app (formulario público).
-- Cualquier visitante puede enviar una solicitud; solo el equipo las lee.
create table if not exists public.business_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text not null check (char_length(business_name) between 2 and 120),
  legal_name text not null check (char_length(legal_name) between 2 and 160),
  ruc text not null check (char_length(ruc) between 5 and 40),
  contact_person text not null check (char_length(contact_person) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 30),
  email text not null check (char_length(email) between 5 and 160 and email like '%_@_%.__%'),
  status text not null default 'nuevo' check (status in ('nuevo', 'contactado', 'descartado'))
);

alter table public.business_leads enable row level security;

grant insert on public.business_leads to anon, authenticated;
grant select, update on public.business_leads to authenticated;

drop policy if exists business_leads_insert on public.business_leads;
create policy business_leads_insert on public.business_leads
  for insert to anon, authenticated
  with check (status = 'nuevo');

drop policy if exists business_leads_staff_select on public.business_leads;
create policy business_leads_staff_select on public.business_leads
  for select to authenticated
  using (public.padmin_can_manage_providers());

drop policy if exists business_leads_staff_update on public.business_leads;
create policy business_leads_staff_update on public.business_leads
  for update to authenticated
  using (public.padmin_can_manage_providers())
  with check (public.padmin_can_manage_providers());
