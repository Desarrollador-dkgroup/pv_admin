BEGIN;

-- En hospedaje el descuento aplica a una habitación; en los demás servicios, al precio del servicio.
ALTER TABLE public.service_promotions
  ADD COLUMN room_type_id uuid REFERENCES public.room_types(id) ON DELETE CASCADE;

CREATE INDEX service_promotions_room_type_idx ON public.service_promotions(room_type_id);

NOTIFY pgrst, 'reload schema';
COMMIT;
