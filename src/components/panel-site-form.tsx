"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveTouristSiteAction } from "@/app/panel/sitios/actions";
import { Button, Panel } from "@/components/ui";

type Option = { id: string; label: string };
type Site = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  province_id: string | null;
  city_id: string | null;
  sort_order: number;
};

// Formulario de un sitio turístico. Muestra el país fijo y la provincia como destino.
export function SiteForm({
  site,
  provinces,
  cities,
}: {
  site: Site | null;
  provinces: Option[];
  cities: Option[];
}) {
  const [state, action, pending] = useActionState(saveTouristSiteAction, { error: "" });

  return (
    <form action={action} className="site-form">
      <input type="hidden" name="site_id" value={site?.id ?? ""} />
      <Panel>
        <div className="form-row">
          <label className="field">
            Nombre del sitio
            <input name="name" required defaultValue={site?.name ?? ""} />
          </label>
          <label className="field">
            Identificador (URL)
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={site?.slug ?? ""}
              placeholder="casco-antiguo"
            />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            País
            <input value="Panamá" readOnly aria-readonly="true" />
          </label>
          <label className="field">
            Provincia destino
            <select name="province_id" required defaultValue={site?.province_id ?? ""}>
              <option value="" disabled>Selecciona una provincia</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>{province.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            Ciudad de referencia (opcional)
            <select name="city_id" defaultValue={site?.city_id ?? ""}>
              <option value="">Sin ciudad</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Orden en la web
            <input
              name="sort_order"
              type="number"
              min={0}
              max={32767}
              defaultValue={site?.sort_order ?? 0}
            />
          </label>
        </div>
        <label className="field">
          Descripción breve
          <input name="short_description" defaultValue={site?.short_description ?? ""} />
        </label>
        <label className="field">
          Descripción
          <textarea name="description" required rows={5} defaultValue={site?.description ?? ""} />
        </label>
      </Panel>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <div className="actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : site ? "Guardar sitio" : "Crear sitio"}
        </Button>
        <Link className="button quiet" href="/panel/sitios">Cancelar</Link>
      </div>
    </form>
  );
}
