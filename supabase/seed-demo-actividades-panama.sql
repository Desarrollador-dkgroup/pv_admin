-- 20 actividades ficticias publicadas en la provincia de Panamá.
-- Ejecutar completo en el SQL Editor de Supabase. Se puede repetir: si un slug ya existe, se
-- salta. Todos los slugs empiezan por "demo-pa-"; para borrarlos usar
-- borrar-demo-actividades-panama.sql.
--
-- Reglas de la base que respeta:
-- - Actividad con base_price_cents obligatorio.
-- - Actividad con category_id = 'actividades' y destination_province_id requerido.
-- - Los datos de horario, edad, incluye y atracciones van en activity_profiles.details (JSONB).
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
  v_service uuid;
  v_slug text;
  v_row record;
  v_index integer := 0;
BEGIN
  IF v_business IS NULL THEN
    RAISE EXCEPTION 'No hay un negocio activo para asignar las actividades.';
  END IF;
  IF v_province IS NULL THEN
    RAISE EXCEPTION 'No existe la provincia Panamá en public.provinces.';
  END IF;

  FOR v_row IN
    SELECT * FROM (VALUES
      ('Tour por el Canal de Panamá', 'tour-canal', 12500, '+507 6123-4567', 'info@tourcanal.com'),
      ('Senderismo en Soberanía', 'senderismo-soberania', 5000, '+507 6234-5678', 'contact@soberania.com'),
      ('Buceo en Las Perlas', 'buceo-perlas', 18000, '+507 6345-6789', 'dive@lasperlas.com'),
      ('Kayak en el Lago Gatún', 'kayak-gatun', 8000, '+507 6456-7890', 'kayak@gatun.com'),
      ('Aventura en la Selva de Darién', 'aventura-darien', 22000, '+507 6567-8901', 'darien@adventure.com'),
      ('Visita a Islas Nalunega', 'islas-nalunega', 10000, '+507 6678-9012', 'islands@nalunega.com'),
      ('Tubing en Río Chagres', 'tubing-chagres', 4500, '+507 6789-0123', 'tubing@chagres.com'),
      ('Tour Gastronómico Casco Antiguo', 'tour-gastronomico', 7500, '+507 6890-1234', 'food@cascoviejo.com'),
      ('Avistamiento de Vida Silvestre', 'vida-silvestre', 9500, '+507 6901-2345', 'wildlife@panama.com'),
      ('Escalada en Roca', 'escalada-roca', 6000, '+507 7012-3456', 'climbing@panama.com'),
      ('Tour Histórico del Canal', 'tour-historico-canal', 8500, '+507 7123-4567', 'history@canal.com'),
      ('Paracaidismo en Bocas del Toro', 'paracaidismo-bocas', 25000, '+507 7234-5678', 'skydive@bocas.com'),
      ('Snorkel en Archipiélago de Bocas', 'snorkel-bocas', 9000, '+507 7345-6789', 'snorkel@bocas.com'),
      ('Rafting Río Chiriquí', 'rafting-chiriqui', 11000, '+507 7456-7890', 'raft@chiriqui.com'),
      ('Tirolesa en la Selva', 'tirolesa-selva', 7000, '+507 7567-8901', 'zipline@jungle.com'),
      ('Bicicleta de Montaña', 'mtb-panama', 5500, '+507 7678-9012', 'mtb@panama.com'),
      ('Pesca Deportiva en el Caribe', 'pesca-caribe', 19000, '+507 7789-0123', 'fish@caribbean.com'),
      ('Meditación en Boquete', 'meditacion-boquete', 4000, '+507 7890-1234', 'meditate@boquete.com'),
      ('Tour Ornitológico Soberanía', 'birdwatching-soberania', 8000, '+507 7901-2345', 'birds@soberania.com'),
      ('Campamento en la Naturaleza', 'camping-panama', 6500, '+507 8012-3456', 'camp@panama.com')
    ) AS activities(name, slug, price_cents, phone, email)
  LOOP
    v_slug := 'demo-pa-' || v_row.slug;

    -- Intenta crear el servicio; si el slug existe, sigue al siguiente.
    BEGIN
      INSERT INTO public.services (
        name, slug, business_id, category_id, destination_province_id,
        base_price_cents, status, review_status, search_description, description,
        created_at, updated_at
      ) VALUES (
        v_row.name, v_slug, v_business, 'actividades', v_province,
        v_row.price_cents, 'published', 'approved',
        v_row.name || ' - Explora lo mejor de Panamá con nosotros.',
        'Disfruta de una increíble experiencia en ' || v_row.name || '. Nuestros guías profesionales te llevarán a los lugares más hermosos y emocionantes de Panamá.',
        now(), now()
      ) RETURNING id INTO v_service;

      -- Crear perfil de actividad con detalles.
      INSERT INTO public.activity_profiles (
        service_id,
        details,
        created_at,
        updated_at
      ) VALUES (
        v_service,
        jsonb_build_object(
          'schedule', jsonb_build_object(
            'lunes', jsonb_build_object('from', '08:00', 'to', '17:00'),
            'martes', jsonb_build_object('from', '08:00', 'to', '17:00'),
            'miércoles', jsonb_build_object('from', '08:00', 'to', '17:00'),
            'jueves', jsonb_build_object('from', '08:00', 'to', '17:00'),
            'viernes', jsonb_build_object('from', '08:00', 'to', '17:00'),
            'sábado', jsonb_build_object('from', '09:00', 'to', '17:00'),
            'domingo', jsonb_build_object('from', '09:00', 'to', '16:00')
          ),
          'minAge', 8,
          'whatIncludes', jsonb_build_array(
            'Guía profesional certificado',
            'Equipo de seguridad',
            'Seguro de actividad',
            'Almuerzo ligero'
          ),
          'attractions', jsonb_build_array(
            jsonb_build_object(
              'name', 'Punto de Vista Principal',
              'description', 'El mejor mirador de la actividad con vistas espectaculares.',
              'options', jsonb_build_array('Fotografía', 'Descanso'),
              'photos', jsonb_build_array()
            ),
            jsonb_build_object(
              'name', 'Área de Aventura',
              'description', 'Zona para realizar las actividades principales y deportivas.',
              'options', jsonb_build_array('Equipamiento', 'Instrucción'),
              'photos', jsonb_build_array()
            )
          )
        ),
        now(),
        now()
      );

      v_index := v_index + 1;

    EXCEPTION WHEN unique_violation THEN
      -- El slug ya existe, continúa con el siguiente.
    END;
  END LOOP;

  RAISE NOTICE '% actividades creadas exitosamente.', v_index;
END $$;

COMMIT;
