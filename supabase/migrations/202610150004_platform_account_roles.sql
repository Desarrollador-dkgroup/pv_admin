BEGIN;

-- Distingue al propietario principal, los admins y colaboradores internos.
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS platform_role text NOT NULL DEFAULT 'admin';

ALTER TABLE public.platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_platform_role_check;
ALTER TABLE public.platform_admins
  ADD CONSTRAINT platform_admins_platform_role_check
  CHECK (platform_role IN ('owner', 'admin', 'collaborator'));

-- Impide crear más de una cuenta de propietario principal.
CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_single_owner_idx
  ON public.platform_admins ((platform_role))
  WHERE platform_role = 'owner';

-- Devuelve el rol interno de la sesión sin activar recursión de RLS.
CREATE OR REPLACE FUNCTION public.padmin_current_platform_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT admins.platform_role
  FROM public.platform_admins AS admins
  WHERE admins.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- El equipo con control de catálogo se limita al propietario y los admins.
CREATE OR REPLACE FUNCTION public.padmin_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    public.padmin_current_platform_role() IN ('owner', 'admin'),
    false
  );
$$;

-- Los tres roles internos pueden administrar accesos de negocios proveedores.
CREATE OR REPLACE FUNCTION public.padmin_can_manage_providers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.padmin_current_platform_role()
    IN ('owner', 'admin', 'collaborator');
$$;

REVOKE ALL ON FUNCTION public.padmin_current_platform_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_can_manage_providers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_current_platform_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_can_manage_providers() TO authenticated;

-- La cuenta principal no se puede modificar ni eliminar desde la aplicación.
DROP POLICY IF EXISTS padmin_identity_admin_manage ON public.platform_admins;
DROP POLICY IF EXISTS padmin_identity_write_fence ON public.platform_admins;
DROP POLICY IF EXISTS padmin_identity_update_fence ON public.platform_admins;
DROP POLICY IF EXISTS padmin_identity_delete_fence ON public.platform_admins;

CREATE POLICY padmin_identity_insert_roles ON public.platform_admins
FOR INSERT TO authenticated
WITH CHECK (
  platform_role IN ('admin', 'collaborator')
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
);

CREATE POLICY padmin_identity_update_roles ON public.platform_admins
FOR UPDATE TO authenticated
USING (
  platform_role <> 'owner'
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
)
WITH CHECK (
  platform_role IN ('admin', 'collaborator')
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
);

CREATE POLICY padmin_identity_delete_roles ON public.platform_admins
FOR DELETE TO authenticated
USING (
  platform_role <> 'owner'
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
);

-- Colaboradores pueden trabajar con membresías de negocios, no con el catálogo.
DROP POLICY IF EXISTS padmin_membership_admin_manage ON public.business_members;
DROP POLICY IF EXISTS padmin_membership_write_fence ON public.business_members;
DROP POLICY IF EXISTS padmin_membership_update_fence ON public.business_members;
DROP POLICY IF EXISTS padmin_membership_delete_fence ON public.business_members;

CREATE POLICY padmin_membership_manage_roles ON public.business_members
FOR ALL TO authenticated
USING (public.padmin_can_manage_providers())
WITH CHECK (public.padmin_can_manage_providers());

CREATE POLICY padmin_membership_insert_fence ON public.business_members
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_can_manage_providers());
CREATE POLICY padmin_membership_update_fence ON public.business_members
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.padmin_can_manage_providers())
WITH CHECK (public.padmin_can_manage_providers());
CREATE POLICY padmin_membership_delete_fence ON public.business_members
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.padmin_can_manage_providers());

NOTIFY pgrst, 'reload schema';
COMMIT;
