"use client";

import { useState } from "react";

export type DestinationOption = { provinceId: string; name: string };

export type SiteOption = {
  id: string;
  name: string;
  province_id: string | null;
};

type Props = {
  destinations: DestinationOption[];
  sites: SiteOption[];
  initialProvinceId: string;
  initialSiteIds: string[];
};

// Elige el destino del servicio y, dentro de ese destino, sus sitios turísticos.
export function ServiceSitePicker({
  destinations,
  sites,
  initialProvinceId,
  initialSiteIds,
}: Props) {
  const [provinceId, setProvinceId] = useState(initialProvinceId);
  const [selected, setSelected] = useState<string[]>(initialSiteIds);
  const provinceSites = sites.filter((site) => site.province_id === provinceId);

  // Al cambiar de destino se quitan los sitios que pertenecen al destino anterior.
  function handleProvinceChange(value: string) {
    setProvinceId(value);
    setSelected((current) =>
      current.filter((id) =>
        sites.some((site) => site.id === id && site.province_id === value),
      ),
    );
  }

  function toggleSite(id: string, checked: boolean) {
    setSelected((current) =>
      checked
        ? [...current.filter((item) => item !== id), id]
        : current.filter((item) => item !== id),
    );
  }

  return (
    <>
      <label className="field">
        Destino
        <select
          name="destination_province_id"
          value={provinceId}
          onChange={(event) => handleProvinceChange(event.target.value)}
        >
          <option value="">Selecciona un destino</option>
          {destinations.map((destination) => (
            <option key={destination.provinceId} value={destination.provinceId}>
              {destination.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="choice-group">
        <legend>Sitio turístico</legend>
        {!provinceId && (
          <small className="muted">Primero elige un destino para ver sus sitios.</small>
        )}
        {provinceId && !provinceSites.length && (
          <small className="muted">
            Este destino aún no tiene sitios turísticos. Créalos desde Destinos.
          </small>
        )}
        {provinceSites.map((site) => (
          <label className="checkbox-option" key={site.id}>
            <input
              type="checkbox"
              name="tourist_site_ids"
              value={site.id}
              checked={selected.includes(site.id)}
              onChange={(event) => toggleSite(site.id, event.target.checked)}
            />
            {site.name}
          </label>
        ))}
      </fieldset>
    </>
  );
}
