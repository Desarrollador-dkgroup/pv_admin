-- Promociones generales de servicio (sin habitación) en restaurantes, actividades y tours.
-- La promo aplica si la fecha de la reserva cae en su rango o en su día de la semana.
-- Actividades y tours (precio por persona) guardan el total ya con descuento.

create or replace function public.service_promo_pct_on(p_service_id uuid, p_date date)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(max(sp.discount_pct), 0)
  from public.service_promotions sp
  where sp.service_id = p_service_id
    and sp.is_active
    and sp.room_type_id is null
    and (
      (sp.schedule_mode = 'range'
        and sp.starts_on is not null and sp.ends_on is not null
        and p_date between sp.starts_on and sp.ends_on)
      or (sp.schedule_mode <> 'range'
        and extract(dow from p_date)::int = any(sp.weekdays))
    );
$$;

-- Precio de referencia y precio con promoción para una fecha y número de personas.
create or replace function public.quote_request_reservation(
  p_service_id uuid,
  p_reservation_date date,
  p_guests integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_base bigint;
  v_multipliable boolean;
  v_pct numeric;
  v_unit_final bigint;
begin
  if p_reservation_date is null or p_guests is null or p_guests < 1 then
    raise exception 'invalid_guests';
  end if;

  select s.base_price_cents, c.price_is_multipliable
    into v_base, v_multipliable
  from public.services s
  join public.categories c on c.id = s.category_id
  where s.id = p_service_id and s.status = 'published' and s.category_id <> 'hospedaje';
  if not found then
    raise exception 'service_not_available';
  end if;
  if v_base is null then
    return null;
  end if;

  v_pct := public.service_promo_pct_on(p_service_id, p_reservation_date);
  v_unit_final := round(v_base * (100 - v_pct) / 100.0)::bigint;

  return jsonb_build_object(
    'unitRegularCents', v_base,
    'unitFinalCents', v_unit_final,
    'discountPct', v_pct,
    'multipliable', v_multipliable,
    'totalRegularCents', case when v_multipliable then v_base * p_guests end,
    'totalFinalCents', case when v_multipliable then v_unit_final * p_guests end
  );
end;
$$;

-- Reserva de servicio por fecha: en actividades y tours el total guardado ya lleva la promo.
create or replace function public.create_request_reservation(
  p_service_id uuid,
  p_reservation_date date,
  p_reservation_time time without time zone,
  p_guests integer,
  p_idempotency_key text
)
returns reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_customer uuid := auth.uid();
  v_reservation public.reservations;
  v_category text;
  v_kind text;
  v_price_is_multipliable boolean;
  v_base_price bigint;
  v_total bigint;
  v_price_detail text;
  v_hours_from time;
  v_hours_to time;
  v_pct numeric;
begin
  if v_customer is null then
    raise exception 'authentication_required';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'idempotency_key_required';
  end if;
  if public.is_blocked_user(v_customer) then
    raise exception 'user_blocked';
  end if;
  if p_guests is null or p_guests < 1 then
    raise exception 'invalid_guests';
  end if;
  if p_reservation_date is null then
    raise exception 'invalid_date';
  end if;

  select s.category_id, s.base_price_cents, c.price_is_multipliable
    into v_category, v_base_price, v_price_is_multipliable
  from public.services s
  join public.categories c on c.id = s.category_id
  where s.id = p_service_id and s.status = 'published';
  if not found then
    raise exception 'service_not_available';
  end if;
  if v_category = 'hospedaje' then
    raise exception 'use_create_stay_reservation';
  end if;

  v_kind := case
    when v_category = 'restaurantes' then 'table'
    when v_category in ('actividades', 'tour-operador') then 'activity'
    else 'request'
  end;

  if v_kind = 'table' then
    if p_reservation_time is null then
      raise exception 'time_required';
    end if;
    select hours_from, hours_to into v_hours_from, v_hours_to
      from public.restaurant_profiles where service_id = p_service_id;
    if v_hours_from is not null
       and (p_reservation_time < v_hours_from or p_reservation_time > (v_hours_to - interval '1 hour')) then
      raise exception 'time_outside_hours';
    end if;
  elsif v_kind = 'activity' then
    if p_reservation_time is not null and not exists (
      select 1 from public.service_schedules
      where service_id = p_service_id and departure_time = p_reservation_time
    ) then
      raise exception 'invalid_departure_time';
    end if;
  else
    if p_reservation_time is not null then
      raise exception 'request_has_no_time';
    end if;
  end if;

  v_pct := public.service_promo_pct_on(p_service_id, p_reservation_date);

  if v_price_is_multipliable and v_base_price is not null then
    v_total := round(v_base_price * p_guests * (100 - v_pct) / 100.0)::bigint;
    v_price_detail := p_guests || ' x ' || to_char(v_base_price / 100.0, 'FM999999990.00')
      || case when v_pct > 0 then ' · promoción aplicada' else '' end;
  else
    v_total := null;
    v_price_detail := null;
  end if;

  insert into public.reservations (
    customer_id, service_id, kind, status, reservation_date, reservation_time, guests,
    idempotency_key, quoted_total_cents, price_detail
  ) values (
    v_customer, p_service_id, v_kind, 'pending', p_reservation_date, p_reservation_time, p_guests,
    p_idempotency_key, v_total, v_price_detail
  )
  on conflict (customer_id, idempotency_key) do nothing
  returning * into v_reservation;

  if v_reservation.id is null then
    select * into v_reservation
      from public.reservations
      where customer_id = v_customer and idempotency_key = p_idempotency_key;
  end if;

  return v_reservation;
end;
$function$;
