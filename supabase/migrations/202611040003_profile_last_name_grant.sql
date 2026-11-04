BEGIN;

-- Los permisos por columna no cubren las columnas nuevas: sin esto el apellido no se puede guardar.
GRANT UPDATE (last_name) ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
