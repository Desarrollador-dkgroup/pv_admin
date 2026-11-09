-- Imagen de escritorio y tablet para los anuncios (780 × 1688, misma proporción que el celular).
-- Los anuncios anteriores quedan sin imagen de escritorio: la web usa la de celular.
alter table public.ads add column if not exists desktop_image_path text;
alter table public.ad_requests add column if not exists desktop_image_path text;
