import { SITE_IMAGE_BUCKET, siteImageExtension } from "@/lib/panel-sites";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// Sube las fotos en orden a la carpeta del sitio y devuelve sus URL públicas. Si una falla,
// se detiene y devuelve las que sí subieron junto con el error para mostrarlo.
export async function uploadSitePhotos(
  files: File[],
  folder: string,
): Promise<{ uploaded: string[]; error: string }> {
  const supabase = getSupabaseBrowserClient();
  const uploaded: string[] = [];
  for (const file of files) {
    const path = `${folder}/${crypto.randomUUID()}.${siteImageExtension(file.type)}`;
    const { error } = await supabase.storage
      .from(SITE_IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { uploaded, error: `No se pudo subir «${file.name}». Intenta de nuevo.` };
    uploaded.push(supabase.storage.from(SITE_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return { uploaded, error: "" };
}
