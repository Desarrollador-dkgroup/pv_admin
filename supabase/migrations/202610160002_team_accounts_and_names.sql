-- Cuentas del equipo con correo visible, nombre editable y restricciones por rol.
-- Migración nueva e idempotente. Ejecutar después de 202610160001.
BEGIN;

-- 1. Correo visible en el perfil para buscar cuentas. Solo lo escribe el servidor.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (lower(email));

-- 2. Crea perfiles que falten y copia el correo de Auth a las cuentas existentes.
-- Solo esta migración (ejecutada desde el SQL Editor) puede leer auth.users.
INSERT INTO public.profiles (id, display_name, email)
SELECT
  users.id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    'Cuenta'
  ),
  users.email
FROM auth.users AS users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS profiles WHERE profiles.id = users.id
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles AS profiles
SET email = users.email
FROM auth.users AS users
WHERE users.id = profiles.id
  AND profiles.email IS DISTINCT FROM users.email;

-- 3. ¿La sesión actual puede cambiar el nombre visible de esta cuenta?
-- El propietario principal cambia cualquier nombre. El admin no cambia el de otro admin
-- ni el del propietario principal.
CREATE OR REPLACE FUNCTION public.padmin_can_edit_profile_name(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN public.padmin_current_platform_role() = 'owner' THEN true
    WHEN public.padmin_current_platform_role() = 'admin' THEN NOT EXISTS (
      SELECT 1
      FROM public.platform_admins AS admins
      WHERE admins.user_id = p_user_id
        AND admins.platform_role IN ('owner', 'admin')
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.padmin_can_edit_profile_name(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_can_edit_profile_name(uuid) TO authenticated;

-- 4. Política de escritura de nombres. El navegador solo puede cambiar columnas de uso
-- personal; el correo no se escribe desde el cliente.
DROP POLICY IF EXISTS padmin_profiles_name_update ON public.profiles;
CREATE POLICY padmin_profiles_name_update ON public.profiles
FOR UPDATE TO authenticated
USING (public.padmin_can_edit_profile_name(id))
WITH CHECK (public.padmin_can_edit_profile_name(id));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, phone, avatar_storage_path, updated_at)
  ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
