-- Precio de hospedaje con promociones: cada noche usa la promoción vigente ese día.
-- La cotización (quote_stay) y la reserva (create_stay_reservation) aplican el descuento
-- automáticamente cuando la noche cae en el rango o en el día de la semana de la promoción.
-- Una promoción sin habitación aplica a todas las habitaciones del servicio.

-- Descuento (%) que aplica a una habitación en una noche concreta (0 si no hay promoción).
create or replace function public.stay_night_discount_pct(
  p_service_id uuid,
  p_room_type_id uuid,
  p_night date
)
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
    and (sp.room_type_id is null or sp.room_type_id = p_room_type_id)
    and (
      (sp.schedule_mode = 'range'
        and sp.starts_on is not null and sp.ends_on is not null
        and p_night between sp.starts_on and sp.ends_on)
      or (sp.schedule_mode <> 'range'
        and extract(dow from p_night)::int = any(sp.weekdays))
    );
$$;

-- Total en centavos de UNA habitación por todas sus noches, con las promociones de cada noche.
create or replace function public.stay_room_total_cents(
  p_service_id uuid,
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_price_cents bigint
)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(round(
    p_price_cents * (100 - public.stay_night_discount_pct(p_service_id, p_room_type_id, n.night::date))
    / 100.0
  ))::bigint, 0)
  from generate_series(p_check_in::timestamp, (p_check_out - 1)::timestamp, interval '1 day')
    as n(night);
$$;

