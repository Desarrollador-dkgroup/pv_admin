-- 35 restaurantes ficticios publicados en la provincia de Panamá: 25 independientes y 10
-- dentro de hoteles de seed-demo-hoteles-panama.sql (ejecutar ese primero). Los de hotel
-- quedan vinculados en lodging_profiles.details.linked_restaurant_ids, que es lo que usa
-- "Restaurantes del hospedaje" en el panel y en la ficha pública.
-- Se puede repetir: si un slug ya existe, se salta. Todos los slugs empiezan por
-- "demo-pa-rest-"; para borrarlos usar borrar-demo-restaurantes-panama.sql.
--
-- Reglas de la base que respeta:
-- - Un restaurante exige base_price_cents (precio "desde" por persona) y no lleva tipo de
--   hospedaje ni plan de comidas.
-- - restaurant_hours necesita antes su fila en restaurant_profiles.
-- - padmin_protect_service_review solo deja crear borradores: se marca la transacción como
--   revisión del equipo (padmin.reviewing) para crearlos ya aprobados y publicados.

BEGIN;

SELECT set_config('padmin.reviewing', 'on', true);

DO $$
DECLARE
  v_business uuid := COALESCE(
    (SELECT id FROM public.businesses
     WHERE id = 'b2996846-c6ec-43dc-ae69-192fcbf85d75' AND is_active),
    (SELECT id FROM public.businesses WHERE is_active ORDER BY created_at LIMIT 1)
  );
  v_sites uuid[] := ARRAY(
    SELECT id FROM public.tourist_sites WHERE province_id = 'Panamá' ORDER BY sort_order, name
  );
  v_service uuid;
  v_hotel uuid;
  v_site uuid;
  v_section uuid;
  v_slug text;
  v_row record;
  v_index integer := 0;
  v_day integer;
