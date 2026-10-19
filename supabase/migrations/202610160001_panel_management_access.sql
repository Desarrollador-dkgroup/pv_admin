-- Permisos del panel para negocios, propietarios, sitios, promociones y revisión.
-- Migración nueva e idempotente. No borra datos ni vuelve a ejecutar migraciones previas.
-- Revisar primero supabase/verify-panel-management.sql y luego ejecutar este archivo.
BEGIN;

-- Indica si una cuenta pertenece al equipo interno (owner, admin o collaborator).
CREATE OR REPLACE FUNCTION public.padmin_is_platform_account(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins AS admins
    WHERE admins.user_id = p_user_id
  );
$$;

-- Indica si la sesión actual está suspendida por el equipo.
CREATE OR REPLACE FUNCTION public.padmin_is_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_users AS blocked
    WHERE blocked.user_id = (SELECT auth.uid())
  );
$$;

-- Una cuenta suspendida pierde la escritura sobre los negocios que administra.
CREATE OR REPLACE FUNCTION public.padmin_owns_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members AS members
    WHERE members.business_id = p_business_id
      AND members.user_id = (SELECT auth.uid())
      AND members.role IN ('owner', 'staff')
  )
  AND NOT public.padmin_is_suspended();
$$;

-- Aplica la misma regla de suspensión a la gestión de servicios.
CREATE OR REPLACE FUNCTION public.padmin_can_manage_service(p_service_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.padmin_is_admin()
    OR (
      NOT public.padmin_is_suspended()
      AND EXISTS (
        SELECT 1
        FROM public.services AS services
        JOIN public.business_members AS members
          ON members.business_id = services.business_id
        WHERE services.id = p_service_id
          AND members.user_id = (SELECT auth.uid())
          AND members.role IN ('owner', 'staff')
      )
    );
$$;

-- La aplicación consulta estas funciones mediante RPC; solo sesiones autenticadas pueden usarlas.
REVOKE ALL ON FUNCTION public.padmin_is_platform_account(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_is_suspended() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_is_platform_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_is_suspended() TO authenticated;

-- Los miembros de un negocio pueden ver a los demás miembros de su mismo negocio.
DROP POLICY IF EXISTS padmin_membership_business_read ON public.business_members;
CREATE POLICY padmin_membership_business_read ON public.business_members
FOR SELECT TO authenticated
USING (public.padmin_owns_business(business_id));

-- Nombres visibles para el equipo al asignar propietarios y mostrar listas.
DROP POLICY IF EXISTS padmin_profiles_staff_read ON public.profiles;
CREATE POLICY padmin_profiles_staff_read ON public.profiles
FOR SELECT TO authenticated
USING (public.padmin_can_manage_providers());

-- Suspensiones: el equipo con control de propietarios puede suspender y reactivar,
-- pero nunca a una cuenta interna ni a sí mismo. La cuenta suspendida se ve a sí misma.
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;

DROP POLICY IF EXISTS padmin_blocked_read ON public.blocked_users;
CREATE POLICY padmin_blocked_read ON public.blocked_users
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.padmin_can_manage_providers()
);

DROP POLICY IF EXISTS padmin_blocked_manage ON public.blocked_users;
CREATE POLICY padmin_blocked_manage ON public.blocked_users
FOR ALL TO authenticated
USING (
  public.padmin_can_manage_providers()
  AND NOT public.padmin_is_platform_account(user_id)
)
WITH CHECK (
  public.padmin_can_manage_providers()
  AND NOT public.padmin_is_platform_account(user_id)
  AND user_id <> (SELECT auth.uid())
  AND blocked_by = (SELECT auth.uid())
);

-- Promociones: solo el propietario principal y los admins las administran.
-- Los negocios ven únicamente las promociones que propusieron o que apuntan a sus servicios.
-- Esta migración no activa RLS en promotions: verificarlo antes con la consulta de control.
DROP POLICY IF EXISTS padmin_promotion_admin_manage ON public.promotions;
CREATE POLICY padmin_promotion_admin_manage ON public.promotions
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());

DROP POLICY IF EXISTS padmin_promotion_owner_read ON public.promotions;
CREATE POLICY padmin_promotion_owner_read ON public.promotions
FOR SELECT TO authenticated
USING (
  (proposed_by_business_id IS NOT NULL
    AND public.padmin_owns_business(proposed_by_business_id))
  OR (destination_service_id IS NOT NULL
    AND public.padmin_can_manage_service(destination_service_id))
);

NOTIFY pgrst, 'reload schema';
COMMIT;
