"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText, nullableText } from "@/lib/panel-form";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

// Un identificador de URL solo admite minúsculas, números y guiones.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Crea o actualiza un sitio turístico. Solo el propietario principal y los admins.
export async function saveTouristSiteAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Tu cuenta no puede administrar sitios." };

  const siteId = formText(formData, "site_id");
  const name = formText(formData, "name");
  const slug = formText(formData, "slug");
  const description = formText(formData, "description");
  const provinceId = formText(formData, "province_id");
  const sortOrder = Number(formText(formData, "sort_order") || "0");

  if (!name || !description) return { error: "Completa el nombre y la descripción del sitio." };
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "El identificador solo puede tener minúsculas, números y guiones." };
  }
  if (!provinceId) return { error: "Selecciona la provincia destino del sitio." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 32767) {
    return { error: "El orden debe ser un número entero positivo." };
  }

  const values = {
    name,
    slug,
    description,
    short_description: nullableText(formText(formData, "short_description")),
    province_id: provinceId,
    city_id: nullableText(formText(formData, "city_id")),
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  const result = siteId
    ? await supabase.from("tourist_sites").update(values).eq("id", siteId)
    : await supabase.from("tourist_sites").insert(values);
  if (result.error) {
    const duplicated = result.error.message.includes("duplicate");
    return {
      error: duplicated ? "Ya existe un sitio con ese identificador." : result.error.message,
    };
  }

  revalidatePath("/panel/sitios");
  revalidatePath("/panel");
  // Tras guardar, la misma pestaña vuelve al listado; redirect lanza una excepción esperada.
  redirect("/panel/sitios");
}
