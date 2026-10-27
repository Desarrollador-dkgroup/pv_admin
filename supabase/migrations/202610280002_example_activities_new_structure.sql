-- Crear 2 ejemplos de actividades con nueva estructura (atracciones con opciones)
-- Vinculadas al negocio de prueba: b2996846-c6ec-43dc-ae69-192fcbf85d75

BEGIN;

WITH new_services AS (
  INSERT INTO public.services (
    name, slug, category_id, destination_province_id, description, search_description,
    base_price_cents, status, business_id, created_at, updated_at
  )
  VALUES
    ('Senderismo en Cerro Jefe con Cascadas', 'example-cerro-jefe-hiking', 'actividades', 'Panamá',
     'Aventura guiada a través de exuberante bosque tropical hacia cascadas cristalinas. Ideal para amantes de la naturaleza y aventura moderada.',
     'Senderismo en Cerro Jefe con visita a cascadas, guía profesional, equipo de aventura incluido.',
     6500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW()),
    ('Tour Gastronómico Panamá City', 'example-panama-city-food-tour', 'actividades', 'Panamá',
     'Recorrido culinario por restaurantes y mercados locales. Prueba autentican sabores panameños y aprende de la gastronomía local.',
     'Tour gastronómico en Panamá City visitando mercados, restaurantes y bares típicos con degustaciones.',
     5500, 'draft', 'b2996846-c6ec-43dc-ae69-192fcbf85d75', NOW(), NOW())
  RETURNING id, slug, name
)
INSERT INTO public.activity_profiles (
  service_id, details, location_address_details, has_multiple_shifts, created_at, updated_at
)
SELECT
  ns.id,
  CASE
    WHEN ns.slug = 'example-cerro-jefe-hiking' THEN
      jsonb_build_object(
        'description', 'Explora el Cerro Jefe, la montaña más alta de la Provincia de Panamá, a través de un sendero bien marcado en medio de la selva tropical. Durante el recorrido visitarás cascadas naturales, avistará aves y aprenderás sobre flora local.',
        'whatIncludes', jsonb_build_array(
          'Guía profesional bilingüe',
          'Equipo de senderismo (mochilas, bastones)',
          'Almuerzo típico panameño',
          'Agua y refrigerios',
          'Transporte desde punto de encuentro',
          'Fotos profesionales del tour'
        ),
        'schedule', jsonb_build_object(
          'lunes', '07:00',
          'martes', '07:00',
          'miércoles', '07:00',
          'jueves', '07:00',
          'viernes', '07:00',
          'sábado', '06:00',
          'domingo', '06:00'
        ),
        'minAge', 8,
        'attractions', jsonb_build_array(
          jsonb_build_object(
            'name', 'Cascada Principal de Cerro Jefe',
            'description', 'Imponente cascada de agua cristalina que cae sobre piscinas naturales. Ideal para nadar y refrescarse tras la caminata. El agua proviene de fuentes subterráneas puras.',
            'options', jsonb_build_array(
              'Baño en la piscina natural',
              'Foto con la cascada de fondo',
              'Snorkel en aguas claras',
              'Pícnic a la orilla'
            ),
            'photos', jsonb_build_array()
          ),
          jsonb_build_object(
            'name', 'Mirador de la Selva Tropical',
            'description', 'Punto de observación estratégico con vistas panorámicas de kilómetros de selva intacta. Óptimo para avistamiento de aves, venados y otros animales en su hábitat natural.',
            'options', jsonb_build_array(
              'Observación de aves con binoculares',
              'Fotografía de fauna',
              'Breve sesión de meditación',
              'Explicación de ecosistema local'
            ),
            'photos', jsonb_build_array()
          )
        )
      )
    ELSE
      jsonb_build_object(
        'description', 'Sumérgete en la cultura culinaria de Panamá visitando el mercado de San Felipe, restaurantes típicos y bares frecuentados por locales. Aprenderá sobre ingredientes autóctonos y tradiciones gastronómicas milenarias.',
        'whatIncludes', jsonb_build_array(
          'Guía gastronómico local',
          '6 degustaciones incluyendo ceviche, sancocho y postres criollos',
          'Bebidas panameñas tradicionales',
          'Visita a mercado público y restaurante local',
          'Propinas de guía incluidas',
          'Recetas de platos típicos impresas'
        ),
        'schedule', jsonb_build_object(
          'lunes', '10:00',
          'martes', '10:00',
          'miércoles', '10:00',
          'jueves', '10:00',
          'viernes', '10:00',
          'sábado', '09:00',
          'domingo', '09:00'
        ),
        'minAge', 12,
        'attractions', jsonb_build_array(
          jsonb_build_object(
            'name', 'Mercado de San Felipe',
            'description', 'Mercado público tradicional donde se venden ingredientes frescos, especias y productos locales. Centro neurálgico de la gastronomía panameña con más de 100 años de historia.',
            'options', jsonb_build_array(
              'Degustación de frutas tropicales frescas',
              'Compra de especias típicas',
              'Conversación con vendedores locales',
              'Fotos con vendedores'
            ),
            'photos', jsonb_build_array()
          ),
          jsonb_build_object(
            'name', 'Restaurante de Comida Criolla',
            'description', 'Establecimiento familiar que ha servido recetas tradicionales panameñas durante generaciones. Menú variado con platos como sancocho, ropa vieja, tamales y dulce de leche.',
            'options', jsonb_build_array(
              'Degustación de 3 platos principales',
              'Postre típico panameño',
              'Bebida refrescante local (horchata o chicha)',
              'Charla del chef sobre recetas'
            ),
            'photos', jsonb_build_array()
          ),
          jsonb_build_object(
            'name', 'Bar Tradicional "La Cantina"',
            'description', 'Auténtico bar de barrio donde se reúnen locales y turistas. Ambiente relajado con música en vivo ocasional, cócteles criollos y bocaditos tradicionales.',
            'options', jsonb_build_array(
              'Cóctel panameño artesanal (Panama Seco o Daiquirí)',
              'Camarones al ajillo',
              'Música en vivo (cuando disponible)',
              'Conversación con clientes locales'
            ),
            'photos', jsonb_build_array()
          )
        )
      )
  END as details,
  CASE
    WHEN ns.slug = 'example-cerro-jefe-hiking' THEN 'Inicio de camino a Cerro Jefe, Chepo'
    ELSE 'Mercado de San Felipe, Avenida Central, Panamá City'
  END,
  false,
  NOW(),
  NOW()
FROM new_services ns;

COMMIT;
