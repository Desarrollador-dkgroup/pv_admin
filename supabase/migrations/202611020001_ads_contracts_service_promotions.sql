BEGIN;

-- El sistema anterior de promociones del equipo se reemplaza por promociones de servicio.
DELETE FROM public.promotions;

-- Contrato por negocio: define la comisión, el límite de descuento y el tope acordados.
CREATE TABLE public.business_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'signed')),
  template_body text NOT NULL DEFAULT '',
  base_commission_pct numeric(5,2) NOT NULL CHECK (base_commission_pct >= 0 AND base_commission_pct < 100),
  discount_limit_pct numeric(5,2) NOT NULL CHECK (discount_limit_pct >= 0 AND discount_limit_pct < 100),
  target_profit_cents bigint NOT NULL CHECK (target_profit_cents >= 0),
  commission_cap_pct numeric(5,2) NOT NULL CHECK (
    commission_cap_pct >= base_commission_pct AND commission_cap_pct < 100
  ),
  signed_pdf_path text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'signed') = (signed_pdf_path IS NOT NULL))
);

ALTER TABLE public.business_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_contracts_member_read ON public.business_contracts
FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR is_business_member(auth.uid(), business_id)
);

CREATE POLICY business_contracts_admin_write ON public.business_contracts
FOR ALL TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_contracts TO authenticated;

-- Promociones de servicio creadas por el propietario. Heredan la ubicación del servicio.
CREATE TABLE public.service_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  discount_pct numeric(5,2) NOT NULL CHECK (discount_pct > 0 AND discount_pct < 100),
  schedule_mode text NOT NULL CHECK (schedule_mode IN ('range', 'weekdays')),
  starts_on date,
  ends_on date,
  weekdays smallint[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (schedule_mode = 'range' AND starts_on IS NOT NULL AND ends_on IS NOT NULL AND ends_on >= starts_on)
    OR (
      schedule_mode = 'weekdays'
      AND cardinality(weekdays) > 0
      AND weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
    )
  )
);

CREATE INDEX service_promotions_service_idx ON public.service_promotions(service_id);

ALTER TABLE public.service_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_promotions_public_read ON public.service_promotions
FOR SELECT TO anon, authenticated
USING (
  is_active
  AND EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_promotions.service_id AND s.status = 'published'
  )
);

CREATE POLICY service_promotions_manage ON public.service_promotions
FOR ALL TO authenticated
USING (padmin_can_manage_service(service_id))
WITH CHECK (padmin_can_manage_service(service_id));

GRANT SELECT ON public.service_promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_promotions TO authenticated;

-- Anuncios de la página principal, administrados por el equipo y ordenables.
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_path text NOT NULL,
  service_promotion_id uuid REFERENCES public.service_promotions(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_on date,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX ads_position_idx ON public.ads(position);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY ads_public_read ON public.ads
FOR SELECT TO anon, authenticated
USING (
  is_active
  AND (starts_on IS NULL OR starts_on <= current_date)
  AND (ends_on IS NULL OR ends_on >= current_date)
);

CREATE POLICY ads_admin_write ON public.ads
FOR ALL TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

GRANT SELECT ON public.ads TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ads TO authenticated;

-- Imágenes de anuncios (públicas) y copias de contratos firmados (privadas).
INSERT INTO storage.buckets (id, name, public)
VALUES ('ads-media', 'ads-media', true), ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
