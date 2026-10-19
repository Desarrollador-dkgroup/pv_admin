-- Verifica el estado real de la migración 202610160001 antes de aplicarla.
-- Ejecutar en el SQL Editor del proyecto de Supabase. Solo lee datos.

-- 1. RLS activo en las tablas del panel. promotions debe aparecer como true.
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('promotions', 'blocked_users', 'profiles', 'business_members',
                  'platform_admins', 'tourist_sites', 'businesses')
ORDER BY relname;

-- 2. Políticas actuales de las tablas que toca la migración.
SELECT tablename, policyname, cmd, roles, permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('promotions', 'blocked_users', 'profiles', 'business_members')
ORDER BY tablename, policyname;

-- 3. Funciones auxiliares. Antes de la migración, las dos últimas no deben existir.
SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('padmin_is_platform_account', 'padmin_is_suspended',
                  'padmin_owns_business', 'padmin_can_manage_service',
                  'padmin_can_manage_providers', 'padmin_is_admin')
ORDER BY proname;

-- 4. Cuentas internas y suspensiones actuales (solo conteos).
SELECT platform_role, count(*) AS account_count
FROM public.platform_admins
GROUP BY platform_role
ORDER BY platform_role;

SELECT count(*) AS suspended_accounts FROM public.blocked_users;

-- 5. Promociones existentes, sin modificarlas.
SELECT count(*) AS promotions_total,
       count(*) FILTER (WHERE is_published) AS promotions_published,
       count(*) FILTER (WHERE proposed_by_business_id IS NOT NULL) AS proposed_by_business
FROM public.promotions;

-- 6. Cuentas de Auth sin perfil. Estas cuentas no aparecen con nombre en el panel.
SELECT count(*) AS auth_accounts_without_profile
FROM auth.users AS users
LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
WHERE profiles.id IS NULL;

-- 7. Columnas de profiles: debe existir email y no poder escribirse desde el navegador.
SELECT column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND grantee = 'authenticated'
ORDER BY column_name;
