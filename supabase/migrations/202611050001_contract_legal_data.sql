-- Datos legales y vigencia del contrato (rediseño del generador de contratos).
-- Aditiva: todas las columnas admiten nulos, así que los contratos existentes no cambian.
ALTER TABLE public.business_contracts
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS legal_representative text,
  ADD COLUMN IF NOT EXISTS legal_address text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS starts_on date,
  ADD COLUMN IF NOT EXISTS ends_on date,
  ADD CONSTRAINT business_contracts_term_order CHECK (
    starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on
  );
