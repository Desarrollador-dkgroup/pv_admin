import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type PreviewOther = {
  title: string;
  imageUrl: string | null;
  desktopImageUrl: string | null;
};

// Los demás anuncios, en orden, para que la vista previa pueda cambiar entre ellos con flechas.
export async function loadOtherAdPreviews(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  excludeId: string | null,
): Promise<PreviewOther[]> {
  // La vista previa es secundaria: si no se puede cargar la lista, la página sigue sin ella.
  try {
    const { data, error } = await admin
      .from("ads")
      .select("id, title, image_path, desktop_image_path")
      .order("position");
    if (error || !data) return [];
    const url = (path: string | null): string | null => {
      if (!path) return null;
      return admin.storage.from("ads-media").getPublicUrl(path).data.publicUrl || null;
    };
    return data
      .filter((ad) => ad.id !== excludeId)
      .map((ad) => ({
        title: ad.title ?? "",
        imageUrl: url(ad.image_path),
        desktopImageUrl: url(ad.desktop_image_path) ?? url(ad.image_path),
      }));
  } catch {
    return [];
  }
}
