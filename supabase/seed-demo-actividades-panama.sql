-- Crear 20 actividades de demostración en Panamá
-- Vinculadas al negocio de prueba: b2996846-c6ec-43dc-ae69-192fcbf85d75

BEGIN;

WITH new_services AS (
  INSERT INTO public.services (
    name, slug, category_id, destination_province_id, description, search_description,
    base_price_cents, status, business_id, created_at, updated_at
  )
  VALUES
    ('Recorrido Interactivo Biomuseo', 'demo-pa-biomuseo-tour', 'actividades', 'Panamá', 'Exhibiciones interactivas sobre la historia natural del istmo.', 'Exhibiciones interactivas sobre la historia natural del istmo.', 3500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Taller de Conservación Marina', 'demo-pa-conservacion-marina', 'actividades', 'Panamá', 'Aprende sobre conservación marina participando en actividades educativas.', 'Aprende sobre conservación marina participando en actividades educativas.', 4000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Senderismo por Selva Tropical', 'demo-pa-chepo-selva', 'actividades', 'Panamá', 'Aventura guiada a través de la densa selva tropical.', 'Aventura guiada a través de la densa selva tropical.', 5000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Tour de Rafting en Río Gatún', 'demo-pa-chepo-rafting', 'actividades', 'Panamá', 'Descenso emocionante por rápidos moderados.', 'Descenso emocionante por rápidos moderados.', 6500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Tour Histórico Casco Viejo', 'demo-pa-casco-viejo-tour', 'actividades', 'Panamá', 'Recorrido guiado por calles coloniales e iglesias.', 'Recorrido guiado por calles coloniales e iglesias.', 3000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Sunset Drink Tour', 'demo-pa-casco-sunset', 'actividades', 'Panamá', 'Visita de bares con vista al atardecer.', 'Visita de bares con vista al atardecer.', 4500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Snorkel y Buceo en Arrecifes', 'demo-pa-taboga-snorkel', 'actividades', 'Panamá', 'Explora arrecifes coralinos y nada con peces tropicales.', 'Explora arrecifes coralinos y nada con peces tropicales.', 5500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Paseo en Kayak Costero', 'demo-pa-taboga-kayak', 'actividades', 'Panamá', 'Navegación en kayak por aguas cristalinas.', 'Navegación en kayak por aguas cristalinas.', 4000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Senderismo en Cerro Azul', 'demo-pa-cerro-azul-trek', 'actividades', 'Panamá', 'Caminata a la cima con vistas panorámicas.', 'Caminata a la cima con vistas panorámicas.', 3500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Camping en la Naturaleza', 'demo-pa-cerro-azul-camping', 'actividades', 'Panamá', 'Experiencia de camping nocturno con observación de estrellas.', 'Experiencia de camping nocturno con observación de estrellas.', 4500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Encuentro Cultural Emberá', 'demo-pa-embera-cultural', 'actividades', 'Panamá', 'Convive con la comunidad Emberá: danzas y artesanías.', 'Convive con la comunidad Emberá: danzas y artesanías.', 6000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Taller de Artesanías Emberá', 'demo-pa-embera-artesanias', 'actividades', 'Panamá', 'Elabora artesanías tradicionales con maestros locales.', 'Elabora artesanías tradicionales con maestros locales.', 5000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Birdwatching Profesional', 'demo-pa-soberania-birds', 'actividades', 'Panamá', 'Avistamiento de aves guiado por ornitólogos.', 'Avistamiento de aves guiado por ornitólogos.', 5500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Caminata Pipeline Road', 'demo-pa-soberania-pipeline', 'actividades', 'Panamá', 'Recorrido por la famosa Pipeline Road.', 'Recorrido por la famosa Pipeline Road.', 4000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Exploración de Cuevas Subterráneas', 'demo-pa-bayano-cuevas', 'actividades', 'Panamá', 'Descubre cavernas y ríos subterráneos.', 'Descubre cavernas y ríos subterráneos.', 5500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Sendero Bosque Nublado', 'demo-pa-metropolitan-cloud', 'actividades', 'Panamá', 'Caminata por bosque nublado con cascadas.', 'Caminata por bosque nublado con cascadas.', 3000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Yoga y Meditación en la Naturaleza', 'demo-pa-metropolitan-yoga', 'actividades', 'Panamá', 'Sesión de yoga rodeada de naturaleza virgen.', 'Sesión de yoga rodeada de naturaleza virgen.', 3500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Tour Arqueológico Panamá Viejo', 'demo-pa-panama-viejo-tour', 'actividades', 'Panamá', 'Explora ruinas de la primera ciudad de Panamá.', 'Explora ruinas de la primera ciudad de Panamá.', 3500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Paseo en Bicicleta Calzada de Amador', 'demo-pa-amador-biking', 'actividades', 'Panamá', 'Recorrido en bici con vistas al skyline.', 'Recorrido en bici con vistas al skyline.', 4000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Isla Hopping en las Perlas', 'demo-pa-contadora-islands', 'actividades', 'Panamá', 'Visita múltiples islas con playas vírgenes.', 'Visita múltiples islas con playas vírgenes.', 7000, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW())
  RETURNING id, slug, name
)
INSERT INTO public.activity_profiles (
  service_id, details, location_address_details, has_multiple_shifts, created_at, updated_at
)
SELECT
  ns.id,
  jsonb_build_object(
    'schedule', '{}'::jsonb,
    'min_age', CASE
      WHEN ns.slug IN ('demo-pa-conservacion-marina', 'demo-pa-chepo-rafting', 'demo-pa-taboga-snorkel', 'demo-pa-bayano-cuevas') THEN 10
      WHEN ns.slug IN ('demo-pa-embera-cultural', 'demo-pa-metropolitan-yoga', 'demo-pa-casco-sunset') THEN 16
      WHEN ns.slug IN ('demo-pa-cerro-azul-camping', 'demo-pa-soberania-birds') THEN 8
      ELSE 5 END,
    'what_includes', '[]'::jsonb,
    'attractions', '[]'::jsonb
  ),
  CASE
    WHEN ns.slug = 'demo-pa-biomuseo-tour' THEN 'Avenida Amador, lado Pacifico'
    WHEN ns.slug = 'demo-pa-conservacion-marina' THEN 'Edificio principal, segundo piso'
    WHEN ns.slug = 'demo-pa-chepo-selva' THEN 'Estación de Guardaparques'
    WHEN ns.slug = 'demo-pa-chepo-rafting' THEN 'Puerto de Gatún, muelle principal'
    WHEN ns.slug = 'demo-pa-casco-viejo-tour' THEN 'Parque Bolívar'
    WHEN ns.slug = 'demo-pa-casco-sunset' THEN 'Calle Primera, frente al malecón'
    WHEN ns.slug = 'demo-pa-taboga-snorkel' THEN 'Playa La Restinga'
    WHEN ns.slug = 'demo-pa-taboga-kayak' THEN 'Muelle de Isla Taboga'
    WHEN ns.slug = 'demo-pa-cerro-azul-trek' THEN 'Entrada principal Cerro Azul'
    WHEN ns.slug = 'demo-pa-cerro-azul-camping' THEN 'Campamento base'
    WHEN ns.slug = 'demo-pa-embera-cultural' THEN 'Comunidad Emberá Druá'
    WHEN ns.slug = 'demo-pa-embera-artesanias' THEN 'Casa comunitaria'
    WHEN ns.slug = 'demo-pa-soberania-birds' THEN 'Entrada Pipeline Road'
    WHEN ns.slug = 'demo-pa-soberania-pipeline' THEN 'Pipeline Road km 0'
    WHEN ns.slug = 'demo-pa-bayano-cuevas' THEN 'Entrada Cuevas de Bayano'
    WHEN ns.slug = 'demo-pa-metropolitan-cloud' THEN 'Parque Metropolitano'
    WHEN ns.slug = 'demo-pa-metropolitan-yoga' THEN 'Zona de meditación'
    WHEN ns.slug = 'demo-pa-panama-viejo-tour' THEN 'Centro visitantes'
    WHEN ns.slug = 'demo-pa-amador-biking' THEN 'Centro de bicicletas'
    WHEN ns.slug = 'demo-pa-contadora-islands' THEN 'Muelle Isla Contadora'
    ELSE 'Ubicación a confirmar'
  END,
  true,
  NOW(),
  NOW()
FROM new_services ns;

-- Crear horarios básicos (lunes a domingo, 09:00-17:00)
INSERT INTO public.activity_hours (service_id, day_of_week, opens_at, closes_at, position, created_at, updated_at)
SELECT
  s.id,
  day_num,
  '09:00'::time,
  '17:00'::time,
  1,
  NOW(),
  NOW()
FROM public.services s
CROSS JOIN (SELECT GENERATE_SERIES(0, 6) AS day_num) days
WHERE s.slug LIKE 'demo-pa-%' AND s.category_id = 'actividades';

COMMIT;
