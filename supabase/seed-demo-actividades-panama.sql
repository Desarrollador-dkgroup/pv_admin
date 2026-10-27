-- Crear 20 actividades de demostración en Panamá, distribuidas entre los sitios turísticos.

BEGIN;

-- Variables con IDs de sitios turísticos (ajustar según la base de datos)
WITH tourist_sites AS (
  SELECT id, name FROM public.tourist_sites 
  WHERE province_id = 'panama' AND name IN (
    'Biomuseo', 'Chepo', 'Casco Antiguo', 'Isla Taboga', 'Cerro Azul',
    'Comunidad Emberá Druá', 'Parque Nacional Soberanía', 'Cuevas de Bayano',
    'Parque Metropolitano', 'Panamá Viejo', 'Calzada de Amador', 'Isla Contadora'
  )
),
-- Crear servicios base para actividades
new_services AS (
  INSERT INTO public.services (
    name, slug, category_id, destination_province_id, description, price_cents,
    status, published_at, created_by, created_at, updated_at
  )
  VALUES
    -- Biomuseo (2 actividades)
    ('Recorrido Interactivo Biomuseo', 'demo-pa-biomuseo-tour', 'actividades', 'panama',
     'Exhibiciones interactivas sobre la historia natural del istmo y biodiversidad de Panamá.',
     3500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Taller de Conservación Marina', 'demo-pa-conservacion-marina', 'actividades', 'panama',
     'Aprende sobre la conservación marina y participa en actividades educativas prácticas.',
     4000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Chepo (2 actividades)
    ('Senderismo por Selva Tropical', 'demo-pa-chepo-selva', 'actividades', 'panama',
     'Aventura guiada a través de la densa selva tropical con avistamiento de fauna.',
     5000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Tour de Rafting en Río Gatún', 'demo-pa-chepo-rafting', 'actividades', 'panama',
     'Descenso emocionante por rápidos moderados en el río Gatún.',
     6500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Casco Antiguo (2 actividades)
    ('Tour Histórico Casco Viejo', 'demo-pa-casco-viejo-tour', 'actividades', 'panama',
     'Recorrido guiado por las calles coloniales, iglesias y plazas históricas del Casco.',
     3000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Sunset Drink Tour', 'demo-pa-casco-sunset', 'actividades', 'panama',
     'Visita de bares con vista al atardecer sobre el Pacífico.',
     4500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Isla Taboga (2 actividades)
    ('Snorkel y Buceo en Arrecifes', 'demo-pa-taboga-snorkel', 'actividades', 'panama',
     'Explora arrecifes coralinos y nada con peces tropicales.',
     5500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Paseo en Kayak Costero', 'demo-pa-taboga-kayak', 'actividades', 'panama',
     'Navegación en kayak por aguas cristalinas con vistas a islas cercanas.',
     4000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Cerro Azul (2 actividades)
    ('Senderismo en Cerro Azul', 'demo-pa-cerro-azul-trek', 'actividades', 'panama',
     'Caminata a la cima de Cerro Azul con vistas panorámicas de la ciudad.',
     3500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Camping en la Naturaleza', 'demo-pa-cerro-azul-camping', 'actividades', 'panama',
     'Experiencia de camping nocturno con observación de estrellas.',
     4500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Comunidad Emberá Druá (2 actividades)
    ('Encuentro Cultural Emberá', 'demo-pa-embera-cultural', 'actividades', 'panama',
     'Convive con la comunidad Emberá: danzas, artesanías y gastronomía tradicional.',
     6000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Taller de Artesanías Emberá', 'demo-pa-embera-artesanias', 'actividades', 'panama',
     'Aprende a elaborar artesanías tradicionales Emberá de la mano de maestros locales.',
     5000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Parque Nacional Soberanía (2 actividades)
    ('Birdwatching Profesional', 'demo-pa-soberania-birds', 'actividades', 'panama',
     'Avistamiento de aves guiado por ornitólogos con binoculares profesionales.',
     5500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Caminata Pipeline Road', 'demo-pa-soberania-pipeline', 'actividades', 'panama',
     'Recorrido por la famosa Pipeline Road, ruta legendaria para aviadores.',
     4000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Cuevas de Bayano (1 actividad)
    ('Exploración de Cuevas Subterráneas', 'demo-pa-bayano-cuevas', 'actividades', 'panama',
     'Descubre cavernas, formaciones geológicas y ríos subterráneos en la selva.',
     5500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Parque Metropolitano (2 actividades)
    ('Sendero Bosque Nublado', 'demo-pa-metropolitan-cloud', 'actividades', 'panama',
     'Caminata por bosque nublado con cascadas y vegetación exuberante.',
     3000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    ('Yoga y Meditación en la Naturaleza', 'demo-pa-metropolitan-yoga', 'actividades', 'panama',
     'Sesión de yoga guiada rodeada de naturaleza virgen y sonidos de la selva.',
     3500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Panamá Viejo (1 actividad)
    ('Tour Arqueológico Panamá Viejo', 'demo-pa-panama-viejo-tour', 'actividades', 'panama',
     'Explora ruinas de la primera ciudad de Panamá con guías especializados.',
     3500, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Calzada de Amador (1 actividad)
    ('Paseo en Bicicleta Calzada de Amador', 'demo-pa-amador-biking', 'actividades', 'panama',
     'Recorrido en bici con vistas al skyline y acceso a islas cercanas.',
     4000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW()),
    -- Isla Contadora (1 actividad)
    ('Isla Hopping en las Perlas', 'demo-pa-contadora-islands', 'actividades', 'panama',
     'Tour de un día visitando múltiples islas con playas vírgenes y snorkel.',
     7000, 'published', NOW(), (SELECT auth.uid()), NOW(), NOW())
  RETURNING id, slug, name
)
-- Insertar perfiles de actividades con detalles
INSERT INTO public.activity_profiles (
  service_id, details, location_address_details, has_multiple_shifts, tourist_site_id, created_at, updated_at
)
SELECT 
  ns.id,
  jsonb_build_object(
    'schedule', CASE 
      WHEN ns.slug = 'demo-pa-biomuseo-tour' THEN '{"lunes":{"from":"09:00","to":"17:00"},"martes":{"from":"09:00","to":"17:00"},"miércoles":{"from":"09:00","to":"17:00"},"jueves":{"from":"09:00","to":"17:00"},"viernes":{"from":"09:00","to":"17:00"},"sábado":{"from":"10:00","to":"18:00"},"domingo":{"from":"10:00","to":"18:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-conservacion-marina' THEN '{"lunes":{"from":"10:00","to":"14:00"},"martes":{"from":"10:00","to":"14:00"},"miércoles":{"from":"10:00","to":"14:00"},"jueves":{"from":"10:00","to":"14:00"},"viernes":{"from":"10:00","to":"14:00"},"sábado":{"from":"08:00","to":"16:00"},"domingo":null}'::jsonb
      WHEN ns.slug = 'demo-pa-chepo-selva' THEN '{"lunes":null,"martes":{"from":"07:00","to":"15:00"},"miércoles":{"from":"07:00","to":"15:00"},"jueves":{"from":"07:00","to":"15:00"},"viernes":{"from":"07:00","to":"15:00"},"sábado":{"from":"06:00","to":"16:00"},"domingo":{"from":"06:00","to":"16:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-chepo-rafting' THEN '{"lunes":null,"martes":{"from":"09:00","to":"16:00"},"miércoles":{"from":"09:00","to":"16:00"},"jueves":{"from":"09:00","to":"16:00"},"viernes":{"from":"09:00","to":"16:00"},"sábado":{"from":"08:00","to":"17:00"},"domingo":{"from":"08:00","to":"17:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-casco-viejo-tour' THEN '{"lunes":{"from":"10:00","to":"18:00"},"martes":{"from":"10:00","to":"18:00"},"miércoles":{"from":"10:00","to":"18:00"},"jueves":{"from":"10:00","to":"18:00"},"viernes":{"from":"10:00","to":"18:00"},"sábado":{"from":"09:00","to":"19:00"},"domingo":{"from":"09:00","to":"19:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-casco-sunset' THEN '{"lunes":{"from":"17:00","to":"23:00"},"martes":{"from":"17:00","to":"23:00"},"miércoles":{"from":"17:00","to":"23:00"},"jueves":{"from":"17:00","to":"23:00"},"viernes":{"from":"17:00","to":"00:00"},"sábado":{"from":"17:00","to":"00:00"},"domingo":{"from":"17:00","to":"23:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-taboga-snorkel' THEN '{"lunes":null,"martes":{"from":"08:00","to":"17:00"},"miércoles":{"from":"08:00","to":"17:00"},"jueves":{"from":"08:00","to":"17:00"},"viernes":{"from":"08:00","to":"17:00"},"sábado":{"from":"07:00","to":"18:00"},"domingo":{"from":"07:00","to":"18:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-taboga-kayak' THEN '{"lunes":null,"martes":{"from":"08:00","to":"16:00"},"miércoles":{"from":"08:00","to":"16:00"},"jueves":{"from":"08:00","to":"16:00"},"viernes":{"from":"08:00","to":"16:00"},"sábado":{"from":"07:00","to":"17:00"},"domingo":{"from":"07:00","to":"17:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-cerro-azul-trek' THEN '{"lunes":null,"martes":{"from":"07:00","to":"15:00"},"miércoles":{"from":"07:00","to":"15:00"},"jueves":{"from":"07:00","to":"15:00"},"viernes":{"from":"07:00","to":"15:00"},"sábado":{"from":"06:00","to":"16:00"},"domingo":{"from":"06:00","to":"16:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-cerro-azul-camping' THEN '{"viernes":{"from":"16:00","to":"08:00"},"sábado":{"from":"16:00","to":"08:00"},"domingo":null,"lunes":null,"martes":null,"miércoles":null,"jueves":null}'::jsonb
      WHEN ns.slug = 'demo-pa-embera-cultural' THEN '{"lunes":null,"martes":{"from":"09:00","to":"17:00"},"miércoles":{"from":"09:00","to":"17:00"},"jueves":{"from":"09:00","to":"17:00"},"viernes":{"from":"09:00","to":"17:00"},"sábado":{"from":"08:00","to":"18:00"},"domingo":{"from":"08:00","to":"18:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-embera-artesanias' THEN '{"lunes":null,"martes":{"from":"10:00","to":"16:00"},"miércoles":{"from":"10:00","to":"16:00"},"jueves":{"from":"10:00","to":"16:00"},"viernes":{"from":"10:00","to":"16:00"},"sábado":{"from":"09:00","to":"17:00"},"domingo":{"from":"09:00","to":"17:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-soberania-birds' THEN '{"lunes":null,"martes":{"from":"06:00","to":"11:00"},"miércoles":{"from":"06:00","to":"11:00"},"jueves":{"from":"06:00","to":"11:00"},"viernes":{"from":"06:00","to":"11:00"},"sábado":{"from":"06:00","to":"13:00"},"domingo":{"from":"06:00","to":"13:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-soberania-pipeline' THEN '{"lunes":null,"martes":{"from":"07:00","to":"15:00"},"miércoles":{"from":"07:00","to":"15:00"},"jueves":{"from":"07:00","to":"15:00"},"viernes":{"from":"07:00","to":"15:00"},"sábado":{"from":"06:00","to":"16:00"},"domingo":{"from":"06:00","to":"16:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-bayano-cuevas' THEN '{"lunes":null,"martes":{"from":"07:00","to":"16:00"},"miércoles":{"from":"07:00","to":"16:00"},"jueves":{"from":"07:00","to":"16:00"},"viernes":{"from":"07:00","to":"16:00"},"sábado":{"from":"06:00","to":"17:00"},"domingo":{"from":"06:00","to":"17:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-metropolitan-cloud' THEN '{"lunes":{"from":"07:00","to":"17:00"},"martes":{"from":"07:00","to":"17:00"},"miércoles":{"from":"07:00","to":"17:00"},"jueves":{"from":"07:00","to":"17:00"},"viernes":{"from":"07:00","to":"17:00"},"sábado":{"from":"06:00","to":"18:00"},"domingo":{"from":"06:00","to":"18:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-metropolitan-yoga' THEN '{"lunes":{"from":"07:00","to":"09:00"},"martes":{"from":"07:00","to":"09:00"},"miércoles":{"from":"07:00","to":"09:00"},"jueves":{"from":"07:00","to":"09:00"},"viernes":{"from":"07:00","to":"09:00"},"sábado":{"from":"08:00","to":"10:00"},"domingo":{"from":"08:00","to":"10:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-panama-viejo-tour' THEN '{"lunes":{"from":"09:00","to":"17:00"},"martes":{"from":"09:00","to":"17:00"},"miércoles":{"from":"09:00","to":"17:00"},"jueves":{"from":"09:00","to":"17:00"},"viernes":{"from":"09:00","to":"17:00"},"sábado":{"from":"09:00","to":"17:00"},"domingo":{"from":"10:00","to":"17:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-amador-biking' THEN '{"lunes":{"from":"06:00","to":"20:00"},"martes":{"from":"06:00","to":"20:00"},"miércoles":{"from":"06:00","to":"20:00"},"jueves":{"from":"06:00","to":"20:00"},"viernes":{"from":"06:00","to":"20:00"},"sábado":{"from":"06:00","to":"21:00"},"domingo":{"from":"06:00","to":"21:00"}}'::jsonb
      WHEN ns.slug = 'demo-pa-contadora-islands' THEN '{"lunes":null,"martes":{"from":"08:00","to":"17:00"},"miércoles":{"from":"08:00","to":"17:00"},"jueves":{"from":"08:00","to":"17:00"},"viernes":{"from":"08:00","to":"17:00"},"sábado":{"from":"07:00","to":"18:00"},"domingo":{"from":"07:00","to":"18:00"}}'::jsonb
      ELSE '{}' END,
    'min_age', CASE 
      WHEN ns.slug IN ('demo-pa-conservacion-marina', 'demo-pa-chepo-rafting', 'demo-pa-taboga-snorkel', 'demo-pa-bayano-cuevas')
        THEN 10
      WHEN ns.slug IN ('demo-pa-embera-cultural', 'demo-pa-metropolitan-yoga', 'demo-pa-casco-sunset')
        THEN 16
      WHEN ns.slug IN ('demo-pa-cerro-azul-camping', 'demo-pa-soberania-birds')
        THEN 8
      ELSE 5 END,
    'what_includes', CASE
      WHEN ns.slug = 'demo-pa-biomuseo-tour' THEN '["Entrada al museo", "Guía profesional bilingüe", "Acceso a todas las exhibiciones", "Material educativo"]'::jsonb
      WHEN ns.slug = 'demo-pa-conservacion-marina' THEN '["Materiales de laboratorio", "Guía especializado", "Certificado de participación"]'::jsonb
      WHEN ns.slug = 'demo-pa-chepo-selva' THEN '["Guía experto en fauna", "Binoculares", "Refrigerios", "Protección contra insectos"]'::jsonb
      WHEN ns.slug = 'demo-pa-chepo-rafting' THEN '["Chaleco salvavidas", "Remos", "Guía certificado", "Snacks y bebidas"]'::jsonb
      WHEN ns.slug = 'demo-pa-casco-viejo-tour' THEN '["Guía turístico", "Mapas impresos", "Acceso a iglesias"]'::jsonb
      WHEN ns.slug = 'demo-pa-casco-sunset' THEN '["Primera bebida", "Entrada a bares premium", "Snacks seleccionados"]'::jsonb
      WHEN ns.slug = 'demo-pa-taboga-snorkel' THEN '["Equipo de snorkel", "Traje de baño", "Instructor certificado", "Almuerzo"]'::jsonb
      WHEN ns.slug = 'demo-pa-taboga-kayak' THEN '["Kayak individual", "Chaleco salvavidas", "Guía experto", "Refrigerios"]'::jsonb
      WHEN ns.slug = 'demo-pa-cerro-azul-trek' THEN '["Guía de montaña", "Agua y refrigerios", "Bastones de trekking"]'::jsonb
      WHEN ns.slug = 'demo-pa-cerro-azul-camping' THEN '["Tienda de campaña", "Bolsa de dormir", "Linterna", "Desayuno campestre"]'::jsonb
      WHEN ns.slug = 'demo-pa-embera-cultural' THEN '["Transporte desde Panamá", "Comida tradicional Emberá", "Artesanía para llevar", "Guía comunitario"]'::jsonb
      WHEN ns.slug = 'demo-pa-embera-artesanias' THEN '["Materiales completos", "Instructores Emberá", "Artesanía terminada para llevar"]'::jsonb
      WHEN ns.slug = 'demo-pa-soberania-birds' THEN '["Binoculares profesionales", "Guía ornitólogo", "Guía de aves", "Agua"]'::jsonb
      WHEN ns.slug = 'demo-pa-soberania-pipeline' THEN '["Guía experto", "Agua y refrigerios", "Bastones de trekking", "Protección solar"]'::jsonb
      WHEN ns.slug = 'demo-pa-bayano-cuevas' THEN '["Equipo de seguridad", "Linternas", "Guía espeleólogo", "Almuerzo campestre"]'::jsonb
      WHEN ns.slug = 'demo-pa-metropolitan-cloud' THEN '["Guía naturalista", "Agua", "Refrigerios", "Material educativo"]'::jsonb
      WHEN ns.slug = 'demo-pa-metropolitan-yoga' THEN '["Sesión guiada", "Tapete de yoga", "Agua mineral", "Meditación de cierre"]'::jsonb
      WHEN ns.slug = 'demo-pa-panama-viejo-tour' THEN '["Guía arqueólogo", "Acceso a ruinas", "Mapas históricos", "Acceso a museo"]'::jsonb
      WHEN ns.slug = 'demo-pa-amador-biking' THEN '["Bicicleta", "Casco", "Guía", "Refrigerios", "Acceso a islas"]'::jsonb
      WHEN ns.slug = 'demo-pa-contadora-islands' THEN '["Transporte en bote", "Snorkel completo", "Almuerzo", "Guía turístico"]'::jsonb
      ELSE '[]'::jsonb END,
    'attractions', '[]'::jsonb
  ),
  CASE
    WHEN ns.slug = 'demo-pa-biomuseo-tour' THEN 'Avenida Amador, lado Pacifico'
    WHEN ns.slug = 'demo-pa-conservacion-marina' THEN 'Edificio principal, segundo piso'
    WHEN ns.slug = 'demo-pa-chepo-selva' THEN 'Punto de encuentro: Estación de Guardaparques'
    WHEN ns.slug = 'demo-pa-chepo-rafting' THEN 'Puerto de Gatún, muelle principal'
    WHEN ns.slug = 'demo-pa-casco-viejo-tour' THEN 'Parque Bolívar, junto al Palacio Municipal'
    WHEN ns.slug = 'demo-pa-casco-sunset' THEN 'Calle Primera, frente al malecón'
    WHEN ns.slug = 'demo-pa-taboga-snorkel' THEN 'Playa La Restinga, centro de buceo'
    WHEN ns.slug = 'demo-pa-taboga-kayak' THEN 'Muelle de Isla Taboga, bote operador'
    WHEN ns.slug = 'demo-pa-cerro-azul-trek' THEN 'Entrada principal de Cerro Azul, sector Altos'
    WHEN ns.slug = 'demo-pa-cerro-azul-camping' THEN 'Campamento base, zona de acampar'
    WHEN ns.slug = 'demo-pa-embera-cultural' THEN 'Comunidad Emberá Druá, río Gatún'
    WHEN ns.slug = 'demo-pa-embera-artesanias' THEN 'Casa comunitaria, centro de artesanías'
    WHEN ns.slug = 'demo-pa-soberania-birds' THEN 'Entrada Pipeline Road, parque oficial'
    WHEN ns.slug = 'demo-pa-soberania-pipeline' THEN 'Pipeline Road km 0, punto de inicio'
    WHEN ns.slug = 'demo-pa-bayano-cuevas' THEN 'Entrada Cuevas de Bayano, sector turístico'
    WHEN ns.slug = 'demo-pa-metropolitan-cloud' THEN 'Sendero principal, parque metropolitano'
    WHEN ns.slug = 'demo-pa-metropolitan-yoga' THEN 'Claro natural, zona de meditación'
    WHEN ns.slug = 'demo-pa-panama-viejo-tour' THEN 'Entrada principal ruinas, centro visitantes'
    WHEN ns.slug = 'demo-pa-amador-biking' THEN 'Centro de bicicletas, frente Cinta Costera'
    WHEN ns.slug = 'demo-pa-contadora-islands' THEN 'Muelle principal Isla Contadora, oficina operadora'
    ELSE 'Por confirmar'
  END,
  true,
  (SELECT id FROM tourist_sites WHERE name = CASE
    WHEN ns.slug IN ('demo-pa-biomuseo-tour', 'demo-pa-conservacion-marina') THEN 'Biomuseo'
    WHEN ns.slug IN ('demo-pa-chepo-selva', 'demo-pa-chepo-rafting') THEN 'Chepo'
    WHEN ns.slug IN ('demo-pa-casco-viejo-tour', 'demo-pa-casco-sunset') THEN 'Casco Antiguo'
    WHEN ns.slug IN ('demo-pa-taboga-snorkel', 'demo-pa-taboga-kayak') THEN 'Isla Taboga'
    WHEN ns.slug IN ('demo-pa-cerro-azul-trek', 'demo-pa-cerro-azul-camping') THEN 'Cerro Azul'
    WHEN ns.slug IN ('demo-pa-embera-cultural', 'demo-pa-embera-artesanias') THEN 'Comunidad Emberá Druá'
    WHEN ns.slug IN ('demo-pa-soberania-birds', 'demo-pa-soberania-pipeline') THEN 'Parque Nacional Soberanía'
    WHEN ns.slug = 'demo-pa-bayano-cuevas' THEN 'Cuevas de Bayano'
    WHEN ns.slug IN ('demo-pa-metropolitan-cloud', 'demo-pa-metropolitan-yoga') THEN 'Parque Metropolitano'
    WHEN ns.slug = 'demo-pa-panama-viejo-tour' THEN 'Panamá Viejo'
    WHEN ns.slug = 'demo-pa-amador-biking' THEN 'Calzada de Amador'
    WHEN ns.slug = 'demo-pa-contadora-islands' THEN 'Isla Contadora'
    ELSE NULL END),
  NOW(),
  NOW()
FROM new_services ns;

-- Crear horarios desglosados por día (activity_hours)
WITH service_slots AS (
  SELECT id, slug FROM public.services 
  WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades'
)
INSERT INTO public.activity_hours (service_id, day_of_week, opens_at, closes_at, position, created_at, updated_at)
SELECT 
  ss.id, 
  day_num,
  open_time,
  close_time,
  1,
  NOW(),
  NOW()
FROM service_slots ss
CROSS JOIN LATERAL (
  VALUES
    (1, CASE WHEN ss.slug IN ('demo-pa-chepo-selva', 'demo-pa-chepo-rafting', 'demo-pa-taboga-snorkel', 'demo-pa-taboga-kayak', 'demo-pa-cerro-azul-trek', 'demo-pa-bayano-cuevas', 'demo-pa-soberania-birds', 'demo-pa-soberania-pipeline', 'demo-pa-contadora-islands') THEN NULL ELSE '09:00'::time END, CASE WHEN ss.slug IN ('demo-pa-chepo-selva', 'demo-pa-chepo-rafting', 'demo-pa-taboga-snorkel', 'demo-pa-taboga-kayak', 'demo-pa-cerro-azul-trek', 'demo-pa-bayano-cuevas', 'demo-pa-soberania-birds', 'demo-pa-soberania-pipeline', 'demo-pa-contadora-islands') THEN NULL ELSE '17:00'::time END),
    (2, '09:00'::time, '17:00'::time),
    (3, '09:00'::time, '17:00'::time),
    (4, '09:00'::time, '17:00'::time),
    (5, '09:00'::time, '17:00'::time),
    (6, CASE WHEN ss.slug IN ('demo-pa-cerro-azul-camping') THEN '16:00'::time ELSE '09:00'::time END, CASE WHEN ss.slug IN ('demo-pa-cerro-azul-camping') THEN '08:00'::time ELSE '18:00'::time END),
    (0, CASE WHEN ss.slug IN ('demo-pa-embera-artesanias', 'demo-pa-chepo-selva') THEN NULL ELSE '10:00'::time END, CASE WHEN ss.slug IN ('demo-pa-embera-artesanias', 'demo-pa-chepo-selva') THEN NULL ELSE '18:00'::time END)
) AS schedule_data(day_num, open_time, close_time)
WHERE open_time IS NOT NULL;

COMMIT;
