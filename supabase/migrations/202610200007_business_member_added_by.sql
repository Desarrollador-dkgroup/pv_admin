-- Cada perfil adicional guarda quién lo agregó. El propietario principal no tiene quien
-- lo agregó (added_by nulo). Solo el principal puede quitar perfiles adicionales.
-- Idempotente: se puede volver a ejecutar.
BEGIN;

ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;
