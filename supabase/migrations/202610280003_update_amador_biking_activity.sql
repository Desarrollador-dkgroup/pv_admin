-- Actualizar la actividad "Paseo en Bicicleta Calzada de Amador" con datos completos
-- Incluye horarios, qué incluye, atracciones y ubicación exacta.

BEGIN;

-- Actualizar activity_profiles con detalles completos
UPDATE public.activity_profiles
SET details = jsonb_build_object(
  'schedule', jsonb_build_object(
    'lunes', jsonb_build_object('start', '08:00', 'end', '18:00'),
    'martes', jsonb_build_object('start', '08:00', 'end', '18:00'),
    'miércoles', jsonb_build_object('start', '08:00', 'end', '18:00'),
    'jueves', jsonb_build_object('start', '08:00', 'end', '18:00'),
    'viernes', jsonb_build_object('start', '08:00', 'end', '18:00'),
    'sábado', jsonb_build_object('start', '07:00', 'end', '19:00'),
    'domingo', jsonb_build_object('start', '07:00', 'end', '19:00')
  ),
  'minAge', 8,
  'whatIncludes', jsonb_build_array(
    'Bicicleta de montaña de calidad',
    'Casco de seguridad certificado',
    'Guía profesional bilingüe',
    'Agua y refrigerios',
    'Seguro de accidente incluido',
    'Fotos de recuerdo'
  ),
  'attractions', jsonb_build_array(
    jsonb_build_object(
      'id', 'attr-1',
      'name', 'La Calzada con Vistas al Skyline',
      'description', 'Recorrido emblemático de Panamá City. Paseo de 5.4 km con vistas panorámicas de la bahía y el skyline. Excelente punto para fotos y disfrutar del atardecer.',
      'options', jsonb_build_array(
        'Parada fotográfica en mirador',
        'Descanso en área verde',
        'Información sobre historia de Panamá',
        'Avistamiento de aves locales'
      ),
      'photos', jsonb_build_array()
    ),
    jsonb_build_object(
      'id', 'attr-2',
      'name', 'Causeway Bridge - Puente de las Américas',
      'description', 'Espectacular puente que cruza el Océano Pacífico, conectando Panamá City con las islas Naos. Vistas increíbles de barcos y océano.',
      'options', jsonb_build_array(
        'Parada en mirador principal',
        'Foto con el puente de fondo',
        'Observación de barcos en el canal',
        'Información sobre el Canal de Panamá'
      ),
      'photos', jsonb_build_array()
    ),
    jsonb_build_object(
      'id', 'attr-3',
      'name', 'Isla Naos - Museo de Biodiversidad',
      'description', 'Isla artificial con arquitectura única diseñada por Frank Gehry. Centro de investigación marina y museo dedicado a la biodiversidad marina tropical.',
      'options', jsonb_build_array(
        'Parada en la isla',
        'Acceso a vista del museo',
        'Observación de flora marina',
        'Punto de descanso con agua dulce'
      ),
      'photos', jsonb_build_array()
    )
  )
),
location_address_details = 'Inicio: Avenida Balboa (Calzada de Amador), Panamá City. Entrada Sur del parque público "Causeway Park". Estacionamiento disponible.',
has_multiple_shifts = false,
updated_at = NOW()
WHERE service_id IN (
  SELECT id FROM public.services
  WHERE name ILIKE '%Paseo en Bicicleta Calzada de Amador%'
    AND category_id = 'actividades'
);

-- Agregar horarios a activity_hours para cada día de la semana
INSERT INTO public.activity_hours (
  service_id, day_of_week, opens_at, closes_at, position, created_at, updated_at
)
SELECT s.id, days.day_of_week, days.opens_at, days.closes_at, days.position, NOW(), NOW()
FROM public.services s
JOIN (
  VALUES
    (1, '08:00:00'::time, '18:00:00'::time, 0),  -- Lunes
    (2, '08:00:00'::time, '18:00:00'::time, 0),  -- Martes
    (3, '08:00:00'::time, '18:00:00'::time, 0),  -- Miércoles
    (4, '08:00:00'::time, '18:00:00'::time, 0),  -- Jueves
    (5, '08:00:00'::time, '18:00:00'::time, 0),  -- Viernes
    (6, '07:00:00'::time, '19:00:00'::time, 0),  -- Sábado
    (0, '07:00:00'::time, '19:00:00'::time, 0)   -- Domingo
) AS days(day_of_week, opens_at, closes_at, position)
WHERE s.name ILIKE '%Paseo en Bicicleta Calzada de Amador%'
  AND s.category_id = 'actividades'
ON CONFLICT (service_id, day_of_week, opens_at, closes_at) DO NOTHING;

-- Actualizar location_address_details si aún no está completo
UPDATE public.activity_profiles
SET location_address_details = 'Inicio: Avenida Balboa (Calzada de Amador), Panamá City. Entrada Sur del parque público "Causeway Park". Estacionamiento disponible.'
WHERE location_address_details IS NULL
  AND service_id IN (
    SELECT id FROM public.services
    WHERE name ILIKE '%Paseo en Bicicleta Calzada de Amador%'
      AND category_id = 'actividades'
  );

NOTIFY pgrst, 'reload schema';
COMMIT;
