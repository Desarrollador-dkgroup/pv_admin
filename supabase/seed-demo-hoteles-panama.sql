-- 25 hospedajes ficticios publicados en la provincia de Panamá, para probar el catálogo.
-- Ejecutar completo en el SQL Editor de Supabase. Se puede repetir: si un slug ya existe, se
-- salta. Todos los slugs empiezan por "demo-pa-"; para borrarlos usar
-- borrar-demo-hoteles-panama.sql.
--
-- Reglas de la base que respeta:
-- - Hospedaje sin base_price_cents: el precio va en sus habitaciones (room_types) y el
--   trigger calcula cached_price_from_cents ("desde").
-- - Hospedaje con hospedaje_type_id y meal_plan_id obligatorios.
-- - El sitio turístico pertenece a la provincia del destino (Panamá).
-- - padmin_protect_service_review solo deja crear borradores: se marca la transacción como
--   revisión del equipo (padmin.reviewing) para crearlos ya aprobados y publicados.

BEGIN;

SELECT set_config('padmin.reviewing', 'on', true);

DO $$
DECLARE
  -- Negocio de prueba; si no existe o está inactivo, el primer negocio activo.
  v_business uuid := COALESCE(
    (SELECT id FROM public.businesses
     WHERE id = 'b2996846-c6ec-43dc-ae69-192fcbf85d75' AND is_active),
    (SELECT id FROM public.businesses WHERE is_active ORDER BY created_at LIMIT 1)
  );
  v_province text := (SELECT id FROM public.provinces WHERE id = 'Panamá');
  v_sites uuid[] := ARRAY(
    SELECT id FROM public.tourist_sites WHERE province_id = 'Panamá' ORDER BY sort_order, name
  );
  v_amenities text[] := ARRAY(SELECT id::text FROM public.amenities ORDER BY sort_order);
  v_service uuid;
  v_site uuid;
  v_slug text;
  v_row record;
  v_index integer := 0;
