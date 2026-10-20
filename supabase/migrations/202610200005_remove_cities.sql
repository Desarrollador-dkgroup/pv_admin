-- Elimina las ciudades. Los destinos son provincias y sitios turísticos;
-- los negocios y servicios se asocian a un sitio turístico, no a una ciudad.
-- Idempotente: se puede volver a ejecutar sin romper datos existentes.

-- 1. Promociones que apuntaban a una ciudad pasan a la provincia de esa ciudad.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'promotions'
      AND column_name = 'destination_city_id'
  ) THEN
    UPDATE public.promotions AS p
    SET destination_kind = 'province',
        destination_province_id = c.province_id,
        destination_city_id = NULL
    FROM public.cities AS c
    WHERE p.destination_kind = 'city'
      AND c.id = p.destination_city_id;
  END IF;
END $$;

ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_destination_kind_check;
ALTER TABLE public.promotions DROP COLUMN IF EXISTS destination_city_id;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_destination_kind_check
  CHECK (destination_kind IN ('service', 'province', 'category'));

-- 2. Negocios y servicios dejan de guardar ciudad.
ALTER TABLE public.businesses DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.services DROP COLUMN IF EXISTS city_id;

-- 3. El propietario edita nombre y descripción de su negocio (sin ciudad).
DROP FUNCTION IF EXISTS public.owner_update_business(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.owner_update_business(
  p_business_id uuid,
  p_name text,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.business_members AS members
    WHERE members.business_id = p_business_id
      AND members.user_id = (SELECT auth.uid())
      AND members.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para editar este negocio.';
  END IF;

  IF public.padmin_is_suspended() THEN
    RAISE EXCEPTION 'Tu cuenta está suspendida.';
  END IF;

  IF btrim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'El nombre del negocio es obligatorio.';
  END IF;

  UPDATE public.businesses
  SET name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      updated_at = now()
  WHERE id = p_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_update_business(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_business(uuid, text, text) TO authenticated;

-- 4. Se elimina la tabla de ciudades. Si falla, todavía hay una tabla que la referencia.
DROP TABLE IF EXISTS public.cities;
