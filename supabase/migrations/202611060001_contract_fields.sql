-- Datos del contrato que no tienen columna propia (plazos, tarifas, planes, jurisdicción, etc.).
-- Cada contrato guarda sus valores aquí; el generador los pide según la plantilla.
alter table public.business_contracts
  add column if not exists contract_fields jsonb not null default '{}'::jsonb;
