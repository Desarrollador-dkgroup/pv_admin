-- Al entrar una solicitud nueva, la base llama a la función que envía el correo al equipo.
-- La función recibe solo el id de la fila y la lee de nuevo; si el envío falla, la solicitud
-- queda guardada igual.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_business_lead()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform net.http_post(
    url := 'https://qqhcsacdffdxcbkzgulk.supabase.co/functions/v1/notify-business-lead',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', jsonb_build_object('id', new.id))
  );
  return new;
end;
$$;

drop trigger if exists business_leads_notify on public.business_leads;
create trigger business_leads_notify
  after insert on public.business_leads
  for each row execute function public.notify_new_business_lead();
