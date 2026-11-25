"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteTouristSiteAction, saveTouristSiteAction } from "@/app/panel/sitios/actions";
import { SiteActivities } from "@/components/panel-site-activities";
import { SiteGallery } from "@/components/panel-site-gallery";
import { SiteMapField } from "@/components/panel-site-map-field";
import { Button, Panel, confirmAction } from "@/components/ui";
import type { SiteActivity } from "@/lib/panel-site-activities";
import { PanelSelect } from "@/components/panel-select";

type Option = { id: string; label: string };
type Site = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  province_id: string | null;
  sort_order: number;
  maps_embed_url: string | null;
};

// Formulario de un sitio turístico: datos, fotos, mapa de Google y actividades.
export function SiteForm({
  site,
  photos = [],
  activities = [],
  provinces,
  defaultProvinceId = "",
}: {
  site: Site | null;
  photos?: string[];
  activities?: SiteActivity[];
  provinces: Option[];
  defaultProvinceId?: string;
}) {
  const [state, action, pending] = useActionState(saveTouristSiteAction, { error: "" });
  // La carpeta de las fotos usa el identificador del sitio. Un sitio nuevo lo recibe al subir
  // su primera foto, así las fotos ya quedan en su carpeta antes de crear el sitio.
  const [siteId, setSiteId] = useState(site?.id ?? "");
  const [photosBusy, setPhotosBusy] = useState(false);
  const [mapsInvalid, setMapsInvalid] = useState(false);

  function ensureSiteId() {
    if (siteId) return siteId;
    const created = crypto.randomUUID();
    setSiteId(created);
    return created;
  }

  return (
    <form action={action} className="site-form">
      <input type="hidden" name="site_id" value={siteId} />
      <input type="hidden" name="is_new" value={site ? "" : "1"} />
      <Panel>
        <div className="form-row">
          <label className="field">
            Nombre del sitio
            <input name="name" required defaultValue={site?.name ?? ""} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            País
            <input value="Panamá" readOnly aria-readonly="true" />
          </label>
          <label className="field">
            Provincia destino
            <PanelSelect
            name="province_id"
            required
            defaultValue={site?.province_id ?? defaultProvinceId}
          >
              <option value="" disabled>Selecciona una provincia</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>{province.label}</option>
              ))}
            </PanelSelect>
          </label>
        </div>
        <div className="form-row">
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

        <SiteGallery
          initialPhotos={photos}
          ensureSiteId={ensureSiteId}
          onBusyChange={setPhotosBusy}
        />

        <SiteMapField
          initialValue={site?.maps_embed_url ?? ""}
          onInvalidChange={setMapsInvalid}
        />

        <label className="field">
          Descripción breve
          <input name="short_description" defaultValue={site?.short_description ?? ""} />
        </label>
        <label className="field">
          Descripción
          <textarea name="description" required rows={5} defaultValue={site?.description ?? ""} />
        </label>

        <SiteActivities initialActivities={activities} />
      </Panel>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <div className="actions">
        <Button type="submit" disabled={pending || photosBusy || mapsInvalid}>
          {pending ? "Guardando…" : site ? "Guardar sitio" : "Crear sitio"}
        </Button>
        {site && (
          <Button
            type="button"
            tone="danger"
            onClick={async () => {
              if (!(await confirmAction({
                title: `¿Eliminar «${site.name}»?`,
                body: "Se quita de la web y de los servicios vinculados. No se puede deshacer.",
                confirmLabel: "Eliminar sitio",
                danger: true,
              }))) return;
              await deleteTouristSiteAction(site.id);
            }}
          >
            Eliminar sitio
          </Button>
        )}
        <Link className="button quiet" href={site ? `/panel/sitios/${site.id}` : "/panel/sitios"}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
