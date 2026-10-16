-- Reemplaza los dos correos por los usuarios internos de Authentication.
-- Ejecuta esto después de la migración 202610150004.
-- Conserva todos los usuarios Auth, negocios y membresías de proveedores.
DO $$
DECLARE
  owner_user_id uuid;
  admin_user_id uuid;
BEGIN
  SELECT id INTO owner_user_id
  FROM auth.users
  WHERE email = 'CORREO_DEL_PROPIETARIO';

  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'CORREO_DEL_ADMIN';

  IF owner_user_id IS NULL OR admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Crea primero ambos usuarios en Authentication > Users.';
  END IF;

  IF owner_user_id = admin_user_id THEN
    RAISE EXCEPTION 'El Propietario y el Admin deben usar correos distintos.';
  END IF;

  DELETE FROM public.platform_admins;

  INSERT INTO public.platform_admins (user_id, platform_role, granted_by)
  VALUES (owner_user_id, 'owner', NULL);

  INSERT INTO public.platform_admins (user_id, platform_role, granted_by)
  VALUES (admin_user_id, 'admin', owner_user_id);
END;
$$;

-- Verifica que las dos cuentas queden asignadas con el rol esperado.
SELECT
  users.email,
  admins.platform_role
FROM public.platform_admins AS admins
JOIN auth.users AS users ON users.id = admins.user_id
WHERE admins.platform_role IN ('owner', 'admin')
ORDER BY admins.platform_role;
