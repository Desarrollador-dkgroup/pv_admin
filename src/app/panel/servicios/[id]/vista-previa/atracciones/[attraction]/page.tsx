import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/public-service/gallery";
import { PreviewFrame } from "@/components/public-service/preview-frame";
import styles from "@/components/public-service/service.module.css";
import { getPanelIdentity } from "@/lib/panel-access";
import { getServiceDetailForPreview } from "@/lib/public-service/service-detail";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { IoCheckmarkCircleOutline } from "react-icons/io5";

// Vista previa de una parada del recorrido o atracción, igual que en la web.
export default async function AttractionPreviewPage({
  params,
}: {
  params: Promise<{ id: string; attraction: string }>;
}) {
  const { id, attraction: attractionKey } = await params;
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, business_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !service ||
    (role === "propietario" && !businessIds.includes(service.business_id))) notFound();

  const detail = await getServiceDetailForPreview(getSupabaseAdminClient(), id);
  const attractions = detail?.activity?.attractions ?? [];
  const index = attractions.findIndex((candidate, idx) =>
    (candidate.id ?? String(idx)) === attractionKey);
  const attraction = index >= 0 ? attractions[index] : undefined;
  if (!detail || !attraction) notFound();

  const photos = (attraction.photos ?? [])
    .map((photo) => photo.storage_path)
    .filter((url): url is string => Boolean(url));

  return (
    <>
      <Link className="button quiet" href={`/panel/servicios/${id}/vista-previa`}>
        ‹ Volver a la ficha
      </Link>
      <PreviewFrame>
        <div className={styles.screen}>
          <div className={styles.heroWrap}>
            <PhotoGallery photos={photos} className={styles.heroTall} />
          </div>
          <div className={styles.layout}>
            <div className={styles.sheet}>
              <h1 className={styles.name}>{attraction.name}</h1>
              {attraction.description && (
                <p className={styles.description}>{attraction.description}</p>
              )}
              {attraction.options.length > 0 && (
                <>
                  <div className={styles.divider} />
                  <section className={styles.section}>
                    <h2 className={styles.headingLarge}>Qué verás</h2>
                    <div className={styles.roomAmenities}>
                      {attraction.options.map((option) => (
                        <span key={option} className={styles.roomAmenity}>
                          <IoCheckmarkCircleOutline size={18} color="var(--indigo)" aria-hidden />
                          {option}
                        </span>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </PreviewFrame>
    </>
  );
}