-- Cotización: el total de cada combinación ya trae las promociones de sus noches.
create or replace function public.quote_stay(
  p_service_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_nights integer;
  v_types uuid[];
  v_names text[];
  v_capacities integer[];
  v_prices bigint[];
  v_caps integer[];
  v_disc bigint[];
  v_n integer;
  v_result jsonb;
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_dates';
  end if;
  if p_guests is null or p_guests < 1 then
    raise exception 'invalid_guests';
  end if;
  if not exists (
    select 1 from public.services where id = p_service_id and category_id = 'hospedaje'
  ) then
    raise exception 'not_a_hospedaje_service';
  end if;

  v_nights := p_check_out - p_check_in;

  select array_agg(id order by position), array_agg(name order by position),
         array_agg(capacity order by position), array_agg(price_cents order by position)
    into v_types, v_names, v_capacities, v_prices
  from public.room_types
  where service_id = p_service_id;

  if v_types is null then
    return jsonb_build_object('nights', v_nights, 'combinations', '[]'::jsonb);
  end if;

  v_n := array_length(v_types, 1);

  v_caps := array(
    select least(
      (select min(public.available_units(v_types[i], p_check_in + n))
         from generate_series(0, v_nights - 1) n),
      p_guests
    )
    from generate_series(1, v_n) i
    order by i
  );

  -- Total de cada habitación por toda la estancia, con las promociones de cada noche.
  v_disc := array(
    select public.stay_room_total_cents(p_service_id, v_types[i], p_check_in, p_check_out, v_prices[i])
    from generate_series(1, v_n) i
    order by i
  );

  with recursive combo as (
    select 1 as i, array[]::integer[] as qty, 0 as rooms_used
    union all
    select c.i + 1, c.qty || g.q, c.rooms_used + g.q
    from combo c
    cross join lateral generate_series(0, greatest(least(v_caps[c.i], p_guests - c.rooms_used), 0)) as g(q)
    where c.i <= v_n
  ),
  complete as (
    select qty from combo where i = v_n + 1
  ),
  scored as (
    select
      qty,
      (select sum(qty[k] * v_capacities[k]) from generate_series(1, v_n) k) as total_capacity,
      (select sum(qty[k] * v_prices[k]) from generate_series(1, v_n) k) as price_per_night,
      (select sum(qty[k] * v_disc[k]) from generate_series(1, v_n) k) as stay_total
    from complete
  ),
  fitting as (
    select * from scored where total_capacity >= p_guests
  ),
  minimal as (
    -- No line can be removed without capacity dropping below guests — same rule as mobile's
    -- generateRoomCombinations, so the list never offers e.g. 3 triple rooms for 2 guests.
    select f.*
    from fitting f
    where not exists (
      select 1 from generate_series(1, v_n) k
      where f.qty[k] > 0
        and f.total_capacity - v_capacities[k] >= p_guests
    )
  )
  select jsonb_build_object(
    'nights', v_nights,
    'combinations', coalesce(jsonb_agg(
      jsonb_build_object(
        'roomTypeIds', (select array_agg(v_types[k]) from generate_series(1, v_n) k where m.qty[k] > 0),
        'lines', (
          select jsonb_agg(jsonb_build_object(
            'roomTypeId', v_types[k], 'name', v_names[k], 'quantity', m.qty[k], 'pricePerNight', v_prices[k]
          ) order by k)
          from generate_series(1, v_n) k where m.qty[k] > 0
        ),
        'totalCapacity', m.total_capacity,
        'pricePerNight', m.price_per_night,
        'nights', v_nights,
        'totalPrice', m.stay_total,
        'discountCents', m.price_per_night * v_nights - m.stay_total
      ) order by m.stay_total asc
    ), '[]'::jsonb)
  )
  into v_result
  from minimal m;

  return v_result;
end;
$function$;

-- Reserva de hospedaje (versión con datos de contacto): guarda el total ya con promociones.
create or replace function public.create_stay_reservation(
  p_service_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_room_lines jsonb,
  p_idempotency_key text,
  p_guest_name text default null::text,
  p_guest_phone text default null::text,
  p_guest_email text default null::text,
  p_adults integer default null::integer,
  p_children integer default null::integer
)
returns reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_customer uuid := auth.uid();
  v_reservation public.reservations;
  v_line jsonb;
  v_room_type_id uuid;
  v_qty integer;
  v_price bigint;
  v_capacity integer;
  v_total bigint := 0;
  v_regular bigint := 0;
  v_total_capacity integer := 0;
  v_nights integer;
  v_available integer;
  v_hold_minutes integer;
  v_room_type_ids uuid[];
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
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'invalid_dates';
  end if;
  if p_guests is null or p_guests < 1 then
    raise exception 'invalid_guests';
  end if;
  if p_room_lines is null or jsonb_array_length(p_room_lines) = 0 then
    raise exception 'empty_room_lines';
  end if;
  if (p_adults is not null or p_children is not null) then
    if p_adults is null or p_children is null then
      raise exception 'adults_children_required';
    end if;
    if p_adults < 0 or p_children < 0 then
      raise exception 'invalid_adults_children';
    end if;
    if p_adults + p_children <> p_guests then
      raise exception 'adults_children_mismatch';
    end if;
  end if;
  if not exists (
    select 1 from public.services where id = p_service_id and category_id = 'hospedaje' and status = 'published'
  ) then
    raise exception 'service_not_available';
  end if;

  -- Idempotency short-circuit BEFORE taking any lock: a retried identical submission must return the
  -- existing row cheaply, not re-contend for a lock it doesn't need.
  select * into v_reservation
    from public.reservations
    where customer_id = v_customer and idempotency_key = p_idempotency_key;
  if found then
    return v_reservation;
  end if;

  v_nights := p_check_out - p_check_in;

  -- Lock every room_type this request touches, in a stable order (sorted uuids), BEFORE computing
  -- availability. Sorting avoids a classic deadlock between two concurrent requests.
  select array_agg(distinct (line ->> 'roomTypeId')::uuid order by (line ->> 'roomTypeId')::uuid)
    into v_room_type_ids
    from jsonb_array_elements(p_room_lines) as line;
  perform 1 from public.room_types where id = any(v_room_type_ids) for update;

  for v_line in select * from jsonb_array_elements(p_room_lines) loop
    v_room_type_id := (v_line ->> 'roomTypeId')::uuid;
    v_qty := (v_line ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid_quantity';
    end if;

    select rt.price_cents, rt.capacity into v_price, v_capacity
      from public.room_types rt
      where rt.id = v_room_type_id and rt.service_id = p_service_id;
    if not found then
      raise exception 'unknown_room_type';
    end if;

    select min(public.available_units(v_room_type_id, p_check_in + n))
      into v_available
      from generate_series(0, v_nights - 1) n;
    if v_available < v_qty then
      raise exception 'sold_out'
        using detail = format('room_type %s does not have %s units for every night of this stay', v_room_type_id, v_qty);
    end if;

    -- Precio de cada noche con la promoción vigente ese día (si la hay).
    v_total := v_total + public.stay_room_total_cents(
      p_service_id, v_room_type_id, p_check_in, p_check_out, v_price) * v_qty;
    v_regular := v_regular + v_price * v_qty * v_nights;
    v_total_capacity := v_total_capacity + v_capacity * v_qty;
  end loop;

  if v_total_capacity < p_guests then
    raise exception 'insufficient_capacity';
  end if;

  select stay_hold_minutes into v_hold_minutes from public.booking_config;

  insert into public.reservations (
    customer_id, service_id, kind, status, check_in, check_out, guests,
    idempotency_key, quoted_total_cents, price_detail, guest_name, guest_phone, guest_email,
    adults, children, hold_expires_at
  ) values (
    v_customer, p_service_id, 'stay', 'pending', p_check_in, p_check_out, p_guests,
    p_idempotency_key, v_total,
    v_nights || ' noche(s)' || case when v_total < v_regular then ' · promoción aplicada' else '' end,
    nullif(btrim(p_guest_name), ''), nullif(btrim(p_guest_phone), ''), nullif(btrim(p_guest_email), ''),
    p_adults, p_children, now() + (v_hold_minutes || ' minutes')::interval
  )
  on conflict (customer_id, idempotency_key) do nothing
  returning * into v_reservation;

  if v_reservation.id is null then
    -- Lost a race against another request with the SAME idempotency key — return the winner's row.
    select * into v_reservation
      from public.reservations
      where customer_id = v_customer and idempotency_key = p_idempotency_key;
    return v_reservation;
  end if;

  for v_line in select * from jsonb_array_elements(p_room_lines) loop
    v_room_type_id := (v_line ->> 'roomTypeId')::uuid;
    v_qty := (v_line ->> 'quantity')::integer;
    select rt.price_cents into v_price from public.room_types rt where rt.id = v_room_type_id;
    insert into public.reservation_room_lines (reservation_id, room_type_id, quantity, price_cents_per_night)
      values (v_reservation.id, v_room_type_id, v_qty, v_price);
  end loop;

  return v_reservation;
end;
$function$;

-- Firma anterior (sin datos de contacto): delega en la versión actual para que también aplique
-- las promociones.
create or replace function public.create_stay_reservation(
  p_service_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_room_lines jsonb,
  p_idempotency_key text
)
returns reservations
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from public.create_stay_reservation(
    p_service_id, p_check_in, p_check_out, p_guests, p_room_lines, p_idempotency_key,
    null, null, null, null, null
  );
$$;
