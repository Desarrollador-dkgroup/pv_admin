-- Horarios semanales y ubicación detallada para actividades.

BEGIN;

-- Tabla de horarios semanales para actividades (similar a restaurant_hours).
CREATE TABLE public.activity_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL
    REFERENCES public.services(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  position integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(service_id, day_of_week, opens_at, closes_at)
);

COMMENT ON TABLE public.activity_hours IS
  'Horarios por día de la semana para actividades. Permite múltiples turnos por día.';

-- Agregar columnas a activity_profiles para ubicación y configuración.
ALTER TABLE public.activity_profiles
  ADD COLUMN location_address_details text,
  ADD COLUMN has_multiple_shifts boolean DEFAULT false,
  ADD COLUMN maps_embed_url text,
  ADD COLUMN tourist_site_id uuid REFERENCES public.tourist_sites(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.activity_profiles.location_address_details IS
  'Dirección exacta o ubicación específica (ej: Altaplaza mall, 3er piso).';

COMMENT ON COLUMN public.activity_profiles.has_multiple_shifts IS
  'Indica si la actividad tiene múltiples turnos por día.';

NOTIFY pgrst, 'reload schema';
COMMIT;
