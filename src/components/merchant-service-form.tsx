"use client";

import Link from "next/link";
import { type FormEvent, startTransition, useActionState, useState } from "react";
import { saveMerchantServiceAction } from "@/app/panel/actions";
import { ServiceSitePicker, type DestinationOption, type SiteOption } from "@/components/panel-service-site-picker";
import { Button, Panel } from "@/components/ui";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";

type Option = { id: string; label?: string };

export function MerchantServiceForm({
  service, restaurant, amenities, mealPlans, sites, destinations, destinationProvinceId,
  selectedSiteIds, selectedAmenityIds, weeklyHours,
}: {
  service: Record<string, unknown>;
  restaurant: Record<string, unknown>;
  amenities: Option[];
  mealPlans: Option[];
  sites: SiteOption[];
  destinations: DestinationOption[];
  destinationProvinceId: string;
  selectedSiteIds: string[];
  selectedAmenityIds: string[];
  weeklyHours: string[];
}) {
  const [state, action, pending] = useActionState(saveMerchantServiceAction, { error: "" });
  const [mapInput, setMapInput] = useState(String(service.maps_embed_url ?? ""));
  const serviceId = String(service.id);
  const isLodging = service.category_id === "hospedaje";
  const isPublished = service.status === "published";
  const mapUrl = mapInput.trim() ? extractMapsEmbedUrl(mapInput) : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={submit}>
      <input type="hidden" name="service_id" value={serviceId} />
      <Panel>
        <h2>Datos que verá el viajero</h2>
        <label className="field">
          Nombre del establecimiento
          <input name="name" required defaultValue={String(service.name ?? "")} />
        </label>
        <ServiceSitePicker
          destinations={destinations}
          sites={sites}
          initialProvinceId={destinationProvinceId}
          initialSiteIds={selectedSiteIds}
        />
        <label className="field">
          Dirección
          <input name="address" defaultValue={String(service.address ?? "")} />
        </label>
        <label className="field">
          Resumen para las tarjetas de búsqueda
          <textarea name="search_description" rows={2} defaultValue={String(service.search_description ?? "")} />
        </label>
        <label className="field">
          Descripción de la ficha
          <textarea name="description" rows={4} defaultValue={String(service.description ?? "")} />
        </label>
        <label className="field">
          Ubicación en Google Maps
          <textarea
            name="maps_embed"
            rows={2}
            value={mapInput}
            onChange={(event) => setMapInput(event.target.value)}
            aria-invalid={Boolean(mapInput.trim() && !mapUrl)}
            placeholder="Pega el enlace o el código de Insertar un mapa"
          />
          {mapInput.trim() && !mapUrl && <small className="form-error">Revisa el enlace del mapa.</small>}
        </label>
        <fieldset className="choice-group">
          <legend>Comodidades que aparecen en la ficha</legend>
          {amenities.map((amenity) => (
            <label className="checkbox-option" key={amenity.id}>
              <input type="checkbox" name="amenity_ids" value={amenity.id}
                defaultChecked={selectedAmenityIds.includes(amenity.id)} />
              {amenity.label ?? amenity.id}
            </label>
          ))}
        </fieldset>
      </Panel>

      <Panel>
        <h2>{isLodging ? "Habitaciones y precio" : "Precio"}</h2>
        {isLodging ? (
          <>
            <p>Los precios se muestran a partir de las habitaciones que agregues.</p>
            <label className="field">
              Plan de comidas
              <select name="meal_plan_id" defaultValue={String(service.meal_plan_id ?? "")}>
                <option value="">Selecciona un plan</option>
                {mealPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.label}</option>)}
              </select>
            </label>
            <Link className="button secondary" href={`/panel/servicios/${serviceId}/unidades#habitaciones`}>
              Editar habitaciones
            </Link>
          </>
        ) : (
          <label className="field">
            Precio desde (USD)
            <input name="base_price" type="number" min="0" step="0.01"
              defaultValue={service.base_price_cents == null ? "" : Number(service.base_price_cents) / 100} />
          </label>
        )}
        {service.category_id === "restaurantes" && (
          <>
            <label className="field">
              Tipo de cocina
              <input name="cuisine_type" defaultValue={String(restaurant.cuisine_type ?? "")} />
            </label>
            <label className="field">
              Ambiente
              <textarea name="ambience" rows={2} defaultValue={String(restaurant.ambience ?? "")} />
            </label>
            <Link className="button secondary" href={`/panel/servicios/${serviceId}/menu`}>
              Editar platos y precios del menú
            </Link>
            <h3>Horario para reservas</h3>
            <p>Escribe los turnos como 12:00-15:00. Puedes separar dos turnos con una coma.</p>
            {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((day, index) => (
              <label className="field" key={day}>
                {day}
                <input name={`hours_${index}`} defaultValue={weeklyHours[index] ?? ""}
                  placeholder="12:00-21:00" />
              </label>
            ))}
          </>
        )}
      </Panel>

      <Panel>
        <h2>Fotos</h2>
        <p>Las fotos generales y las de habitaciones o platos se gestionan desde la galería.</p>
        <Link className="button secondary" href={`/panel/servicios/${serviceId}/galeria`}>
          Abrir galería
        </Link>
      </Panel>

      <footer className="sticky-actions">
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        <Button type="submit" name="intent" value="save" disabled={pending}>
          {pending ? "Guardando..." : "Guardar cambios"}
        </Button>
        {!isPublished && (
          <Button type="submit" tone="secondary" name="intent" value="submit" disabled={pending}>
            Enviar a revisión
          </Button>
        )}
        <Link className="button quiet" href={`/panel/servicios/${serviceId}/vista-previa`}>
          Ver vista previa guardada
        </Link>
      </footer>
    </form>
  );
}
