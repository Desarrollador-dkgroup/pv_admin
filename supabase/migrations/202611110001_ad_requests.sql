-- Solicitudes de anuncio que hacen los propietarios. El equipo las gestiona y, al final,
-- el administrador crea el anuncio real (tabla ads).
CREATE TABLE public.ad_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  image_path text NOT NULL,
  service_promotion_id uuid REFERENCES public.service_promotions(id) ON DELETE SET NULL,
  starts_on date,
  ends_on date,
  notes text,
  status text NOT NULL DEFAULT 'solicitado' CHECK (
    status IN ('solicitado', 'en_gestion', 'documento_listo', 'publicado', 'rechazado')
  ),
  document_path text,
  rejection_reason text,
  ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

-- El propietario ve las solicitudes de su negocio; el equipo ve todas.
CREATE POLICY ad_requests_read ON public.ad_requests
FOR SELECT TO authenticated
USING (
  public.padmin_can_manage_providers()
  OR public.is_business_member(auth.uid(), business_id)
);

-- El propietario solo crea solicitudes para su propio negocio, a su nombre.
CREATE POLICY ad_requests_insert ON public.ad_requests
FOR INSERT TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND public.is_business_member(auth.uid(), business_id)
  AND status = 'solicitado'
);

-- Solo el equipo cambia el estado, sube el documento y vincula el anuncio.
CREATE POLICY ad_requests_staff_update ON public.ad_requests
FOR UPDATE TO authenticated
USING (public.padmin_can_manage_providers())
WITH CHECK (public.padmin_can_manage_providers());

GRANT SELECT, INSERT, UPDATE ON public.ad_requests TO authenticated;