BEGIN
  IF v_business IS NULL THEN
    RAISE EXCEPTION 'No hay un negocio activo para asignar los hospedajes.';
  END IF;
  IF v_province IS NULL THEN
    RAISE EXCEPTION 'No existe la provincia Panamá en public.provinces.';
  END IF;
  IF cardinality(v_sites) = 0 THEN
    RAISE EXCEPTION 'No hay sitios turísticos en la provincia Panamá.';
  END IF;

  FOR v_row IN
    SELECT * FROM (VALUES
      ('Hotel Casco Real', 'hoteles', 'desayuno-incluido', 18500, '+507 228-4410',
       'reservas@cascoreal.com.pa', 'https://cascoreal.com.pa',
       'Hotel boutique en una casona restaurada del Casco Antiguo, a pasos de ' ||
       'la Plaza Bolívar.', 4.7),
      ('Bahía Azul Suites', 'apartamentos', 'zona-cocina', 12900, '+507 264-1187',
       'hola@bahiaazulsuites.com', 'https://bahiaazulsuites.com',
       'Suites con cocina equipada y vista a la Cinta Costera, ideales para ' ||
       'estancias largas.', 4.4),
      ('Gran Hotel Balboa', 'hoteles', 'restaurante', 22500, '+507 314-2290',
       'contacto@granhotelbalboa.com', 'https://granhotelbalboa.com',
       'Hotel clásico frente a la avenida Balboa con piscina en la terraza y ' ||
       'salones de eventos.', 4.5),
      ('Torre Pacífica Hotel & Spa', 'hoteles', 'desayuno-incluido', 31000, '+507 301-7755',
       'reservas@torrepacifica.com.pa', 'https://torrepacifica.com.pa',
       'Torre moderna en Punta Pacífica con spa, gimnasio y vistas panorámicas al océano.', 4.8),
      ('Cabañas Cerro Azul', 'cabanas', 'zona-cocina', 9800, '+507 6612-4478',
       'info@cabanascerroazul.com', 'https://cabanascerroazul.com',
       'Cabañas de madera entre la neblina de Cerro Azul, con chimenea y senderos privados.', 4.6),
      ('Isla Taboga Beach Resort', 'resorts', 'todo-incluido', 38500, '+507 250-2100',
       'reservas@tabogaresort.com', 'https://tabogaresort.com',
       'Resort frente al mar en Taboga, con todo incluido, kayaks y ferry desde la Calzada.', 4.5),
      ('Amador Marina Hotel', 'hoteles', 'restaurante', 16500, '+507 314-0901',
       'hola@amadormarina.com.pa', 'https://amadormarina.com.pa',
       'Hotel junto a la marina de la Calzada de Amador, con vista a los ' ||
       'barcos que esperan el Canal.', 4.3),
      ('Residencias El Cangrejo', 'apartamentos', 'zona-cocina', 8500, '+507 263-5524',
       'reservas@residenciascangrejo.com', 'https://residenciascangrejo.com',
       'Apartamentos sencillos en El Cangrejo, cerca de restaurantes, bancos y transporte.', 4.1),
      ('Hotel Bella Vista Plaza', 'hoteles', 'desayuno-incluido', 13900, '+507 223-8812',
       'info@bellavistaplaza.com.pa', 'https://bellavistaplaza.com.pa',
       'Hotel céntrico en Bella Vista con desayuno incluido y parqueo gratuito.', 4.2),
      ('Costa del Este Grand', 'hoteles', 'restaurante', 27500, '+507 396-4400',
       'reservas@costadelestegrand.com', 'https://costadelestegrand.com',
       'Hotel de negocios en Costa del Este con centro de convenciones y piscina infinita.', 4.6),
      ('Pearl Islands Lodge', 'resorts', 'todo-incluido', 45000, '+507 6780-3321',
       'stay@pearlislandslodge.com', 'https://pearlislandslodge.com',
       'Refugio en el archipiélago de Las Perlas con playa privada, snorkel y ' ||
       'pesca deportiva.', 4.9),
      ('Gamboa Rainforest Cabins', 'cabanas', 'desayuno-incluido', 15500, '+507 6634-2209',
       'reservas@gamboacabins.com', 'https://gamboacabins.com',
       'Cabañas en la selva de Gamboa, junto al río Chagres, con observación ' ||
       'de aves al amanecer.', 4.7),
      ('Hotel Ancón Colonial', 'hoteles', 'cafeteria', 11500, '+507 212-6630',
       'contacto@anconcolonial.com', 'https://anconcolonial.com',
       'Antigua casa de la Zona del Canal convertida en hotel, rodeada del Cerro Ancón.', 4.4),
      ('Loft San Francisco', 'apartamentos', 'zona-cocina', 10500, '+507 6201-7743',
       'hola@loftsanfrancisco.com', 'https://loftsanfrancisco.com',
       'Lofts de diseño en San Francisco, a minutos de Vía Israel y del Parque Omar.', 4.3),
      ('Playa Bonita Resort & Club', 'resorts', 'todo-incluido', 34000, '+507 304-5200',
       'reservas@playabonitaclub.com', 'https://playabonitaclub.com',
       'Resort de playa a la entrada del Canal, con cinco piscinas y club para niños.', 4.6),
      ('Hotel Vía España Express', 'hoteles', 'cafeteria', 8900, '+507 225-3378',
       'reservas@viaespanaexpress.com', 'https://viaespanaexpress.com',
       'Hotel práctico y económico sobre Vía España, cerca del metro y centros comerciales.', 3.9),
      ('Albrook Park Inn', 'hoteles', 'desayuno-incluido', 11900, '+507 315-1840',
       'info@albrookparkinn.com', 'https://albrookparkinn.com',
       'Hotel junto a Albrook Mall y la terminal de buses, ideal para viajeros en tránsito.', 4.0),
      ('Chagres River Ecolodge', 'cabanas', 'todo-incluido', 24500, '+507 6588-9012',
       'contacto@chagresecolodge.com', 'https://chagresecolodge.com',
       'Ecolodge a orillas del río Chagres con visitas a comunidades Emberá y ' ||
       'paseos en piragua.', 4.8),
      ('Marbella Executive Suites', 'apartamentos', 'zona-cocina', 14500, '+507 269-4471',
       'reservas@marbellasuites.com', 'https://marbellasuites.com',
       'Suites ejecutivas en Marbella con oficina, lavandería y acceso a la Cinta Costera.', 4.4),
      ('Hotel Panamá Viejo', 'hoteles', 'restaurante', 13500, '+507 226-9930',
       'hola@hotelpanamaviejo.com', 'https://hotelpanamaviejo.com',
       'Hotel tranquilo frente a las ruinas de Panamá Viejo, con jardín y ' ||
       'restaurante criollo.', 4.2),
      ('Casa Clayton Boutique', 'hoteles', 'desayuno-incluido', 19500, '+507 317-2268',
       'reservas@casaclayton.com', 'https://casaclayton.com',
       'Casa boutique de solo ocho habitaciones en Ciudad del Saber, rodeada de árboles.', 4.7),
      ('Pacific Hills Resort', 'resorts', 'todo-incluido', 29500, '+507 248-6610',
       'reservas@pacifichillsresort.com', 'https://pacifichillsresort.com',
       'Resort en las colinas de Chame con golf, spa y vista al Pacífico.', 4.5),
      ('Obarrio City Apartments', 'apartamentos', 'zona-cocina', 11000, '+507 6305-1185',
       'info@obarrioapartments.com', 'https://obarrioapartments.com',
       'Apartamentos amueblados en Obarrio, en pleno distrito financiero.', 4.1),
      ('Cabañas Lago Gatún', 'cabanas', 'restaurante', 13000, '+507 6491-7720',
       'reservas@cabanaslagogatun.com', 'https://cabanaslagogatun.com',
       'Cabañas flotantes en el lago Gatún para ver los barcos del Canal y monos aulladores.', 4.6),
      ('Hotel Avenida Central', 'hoteles', 'cafeteria', 9500, '+507 212-4459',
       'contacto@hotelavenidacentral.com', 'https://hotelavenidacentral.com',
       'Hotel sencillo en la peatonal Avenida Central, entre tiendas y el Casco Antiguo.', 3.8)
    ) AS h(name, type_id, meal_plan, price, phone, email, web, description, rating)
  LOOP
    v_index := v_index + 1;
    v_slug := 'demo-pa-' || lower(regexp_replace(
      translate(v_row.name, 'áéíóúñÁÉÍÓÚÑ&', 'aeiounAEIOUNy'), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(BOTH '-' FROM v_slug);
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.services WHERE slug = v_slug);

    -- Reparte los hospedajes entre los sitios turísticos reales de la provincia.
    v_site := v_sites[1 + ((v_index - 1) % cardinality(v_sites))];

    INSERT INTO public.services (
      slug, business_id, category_id, hospedaje_type_id, meal_plan_id, name,
      search_description, description, destination_province_id, tourist_site_id,
      address, status, review_status, is_recommended, rating_avg, rating_count
    ) VALUES (
      v_slug, v_business, 'hospedaje', v_row.type_id, v_row.meal_plan, v_row.name,
      v_row.description, v_row.description || ' Datos ficticios para pruebas del catálogo.',
      v_province, v_site,
      'Ciudad de Panamá, Panamá', 'published', 'approved', v_index <= 6,
      v_row.rating, 12 + (v_index * 7) % 180
    )
    RETURNING id INTO v_service;

    -- Un trigger puede haber creado ya el vínculo con el sitio principal.
    INSERT INTO public.service_tourist_sites (service_id, tourist_site_id)
    SELECT v_service, v_site
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_tourist_sites
      WHERE service_id = v_service AND tourist_site_id = v_site
    );

    INSERT INTO public.lodging_profiles (
      service_id, contact_phone, contact_email, website_url, check_in_from,
      check_out_time, reception_hours, languages, parking_details, pet_policy,
      smoking_policy, events_policy, cancellation_policy, details
    ) VALUES (
      v_service, v_row.phone, v_row.email, v_row.web, '15:00', '12:00', '24 horas',
      ARRAY['Español', 'Inglés'],
      CASE WHEN v_index % 3 = 0 THEN 'Público' ELSE 'Privado' END,
      CASE WHEN v_index % 4 = 0 THEN 'Sí' ELSE 'No' END,
      'No',
      CASE WHEN v_row.type_id IN ('hoteles', 'resorts') THEN 'Sí' ELSE 'No' END,
      'Cancelación gratuita hasta 48 horas antes de la llegada.',
      '{}'::jsonb
    )
    ON CONFLICT (service_id) DO NOTHING;

    -- Dos habitaciones por hospedaje: la de menor precio es el "desde" del catálogo.
    INSERT INTO public.room_types (
      slug, service_id, name, description, capacity, beds_label, price_cents,
      total_units, booking_unit, bedroom_count, bathroom_count, area_m2, position, details
    ) VALUES
      (v_slug || '-estandar', v_service,
       CASE WHEN v_row.type_id = 'apartamentos' THEN 'Estudio'
            WHEN v_row.type_id = 'cabanas' THEN 'Cabaña sencilla'
            ELSE 'Habitación estándar' END,
       'Habitación cómoda con baño privado y aire acondicionado.', 2,
       '1 cama queen', v_row.price, 6 + v_index % 10,
       CASE WHEN v_row.type_id IN ('apartamentos', 'cabanas') THEN 'unit' ELSE 'room' END,
       1, 1, 24 + v_index, 0,
       jsonb_build_object('amenities',
         'Aire acondicionado, Wi-Fi, Televisión, Baño privado, Agua caliente')),
      (v_slug || '-superior', v_service,
       CASE WHEN v_row.type_id = 'apartamentos' THEN 'Apartamento de 2 dormitorios'
            WHEN v_row.type_id = 'cabanas' THEN 'Cabaña familiar'
            ELSE 'Suite familiar' END,
       'Espacio amplio para familias, con sala y vista.', 4,
       '1 cama king y 2 camas individuales', LEAST(v_row.price + 6500, 45000), 2 + v_index % 4,
       CASE WHEN v_row.type_id IN ('apartamentos', 'cabanas') THEN 'unit' ELSE 'room' END,
       2, 2, 48 + v_index, 1,
       jsonb_build_object('amenities',
         'Aire acondicionado, Wi-Fi, Televisión, Minibar, Balcón o terraza, Caja fuerte'));

    -- Precio "desde" del catálogo = habitación más barata (por si ningún trigger lo calcula).
    UPDATE public.services SET cached_price_from_cents = v_row.price WHERE id = v_service;

    -- Tres comodidades del catálogo general, distintas según el hospedaje.
    IF cardinality(v_amenities) > 0 THEN
      INSERT INTO public.service_amenities (service_id, amenity_id)
      SELECT v_service, a.id
      FROM public.amenities AS a
      WHERE a.id::text IN (
        v_amenities[1 + (v_index % cardinality(v_amenities))],
        v_amenities[1 + ((v_index + 3) % cardinality(v_amenities))],
        v_amenities[1 + ((v_index + 7) % cardinality(v_amenities))]
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Comprobación: debería devolver 25 filas con precio "desde" y sitio turístico.
SELECT s.name, s.hospedaje_type_id, s.cached_price_from_cents, t.name AS sitio, s.status
FROM public.services AS s
LEFT JOIN public.tourist_sites AS t ON t.id = s.tourist_site_id
WHERE s.slug LIKE 'demo-pa-%'
ORDER BY s.name;
