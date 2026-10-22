"use client";

import { useState } from "react";
import { Button, Panel } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type Dish = {
  id: string;
  section_id: string;
  name: string;
  description: string;
  price_cents: number;
  position: number;
  is_available: boolean;
  ingredients: string | null;
  allergens: string[];
  dietary_tags: string[];
};

export type MenuSection = {
  id: string;
  title: string;
  position: number;
  dishes: Dish[];
};

// Administra secciones y productos sin fotografías individuales.
export function RestaurantMenuManager({
  serviceId,
  initialSections,
}: {
  serviceId: string;
  initialSections: MenuSection[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [sectionId, setSectionId] = useState(initialSections[0]?.id ?? "");
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = getSupabaseBrowserClient();

  async function addSection(formData: FormData) {
    setBusy(true);
    setError("");
    const title = stringValue(formData, "section_title");
    const { data, error: failure } = await supabase
      .from("menu_sections")
      .insert({ service_id: serviceId, title, position: sections.length })
      .select("id, title, position")
      .single();
    if (failure) setError(failure.message);
    else {
      const section = { ...data, dishes: [] };
      setSections((current) => [...current, section]);
      setSectionId(section.id);
    }
    setBusy(false);
  }

  async function renameSection(formData: FormData) {
    const selected = sections.find((section) => section.id === renamingSectionId);
    const title = stringValue(formData, "section_title");
    if (!selected || !title) return;
    setBusy(true);
    setError("");
    const { data, error: failure } = await supabase
      .from("menu_sections")
      .update({ title })
      .eq("id", selected.id)
      .eq("service_id", serviceId)
      .select("id, title")
      .single();
    if (failure || !data) setError(failure?.message ?? "No se pudo cambiar el nombre.");
    else {
      setSections((current) => current.map((section) =>
        section.id === data.id ? { ...section, title: data.title } : section));
      setRenamingSectionId(null);
    }
    setBusy(false);
  }

  async function deleteEmptySection(section: MenuSection) {
    if (section.dishes.length) {
      setError("Primero elimina los platos de esta sección.");
      return;
    }
    if (!window.confirm(`¿Eliminar la sección «${section.title}»?`)) return;
    setBusy(true);
    setError("");
    // Vuelve a comprobar el contenido en la base antes de solicitar el borrado.
    const { data: dishes, error: checkError } = await supabase
      .from("menu_dishes")
      .select("id")
      .eq("section_id", section.id)
      .limit(1);
    if (checkError || dishes?.length) {
      setError(checkError?.message ?? "La sección ya contiene platos; actualiza la página.");
      setBusy(false);
      return;
    }
    const { data, error: failure } = await supabase
      .from("menu_sections")
      .delete()
      .eq("id", section.id)
      .eq("service_id", serviceId)
      .select("id")
      .maybeSingle();
    if (failure || !data) setError(failure?.message ?? "No se pudo eliminar la sección.");
    else {
      const remaining = sections.filter((item) => item.id !== section.id);
      setSections(remaining);
      setSectionId(remaining[0]?.id ?? "");
      setEditingDish(null);
      setRenamingSectionId(null);
    }
    setBusy(false);
  }

  async function saveDish(formData: FormData) {
    setBusy(true);
    setError("");
    const selectedSection = sections.find((section) => section.id === sectionId);
    const existingId = stringValue(formData, "dish_id");
    const existingDish = existingId
      ? sections.flatMap((section) => section.dishes)
          .find((dish) => dish.id === existingId)
      : null;
    if (!selectedSection) {
      setError("Primero selecciona una sección del menú.");
      setBusy(false);
      return;
    }
    const payload = {
      section_id: selectedSection.id,
      name: stringValue(formData, "dish_name"),
      description: stringValue(formData, "dish_description"),
      price_cents: Math.round(Number(stringValue(formData, "dish_price")) * 100),
      position: existingDish?.position ?? selectedSection.dishes.length,
      is_available: existingDish?.is_available ?? true,
      ingredients: nullable(stringValue(formData, "ingredients")),
      allergens: listValue(formData, "allergens"),
      dietary_tags: listValue(formData, "dietary_tags"),
    };
    const saveQuery = existingDish
      ? supabase.from("menu_dishes").update(payload).eq("id", existingDish.id)
      : supabase.from("menu_dishes").insert(payload);
    const { data, error: failure } = await saveQuery
      .select(
        "id, section_id, name, description, price_cents, position, is_available, " +
        "ingredients, allergens, dietary_tags",
      )
      .single();

    if (failure) {
      setError(failure.message);
    } else if (data) {
      setSections((current) =>
        current.map((section) =>
          section.id === selectedSection.id
            ? {
                ...section,
                  dishes: existingDish
                  ? section.dishes.map((dish) =>
                      dish.id === existingDish.id ? data as unknown as Dish : dish,
                    )
                  : [...section.dishes, data as unknown as Dish],
              }
            : {
                ...section,
                dishes: existingDish
                  ? section.dishes.filter((dish) => dish.id !== existingDish.id)
                  : section.dishes,
              },
        ),
      );
      setEditingDish(null);
    }
    setBusy(false);
  }

  async function toggleAvailability(dish: Dish) {
    setBusy(true);
    setError("");
    const { error: failure } = await supabase
      .from("menu_dishes")
      .update({ is_available: !dish.is_available })
      .eq("id", dish.id);
    if (failure) setError(failure.message);
    else {
      setSections((current) =>
        current.map((section) => ({
          ...section,
          dishes: section.dishes.map((item) =>
            item.id === dish.id ? { ...item, is_available: !item.is_available } : item,
          ),
        })),
      );
    }
    setBusy(false);
  }

  async function deleteDish(dish: Dish) {
    if (!window.confirm(`¿Eliminar «${dish.name}» del menú?`)) return;
    setBusy(true);
    setError("");
    const { error: failure } = await supabase
      .from("menu_dishes")
      .delete()
      .eq("id", dish.id);
    if (failure) setError(failure.message);
    else {
      setSections((current) =>
        current.map((section) => ({
          ...section,
          dishes: section.dishes.filter((item) => item.id !== dish.id),
        })),
      );
    }
    setBusy(false);
  }

  const active = sections.find((section) => section.id === sectionId);

  return (
    <>
      <Panel>
        <h2>Secciones del menú</h2>
        <form action={addSection}>
          <label className="field">
            Nueva sección
            <input name="section_title" required placeholder="Entradas, platos fuertes..." />
          </label>
          <Button type="submit" disabled={busy}>Añadir sección</Button>
        </form>
        {sections.length > 0 && (
          <label className="field">
            Sección seleccionada
            <select value={sectionId} onChange={(event) => {
              setSectionId(event.target.value);
              setEditingDish(null);
              setRenamingSectionId(null);
            }}>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </Panel>
      {active && (
        <Panel>
          <h2>Platos y bebidas de {active.title}</h2>
          {renamingSectionId === active.id ? (
            <form action={renameSection} className="menu-section-editor">
              <label className="field">
                Nombre de la sección
                <input name="section_title" required defaultValue={active.title} />
              </label>
              <div className="actions">
                <Button type="submit" disabled={busy}>Guardar nombre</Button>
                <Button tone="quiet" disabled={busy} onClick={() => setRenamingSectionId(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="actions">
              <Button tone="secondary" disabled={busy} onClick={() => setRenamingSectionId(active.id)}>
                Cambiar nombre de la sección
              </Button>
              <Button tone="quiet" disabled={busy || active.dishes.length > 0}
                onClick={() => void deleteEmptySection(active)}>
                Eliminar sección vacía
              </Button>
            </div>
          )}
          {active.dishes.map((dish) => (
            <article className="menu-item" key={dish.id}>
              <div>
                <b>{dish.name}</b>
                <p>{dish.description}</p>
                <small>${(dish.price_cents / 100).toFixed(2)}</small>
                {dish.allergens.length > 0 && (
                  <small>Alérgenos: {dish.allergens.join(", ")}</small>
                )}
              </div>
              <Button
                tone="secondary"
                disabled={busy}
                onClick={() => void toggleAvailability(dish)}
              >
                {dish.is_available ? "Marcar agotado" : "Marcar disponible"}
              </Button>
              <Button
                tone="secondary"
                disabled={busy}
                onClick={() => setEditingDish(dish)}
              >
                Editar
              </Button>
              <Button
                tone="quiet"
                disabled={busy}
                onClick={() => void deleteDish(dish)}
              >
                Eliminar
              </Button>
            </article>
          ))}
          <form action={saveDish} key={editingDish?.id ?? "nuevo"}>
            <input
              type="hidden"
              name="dish_id"
              value={editingDish?.id ?? ""}
            />
            <h3>{editingDish ? "Editar plato o bebida" : "Añadir plato o bebida"}</h3>
            <label className="field">
              Nombre
              <input name="dish_name" required defaultValue={editingDish?.name ?? ""} />
            </label>
            <label className="field">
              Descripción
              <textarea
                name="dish_description"
                required
                rows={3}
                defaultValue={editingDish?.description ?? ""}
              />
            </label>
            <label className="field">
              Precio (USD)
              <input
                name="dish_price"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={editingDish ? (editingDish.price_cents / 100).toFixed(2) : ""}
              />
            </label>
            <label className="field">
              Ingredientes
              <textarea
                name="ingredients"
                rows={2}
                defaultValue={editingDish?.ingredients ?? ""}
              />
            </label>
            <label className="field">
              Alérgenos (separados por comas)
              <input
                name="allergens"
                defaultValue={editingDish?.allergens.join(", ") ?? ""}
              />
            </label>
            <label className="field">
              Dietas o características (separadas por comas)
              <input
                name="dietary_tags"
                defaultValue={editingDish?.dietary_tags.join(", ") ?? ""}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {editingDish ? "Guardar cambios" : "Guardar plato"}
            </Button>
            {editingDish && (
              <Button
                tone="quiet"
                disabled={busy}
                onClick={() => setEditingDish(null)}
              >
                Cancelar edición
              </Button>
            )}
          </form>
        </Panel>
      )}
      {!active && (
        <Panel>
          <p>Crea una sección antes de añadir platos o bebidas.</p>
        </Panel>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullable(value: string) {
  return value || null;
}

function listValue(formData: FormData, key: string) {
  return stringValue(formData, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

