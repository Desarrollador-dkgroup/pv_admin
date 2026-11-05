-- El propietario ya no edita la descripción del negocio: no se muestra en ningún lado.
-- La columna se conserva; la función solo cambia el nombre.
DROP FUNCTION IF EXISTS public.owner_update_business(uuid, text, text);

CREATE FUNCTION public.owner_update_business(p_business_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
      updated_at = now()
  WHERE id = p_business_id;
END;
$function$;