BEGIN
  IF v_business IS NULL THEN
    RAISE EXCEPTION 'No hay un negocio activo para asignar los restaurantes.';
  END IF;
  IF cardinality(v_sites) = 0 THEN
    RAISE EXCEPTION 'No hay sitios turísticos en la provincia Panamá.';
  END IF;

  FOR v_row IN
    SELECT * FROM (VALUES
      -- nombre, cocina, estilo, precio desde (centavos), abre, cierra, hotel (o NULL),
      -- teléfono, descripción, calificación
      ('Fonda La Chorrerana', 'Panameña', 'casual', 800, '07:00', '16:00', NULL,
       '+507 225-1144', 'Comida típica: sancocho, arroz con pollo y carimañolas.', 4.5),
      ('Mariscos El Puerto', 'Mariscos', 'casual', 1500, '11:00', '22:00', NULL,
       '+507 262-3310', 'Ceviche, corvina y langostinos frente al Mercado de Mariscos.', 4.6),
      ('Raíces del Istmo', 'Panameña contemporánea', 'formal', 3500, '18:00', '23:00', NULL,
       '+507 228-7701', 'Menú de degustación con ingredientes de productores locales.', 4.8),
      ('Trattoria Bella Vista', 'Italiana', 'casual', 1800, '12:00', '22:30', NULL,
       '+507 264-5512', 'Pastas frescas y pizzas al horno de leña en Bella Vista.', 4.4),
      ('Sushi Canal', 'Japonesa', 'casual', 2200, '12:00', '23:00', NULL,
       '+507 263-8890', 'Sushi y ramen con pescado del Pacífico panameño.', 4.3),
      ('Asador Don Tito', 'Parrilla', 'casual', 2500, '12:00', '23:00', NULL,
       '+507 269-4402', 'Cortes a la parrilla, chorizo tableño y yuca frita.', 4.5),
      ('Café Casco Antiguo', 'Cafetería', 'casual', 900, '07:00', '19:00', NULL,
       '+507 211-0034', 'Café de Boquete, pastelería y desayunos en una casona colonial.', 4.6),
      ('La Cevichería de Amador', 'Mariscos', 'casual', 1400, '11:00', '21:00', NULL,
       '+507 314-1123', 'Ceviches y pescado frito con vista a la Calzada de Amador.', 4.2),
      ('Taquería El Cangrejo', 'Mexicana', 'casual', 1000, '12:00', '00:00', NULL,
       '+507 263-2209', 'Tacos al pastor, quesadillas y aguas frescas.', 4.1),
      ('Bistró San Francisco', 'Francesa', 'formal', 3200, '12:00', '22:00', NULL,
       '+507 270-6610', 'Bistró de cocina francesa con carta de vinos.', 4.7),
      ('Comida Criolla Doña Eva', 'Panameña', 'casual', 700, '06:30', '15:00', NULL,
       '+507 6612-7790', 'Desayunos típicos con hojaldras, bistec y tortilla de maíz.', 4.4),
      ('Wok Oriental Obarrio', 'China', 'casual', 1200, '11:30', '22:00', NULL,
       '+507 223-4478', 'Cocina cantonesa y dim sum para compartir.', 4.0),
      ('Verde Cocina Vegana', 'Vegetariana', 'casual', 1300, '11:00', '20:00', NULL,
       '+507 6730-1145', 'Bowls, hamburguesas de lentejas y jugos naturales.', 4.5),
      ('Pizzería Vía Argentina', 'Italiana', 'casual', 1100, '12:00', '23:30', NULL,
       '+507 264-9930', 'Pizzas a la piedra y empanadas en la Vía Argentina.', 4.3),
      ('Parrillada Costa del Este', 'Parrilla', 'formal', 3000, '12:00', '23:00', NULL,
       '+507 396-2215', 'Carnes maduradas y mariscos a la brasa.', 4.6),
      ('El Fogón de Panamá Viejo', 'Panameña', 'casual', 1000, '11:00', '21:00', NULL,
       '+507 226-1170', 'Platos criollos junto a las ruinas de Panamá Viejo.', 4.2),
      ('Ramen Ya Marbella', 'Japonesa', 'casual', 1400, '12:00', '22:00', NULL,
       '+507 269-7716', 'Ramen tonkotsu, gyozas y té verde frío.', 4.4),
      ('Mercado Gourmet Albrook', 'Internacional', 'casual', 1200, '10:00', '21:00', NULL,
       '+507 315-0090', 'Patio de cocinas con opciones locales e internacionales.', 4.0),
      ('La Casona de Ancón', 'Panameña contemporánea', 'formal', 2800, '18:00', '23:00', NULL,
       '+507 212-3366', 'Cocina de autor en una casa histórica del Cerro Ancón.', 4.7),
      ('Arepera Caraqueña', 'Venezolana', 'casual', 800, '07:00', '22:00', NULL,
       '+507 6203-4419', 'Arepas rellenas, cachapas y tequeños.', 4.3),
      ('Chiriquí Coffee House', 'Cafetería', 'casual', 700, '06:30', '18:00', NULL,
       '+507 223-6650', 'Café geisha de las tierras altas y repostería artesanal.', 4.8),
      ('Peruano Inti', 'Peruana', 'casual', 1900, '12:00', '22:00', NULL,
       '+507 264-2273', 'Lomo saltado, ají de gallina y pisco sour.', 4.6),
      ('Gamboa River Grill', 'Internacional', 'casual', 1700, '11:00', '20:00', NULL,
       '+507 6640-1182', 'Parrilla a orillas del río Chagres, camino a la selva.', 4.4),
      ('Dulce Hojaldra', 'Cafetería', 'casual', 600, '06:00', '14:00', NULL,
       '+507 225-8841', 'Hojaldras, chicheme y café chorreado.', 4.5),
      ('Mar y Tierra Taboga', 'Mariscos', 'casual', 1600, '10:00', '19:00', NULL,
       '+507 250-2288', 'Pescado del día junto al muelle de Isla Taboga.', 4.3),
      -- Restaurantes dentro de hoteles (se vinculan por el nombre del hotel).
      ('Restaurante El Patio Colonial', 'Panameña contemporánea', 'formal', 2600, '07:00',
       '22:30', 'Hotel Casco Real', '+507 228-4411',
       'Patio interior del hotel con cocina panameña de autor.', 4.7),
      ('Balboa Steakhouse', 'Parrilla', 'formal', 3800, '18:00', '23:00',
       'Gran Hotel Balboa', '+507 314-2291', 'Cortes premium con vista a la bahía.', 4.6),
      ('Sky Lounge Pacífica', 'Internacional', 'formal', 4500, '17:00', '01:00',
       'Torre Pacífica Hotel & Spa', '+507 301-7756',
       'Bar y restaurante en el último piso, con coctelería y vista al océano.', 4.8),
      ('Taboga Beach Grill', 'Mariscos', 'casual', 1800, '10:00', '22:00',
       'Isla Taboga Beach Resort', '+507 250-2101', 'Parrilla de playa con pescado fresco.', 4.4),
      ('Marina Café', 'Cafetería', 'casual', 900, '06:30', '20:00', 'Amador Marina Hotel',
       '+507 314-0902', 'Café y comida ligera mirando los barcos de la marina.', 4.2),
      ('Azul Costa Restaurante', 'Internacional', 'formal', 3200, '06:30', '23:00',
       'Costa del Este Grand', '+507 396-4401', 'Buffet de desayuno y cena a la carta.', 4.5),
      ('Perla Negra', 'Mariscos', 'formal', 4200, '12:00', '22:00', 'Pearl Islands Lodge',
       '+507 6780-3322', 'Mariscos de Las Perlas servidos frente al mar.', 4.9),
      ('La Ola Buffet', 'Internacional', 'casual', 2500, '07:00', '22:00',
       'Playa Bonita Resort & Club', '+507 304-5201', 'Buffet temático cada noche.', 4.3),
      ('Huerto Clayton', 'Vegetariana', 'casual', 1500, '07:00', '21:00',
       'Casa Clayton Boutique', '+507 317-2269',
       'Cocina de huerto con vegetales del jardín de la casa.', 4.7),
      ('Mirador Hills', 'Internacional', 'formal', 2900, '12:00', '22:00',
       'Pacific Hills Resort', '+507 248-6611', 'Restaurante del club con vista al Pacífico.', 4.5)
    ) AS r(name, cuisine, style, price, opens, closes, hotel, phone, description, rating)
  LOOP
    v_index := v_index + 1;
    v_slug := 'demo-pa-rest-' || lower(regexp_replace(
      translate(v_row.name, 'áéíóúñÁÉÍÓÚÑ&', 'aeiounAEIOUNy'), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(BOTH '-' FROM v_slug);
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.services WHERE slug = v_slug);

    -- El restaurante de un hotel queda en el mismo sitio turístico que el hotel.
    v_hotel := NULL;
    IF v_row.hotel IS NOT NULL THEN
      SELECT id, tourist_site_id INTO v_hotel, v_site
      FROM public.services
      WHERE slug LIKE 'demo-pa-%' AND category_id = 'hospedaje' AND name = v_row.hotel;
      IF v_hotel IS NULL THEN
        RAISE NOTICE 'No se encontró el hotel "%"; % queda como independiente.',
          v_row.hotel, v_row.name;
      END IF;
    END IF;
    IF v_hotel IS NULL THEN
      v_site := v_sites[1 + ((v_index - 1) % cardinality(v_sites))];
    END IF;

    INSERT INTO public.services (
      slug, business_id, category_id, name, search_description, description,
      destination_province_id, tourist_site_id, address, base_price_cents,
      status, review_status, is_recommended, rating_avg, rating_count
    ) VALUES (
      v_slug, v_business, 'restaurantes', v_row.name,
      v_row.cuisine || ' · ' || v_row.description,
      v_row.description || ' Datos ficticios para pruebas del catálogo.',
      'Panamá', v_site,
      CASE WHEN v_hotel IS NULL THEN 'Ciudad de Panamá, Panamá'
           ELSE 'Dentro de ' || v_row.hotel || ', Panamá' END,
      v_row.price, 'published', 'approved', v_index % 7 = 0,
      v_row.rating, 8 + (v_index * 11) % 150
    )
    RETURNING id INTO v_service;

    INSERT INTO public.service_tourist_sites (service_id, tourist_site_id)
    SELECT v_service, v_site
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_tourist_sites
      WHERE service_id = v_service AND tourist_site_id = v_site
    );

    INSERT INTO public.restaurant_profiles (
      service_id, tag, service_style, cuisine_type, payment_methods, hours_from, hours_to,
      contact_phone, contact_email, website_url, menu_url, ambience, accepts_reservations,
      reservation_requires_confirmation, average_price_min_cents, average_price_max_cents,
      cancellation_policy, details
    ) VALUES (
      v_service, v_row.style, v_row.style, v_row.cuisine,
      ARRAY['Efectivo', 'Tarjeta', 'Yappy'], v_row.opens::time,
      CASE WHEN v_row.closes::time <= v_row.opens::time THEN '23:59'::time
           ELSE v_row.closes::time END,
      v_row.phone,
      'reservas@' || replace(substr(v_slug, 14), '-', '') || '.com.pa',
      'https://' || replace(substr(v_slug, 14), '-', '') || '.com.pa',
      'https://' || replace(substr(v_slug, 14), '-', '') || '.com.pa/menu',
      CASE WHEN v_row.style = 'formal' THEN 'Elegante y tranquilo'
           ELSE 'Relajado y familiar' END,
      true, v_row.style = 'formal',
      v_row.price, v_row.price * 2,
      'Avisar cancelaciones con al menos 2 horas de anticipación.',
      '{}'::jsonb
    )
    ON CONFLICT (service_id) DO NOTHING;

    -- Mismo horario todos los días. Si cierra después de medianoche, se corta a las 23:59.
    FOR v_day IN 0..6 LOOP
      INSERT INTO public.restaurant_hours (
        service_id, day_of_week, opens_at, closes_at, position
      )
      VALUES (
        v_service, v_day, v_row.opens::time,
        CASE WHEN v_row.closes::time <= v_row.opens::time THEN '23:59'::time
             ELSE v_row.closes::time END,
        0
      );
    END LOOP;

    -- Menú corto de ejemplo. Si la tabla tiene columnas distintas, se omite sin fallar.
    BEGIN
      INSERT INTO public.menu_sections (service_id, title, position)
      VALUES (v_service, 'Platos principales', 0)
      RETURNING id INTO v_section;
      INSERT INTO public.menu_dishes (section_id, name, description, price_cents, position)
      VALUES
        (v_section, 'Especial de la casa', 'Recomendación del chef.', v_row.price + 600, 0),
        (v_section, 'Plato del día', 'Cambia según el mercado.', v_row.price, 1),
        (v_section, 'Postre típico', 'Dulce panameño de temporada.', 450, 2);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Menú omitido para %: %', v_row.name, SQLERRM;
    END;

    -- Vincula el restaurante al hotel para "Restaurantes del hospedaje".
    IF v_hotel IS NOT NULL THEN
      UPDATE public.lodging_profiles
      SET details = jsonb_set(
        COALESCE(details, '{}'::jsonb),
        '{linked_restaurant_ids}',
        COALESCE(details -> 'linked_restaurant_ids', '[]'::jsonb) || to_jsonb(v_service::text)
      )
      WHERE service_id = v_hotel;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Comprobación: 35 restaurantes; los que dicen un hotel están vinculados a él.
SELECT r.name AS restaurante, h.name AS hotel, r.base_price_cents, r.status
FROM public.services AS r
LEFT JOIN public.lodging_profiles AS l
  ON l.details -> 'linked_restaurant_ids' ? r.id::text
LEFT JOIN public.services AS h ON h.id = l.service_id
WHERE r.slug LIKE 'demo-pa-rest-%'
ORDER BY h.name NULLS FIRST, r.name;
