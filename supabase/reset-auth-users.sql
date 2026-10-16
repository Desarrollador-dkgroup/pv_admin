-- Restablece usuarios Auth sin borrar reservas, reseñas, reportes ni favoritos.
-- Ejecutar solo si se desea borrar todas las cuentas, incluidos clientes.
BEGIN;

DO $$
DECLARE
  reservation_count bigint;
  review_count bigint;
  report_count bigint;
  favorite_count bigint;
BEGIN
  SELECT count(*) INTO reservation_count FROM public.reservations;
  SELECT count(*) INTO review_count FROM public.reviews;
  SELECT count(*) INTO report_count FROM public.review_reports;
  SELECT count(*) INTO favorite_count FROM public.favorites;

  IF reservation_count + review_count + report_count + favorite_count > 0 THEN
    RAISE EXCEPTION
      'Reinicio cancelado: hay reservas, reseñas, reportes o favoritos asociados.';
  END IF;
END;
$$;

-- Quita asignaciones y perfiles que tienen una FK directa a auth.users.
DELETE FROM public.business_members;
DELETE FROM public.platform_admins;
DELETE FROM public.blocked_users;
DELETE FROM public.profiles;

-- Una FK adicional desconocida fallará y revertirá la transacción completa.
DELETE FROM auth.users;

COMMIT;
