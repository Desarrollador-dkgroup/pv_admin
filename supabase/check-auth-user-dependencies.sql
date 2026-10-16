-- Cuenta referencias que pueden impedir borrar usuarios de Supabase Auth.
-- Ejecutar antes de eliminar usuarios desde Authentication > Users.
SELECT
  (SELECT count(*) FROM auth.users) AS auth_user_count,
  (SELECT count(*) FROM public.platform_admins) AS platform_admin_count,
  (SELECT count(*) FROM public.business_members) AS business_membership_count,
  (SELECT count(*) FROM public.profiles) AS profile_count,
  (SELECT count(*) FROM public.reservations) AS reservation_count,
  (SELECT count(*) FROM public.reviews) AS review_count,
  (SELECT count(*) FROM public.review_reports) AS review_report_count,
  (SELECT count(*) FROM public.favorites) AS favorite_count,
  (SELECT count(*) FROM public.blocked_users) AS blocked_user_count;
