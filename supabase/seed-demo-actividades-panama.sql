-- Crear 20 actividades de demostración en Panamá, distribuidas entre los sitios turísticos.

BEGIN;

-- Crear servicios base para actividades
WITH new_services AS (
  INSERT INTO public.services (
    name, slug, category_id, destination_province_id, description, base_price_cents,
    status, published_at, created_at, updated_at
  )
  VALUES
    -- Biomuseo (2 actividades)
    ('Recorrido Interactivo Biomuseo', 'demo-pa-biomuseo-tour', 'actividades', 'panama',
     'Exhibiciones interactivas sobre la historia natural del istmo y biodiversidad de Panamá.',
     3500, 'published', NOW(), NOW(), NOW()),
    ('Taller de Conservación Marina', 'demo-pa-conservacion-marina', 'actividades', 'panama',
     'Aprende sobre la conservación marina y participa en actividades educativas prácticas.',
     4000, 'published', NOW(), NOW(), NOW()),
    -- Chepo (2 actividades)
    ('Senderismo por Selva Tropical', 'demo-pa-chepo-selva', 'actividades', 'panama',
     'Aventura guiada a través de la densa selva tropical con avistamiento de fauna.',
     5000, 'published', NOW(), NOW(), NOW()),
    ('Tour de Rafting en Río Gatún', 'demo-pa-chepo-rafting', 'actividades', 'panama',
     'Descenso emocionante por rápidos moderados en el río Gatún.',
     6500, 'published', NOW(), NOW(), NOW()),
    -- Casco Antiguo (2 actividades)
    ('Tour Histórico Casco Viejo', 'demo-pa-casco-viejo-tour', 'actividades', 'panama',
     'Recorrido guiado por las calles coloniales, iglesias y plazas históricas del Casco.',
     3000, 'published', NOW(), NOW(), NOW()),
    ('Sunset Drink Tour', 'demo-pa-casco-sunset', 'actividades', 'panama',
     'Visita de bares con vista al atardecer sobre el Pacífico.',
     4500, 'published', NOW(), NOW(), NOW()),
    -- Isla Taboga (2 actividades)
    ('Snorkel y Buceo en Arrecifes', 'demo-pa-taboga-snorkel', 'actividades', 'panama',
     'Explora arrecifes coralinos y nada con peces tropicales.',
     5500, 'published', NOW(), NOW(), NOW()),
    ('Paseo en Kayak Costero', 'demo-pa-taboga-kayak', 'actividades', 'panama',
     'Navegación en kayak por aguas cristalinas con vistas a islas cercanas.',
     4000, 'published', NOW(), NOW(), NOW()),
    -- Cerro Azul (2 actividades)
    ('Senderismo en Cerro Azul', 'demo-pa-cerro-azul-trek', 'actividades', 'panama',
     'Caminata a la cima de Cerro Azul con vistas panorámicas de la ciudad.',
     3500, 'published', NOW(), NOW(), NOW()),
    ('Camping en la Naturaleza', 'demo-pa-cerro-azul-camping', 'actividades', 'panama',
     'Experiencia de camping nocturno con observación de estrellas.',
     4500, 'published', NOW(), NOW(), NOW()),
    -- Comunidad Emberá Druá (2 actividades)
    ('Encuentro Cultural Emberá', 'demo-pa-embera-cultural', 'actividades', 'panama',
     'Convive con la comunidad Emberá: danzas, artesanías y gastronomía tradicional.',
     6000, 'published', NOW(), NOW(), NOW()),
    ('Taller de Artesanías Emberá', 'demo-pa-embera-artesanias', 'actividades', 'panama',
     'Aprende a elaborar artesanías tradicionales Emberá de la mano de maestros locales.',
     5000, 'published', NOW(), NOW(), NOW()),
    -- Parque Nacional Soberanía (2 actividades)
    ('Birdwatching Profesional', 'demo-pa-soberania-birds', 'actividades', 'panama',
     'Avistamiento de aves guiado por ornitólogos con binoculares profesionales.',
     5500, 'published', NOW(), NOW(), NOW()),
    ('Caminata Pipeline Road', 'demo-pa-soberania-pipeline', 'actividades', 'panama',
     'Recorrido por la famosa Pipeline Road, ruta legendaria para aviadores.',
     4000, 'published', NOW(), NOW(), NOW()),
    -- Cuevas de Bayano (1 actividad)
    ('Exploración de Cuevas Subterráneas', 'demo-pa-bayano-cuevas', 'actividades', 'panama',
     'Descubre cavernas, formaciones geológicas y ríos subterráneos en la selva.',
     5500, 'published', NOW(), NOW(), NOW()),
    -- Parque Metropolitano (2 actividades)
    ('Sendero Bosque Nublado', 'demo-pa-metropolitan-cloud', 'actividades', 'panama',
     'Caminata por bosque nublado con cascadas y vegetación exuberante.',
     3000, 'published', NOW(), NOW(), NOW()),
    ('Yoga y Meditación en la Naturaleza', 'demo-pa-metropolitan-yoga', 'actividades', 'panama',
     'Sesión de yoga guiada rodeada de naturaleza virgen y sonidos de la selva.',
     3500, 'published', NOW(), NOW(), NOW()),
    -- Panamá Viejo (1 actividad)
    ('Tour Arqueológico Panamá Viejo', 'demo-pa-panama-viejo-tour', 'actividades', 'panama',
     'Explora ruinas de la primera ciudad de Panamá con guías especializados.',
     3500, 'published', NOW(), NOW(), NOW()),
    -- Calzada de Amador (1 actividad)
    ('Paseo en Bicicleta Calzada de Amador', 'demo-pa-amador-biking', 'actividades', 'panama',
     'Recorrido en bici con vistas al skyline y acceso a islas cercanas.',
     4000, 'published', NOW(), NOW(), NOW()),
    -- Isla Contadora (1 actividad)
    ('Isla Hopping en las Perlas', 'demo-pa-contadora-islands', 'actividades', 'panama',
     'Tour de un día visitando múltiples islas con playas vírgenes y snorkel.',
     7000, 'published', NOW(), NOW(), NOW())
  RETURNING id, slug, name
)
-- Insertar perfiles de actividades con detalles
INSERT INTO public.activity_profiles (
  service_id, details, location_address_details, has_multiple_shifts, tourist_site_id, created_at, updated_at
)
SELECT 
  ns.id,
  jsonb_build_object(
    'schedule', '{}'::jsonb,
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
  (SELECT id FROM public.tourist_sites WHERE name = CASE
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
    ELSE NULL END AND province_id = 'panama'),
  NOW(),
  NOW()
FROM new_services ns;

-- Crear horarios desglosados por día (activity_hours)
INSERT INTO public.activity_hours (service_id, day_of_week, opens_at, closes_at, position, created_at, updated_at)
SELECT 
  s.id, 
  days.day_num,
  CASE WHEN s.slug IN ('demo-pa-chepo-selva', 'demo-pa-chepo-rafting', 'demo-pa-taboga-snorkel', 'demo-pa-taboga-kayak', 'demo-pa-cerro-azul-trek', 'demo-pa-bayano-cuevas', 'demo-pa-soberania-birds', 'demo-pa-soberania-pipeline', 'demo-pa-contadora-islands') 
    THEN CASE WHEN days.day_num = 0 THEN NULL ELSE (CASE WHEN s.slug = 'demo-pa-soberania-birds' THEN '06:00'::time WHEN s.slug = 'demo-pa-taboga-snorkel' THEN '08:00'::time WHEN s.slug = 'demo-pa-cerro-azul-trek' THEN '07:00'::time WHEN s.slug = 'demo-pa-chepo-rafting' THEN '09:00'::time WHEN s.slug = 'demo-pa-chepo-selva' THEN '07:00'::time WHEN s.slug = 'demo-pa-taboga-kayak' THEN '08:00'::time WHEN s.slug = 'demo-pa-bayano-cuevas' THEN '07:00'::time WHEN s.slug = 'demo-pa-soberania-pipeline' THEN '07:00'::time WHEN s.slug = 'demo-pa-contadora-islands' THEN '08:00'::time ELSE '08:00'::time END) END
    WHEN s.slug IN ('demo-pa-casco-sunset') THEN '17:00'::time
    WHEN s.slug IN ('demo-pa-metropolitan-yoga') THEN '07:00'::time
    WHEN s.slug IN ('demo-pa-cerro-azul-camping') THEN CASE WHEN days.day_num IN (5, 6) THEN '16:00'::time ELSE NULL END
    ELSE '09:00'::time 
  END,
  CASE WHEN s.slug IN ('demo-pa-chepo-selva', 'demo-pa-chepo-rafting', 'demo-pa-taboga-snorkel', 'demo-pa-taboga-kayak', 'demo-pa-cerro-azul-trek', 'demo-pa-bayano-cuevas', 'demo-pa-soberania-birds', 'demo-pa-soberania-pipeline', 'demo-pa-contadora-islands') 
    THEN CASE WHEN days.day_num = 0 THEN NULL ELSE (CASE WHEN s.slug = 'demo-pa-soberania-birds' THEN '11:00'::time WHEN s.slug = 'demo-pa-taboga-snorkel' THEN '17:00'::time WHEN s.slug = 'demo-pa-cerro-azul-trek' THEN '15:00'::time WHEN s.slug = 'demo-pa-chepo-rafting' THEN '16:00'::time WHEN s.slug = 'demo-pa-chepo-selva' THEN '15:00'::time WHEN s.slug = 'demo-pa-taboga-kayak' THEN '16:00'::time WHEN s.slug = 'demo-pa-bayano-cuevas' THEN '16:00'::time WHEN s.slug = 'demo-pa-soberania-pipeline' THEN '15:00'::time WHEN s.slug = 'demo-pa-contadora-islands' THEN '17:00'::time ELSE '17:00'::time END) END
    WHEN s.slug IN ('demo-pa-casco-sunset') THEN '23:00'::time
    WHEN s.slug IN ('demo-pa-metropolitan-yoga') THEN '09:00'::time
    WHEN s.slug IN ('demo-pa-cerro-azul-camping') THEN CASE WHEN days.day_num IN (5, 6) THEN '08:00'::time ELSE NULL END
    ELSE '17:00'::time 
  END,
  1,
  NOW(),
  NOW()
FROM public.services s
CROSS JOIN (SELECT GENERATE_SERIES(0, 6) AS day_num) days
WHERE s.slug LIKE 'demo-pa-%' 
  AND s.category_id = 'actividades'
  AND (s.slug NOT IN ('demo-pa-embera-artesanias', 'demo-pa-chepo-selva') OR days.day_num != 0)
  AND (s.slug NOT IN ('demo-pa-cerro-azul-camping') OR days.day_num IN (5, 6))
  AND CASE WHEN s.slug IN ('demo-pa-chepo-selva', 'demo-pa-chepo-rafting', 'demo-pa-taboga-snorkel', 'demo-pa-taboga-kayak', 'demo-pa-cerro-azul-trek', 'demo-pa-bayano-cuevas', 'demo-pa-soberania-birds', 'demo-pa-soberania-pipeline', 'demo-pa-contadora-islands') 
    THEN days.day_num != 0 ELSE TRUE END;

COMMIT;
