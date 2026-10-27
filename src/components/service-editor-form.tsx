"use client";

import { type FormEvent, startTransition, useActionState, useState } from "react";
import { Button, Panel } from "@/components/ui";
import { LANGUAGE_OPTIONS, getLodgingDetailFields } from "@/data/lodging-details";
import {
  ChoiceField,
  EventsPolicyField,
  ReceptionHoursField,
} from "@/components/lodging-form-fields";
import { AttractionsField, ActivityScheduleField, WhatIncludesField, type Attraction } from "@/components/activity-form-fields";
import {
  ServiceSitePicker,
  type DestinationOption,
  type SiteOption,
} from "@/components/panel-service-site-picker";
import { saveServiceAction } from "@/app/panel/actions";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";
import { canManageCatalog, type PanelRole } from "@/types/panel";

type Option = { id: string; name?: string; label?: string; province_id?: string };
type Props = {
  role: PanelRole;
  service: Record<string, unknown>;
  lodging: Record<string, unknown>;
  restaurant: Record<string, unknown>;
  businesses: Option[];
  categories: Option[];
  lodgingTypes: Option[];
  sites: SiteOption[];
  destinations: DestinationOption[];
  destinationProvinceId: string;
  presetLodgingTypeId?: string;
  ownerName?: string;
  amenities: Option[];
  mealPlans: Option[];
  restaurantFeatures: Option[];
  selectedSiteIds: string[];
  selectedAmenityIds: string[];
  selectedFeatureIds: string[];
};

// Presenta campos reales para el servicio y su ficha específica.
export function ServiceEditorForm(props: Props) {
  const [state, action, pending] = useActionState(saveServiceAction, { error: "" });
  const { role, service, lodging, restaurant } = props;

  // Envía sin que React limpie los campos: si el guardado falla, lo escrito se mantiene.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => action(formData));
  }
  const isStaff = canManageCatalog(role);
  const isNew = !service.id;
  const isPublished = service.status === "published";
  // La categoría elegida controla qué campos se muestran (tipo de hospedaje, ficha de
  // hospedaje o de restaurante), así que vive en el estado del formulario.
  const [categoryId, setCategoryId] = useState(
    String(service.category_id ?? props.categories[0]?.id ?? "hospedaje"),
  );
  const lodgingTypeId = String(service.hospedaje_type_id ?? props.presetLodgingTypeId ?? "");
  const selectedLanguages = Array.isArray(lodging.languages)
    ? lodging.languages.map(String)
    : [];
  const detailFields = getLodgingDetailFields(lodgingTypeId);
  const details = (lodging.details ?? {}) as Record<string, string>;
  const selectedSites = props.selectedSiteIds.length
    ? props.selectedSiteIds
    : service.tourist_site_id ? [String(service.tourist_site_id)] : [];
  const [attractions, setAttractions] = useState<Attraction[]>(
    Array.isArray(details.attractions) ? details.attractions : [],
  );
  const [whatIncludes, setWhatIncludes] = useState<string[]>(
    Array.isArray(details.whatIncludes) ? details.whatIncludes : [],
  );
  const [schedule, setSchedule] = useState<Record<string, { start: string; end: string }>>(
    typeof details.schedule === "object" && details.schedule ? details.schedule : {},
  );

  // Serializa las atracciones, horarios e inclusions para enviarlas en el formulario.
  const handleSubmitWithAttractions = (event: FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget;
    if (categoryId === "actividades") {
      const input1 = document.createElement("input");
      input1.type = "hidden";
      input1.name = "detail__attractions";
      input1.value = JSON.stringify(attractions);
      formElement.appendChild(input1);

      const input2 = document.createElement("input");
      input2.type = "hidden";
      input2.name = "detail__schedule";
      input2.value = JSON.stringify(schedule);
      formElement.appendChild(input2);

      const input3 = document.createElement("input");
      input3.type = "hidden";
      input3.name = "detail__whatIncludes";
      input3.value = JSON.stringify(whatIncludes);
      formElement.appendChild(input3);
    }
    handleSubmit(event);
  };

  return (
    <form onSubmit={handleSubmitWithAttractions}>
      <input type="hidden" name="service_id" value={String(service.id ?? "")} />
      <Panel>
        <h2>Información general</h2>
        <label className="field">
          Nombre comercial
          <input name="name" required defaultValue={String(service.name ?? "")} />
        </label>
        {isStaff ? (
          <label className="field">
            Negocio
            <select
              name="business_id"
              required
              defaultValue={String(service.business_id ?? props.businesses[0]?.id ?? "")}
            >
              {props.businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name ?? business.id}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="field">
              Propietario
              <input value={props.ownerName ?? ""} readOnly />
            </label>
            <input
              type="hidden"
              name="business_id"
              value={String(service.business_id ?? props.businesses[0]?.id ?? "")}
            />
          </>
        )}
        <label className="field">
          Categoría
          <select
            name="category_id"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
            disabled={!isStaff && !isNew}
          >
            {props.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label ?? category.name ?? category.id}
              </option>
            ))}
          </select>
          {!isStaff && !isNew && (
            <input type="hidden" name="category_id" value={categoryId} />
          )}
        </label>
        {categoryId === "hospedaje" && (
          <label className="field">
            Tipo de hospedaje
            <select
              name="hospedaje_type_id"
              defaultValue={lodgingTypeId}
              required
              disabled={!isStaff && !isNew}
            >
              <option value="">Selecciona un tipo</option>
              {props.lodgingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label ?? type.name ?? type.id}
                </option>
              ))}
            </select>
            {!isStaff && !isNew && (
              <input type="hidden" name="hospedaje_type_id" value={lodgingTypeId} />
            )}
          </label>
        )}
        <ServiceSitePicker
          destinations={props.destinations}
          sites={props.sites}
          initialProvinceId={props.destinationProvinceId}
          initialSiteIds={selectedSites}
        />
        <TextField label="Dirección" name="address" value={service.address} />
        <TextField
          label="Descripción para búsquedas"
          name="search_description"
          value={service.search_description}
          multiline
        />
        <TextField
          label="Descripción completa"
          name="description"
          value={service.description}
          multiline
          required
        />
        <MapsEmbedField
          initial={service.maps_embed_url == null ? "" : String(service.maps_embed_url)}
        />
        <fieldset className="choice-group">
          <legend>Servicios y comodidades</legend>
          {props.amenities.map((amenity) => (
            <label className="checkbox-option" key={amenity.id}>
              <input
                type="checkbox"
                name="amenity_ids"
                value={amenity.id}
                defaultChecked={props.selectedAmenityIds.includes(amenity.id)}
              />
              {amenity.label ?? amenity.id}
            </label>
          ))}
        </fieldset>
                {categoryId !== "hospedaje" && (
  <TextField
            label="Precio desde (USD)"
            name="base_price"
            value={dollars(service.base_price_cents)}
            type="number"
          />
        )}
        {isStaff && (
          <>
            <label className="field">
              Publicación
              <select name="status" defaultValue={String(service.status ?? "draft")}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="suspended">Suspendido</option>
              </select>
            </label>
            <label className="checkbox-option">
              <input
                type="checkbox"
                name="is_recommended"
                defaultChecked={service.is_recommended === true}
              />
              Servicio recomendado
            </label>
            <TextField
              label="Nota de revisión"
              name="review_comment"
              value={service.review_comment}
              multiline
            />
          </>
        )}
      </Panel>

      {categoryId === "hospedaje" && (
        <Panel>
          <h2>Operación del hospedaje</h2>
          <TextField
            label="Teléfono de contacto"
            name="contact_phone"
            value={lodging.contact_phone}
          />
          <TextField
            label="Correo de contacto"
            name="contact_email"
            value={lodging.contact_email}
          />
          <TextField label="Sitio web" name="website_url" value={lodging.website_url} />
          <ReceptionHoursField initial={lodging.reception_hours} />
          <TextField
            label="Hora de check-in"
            name="check_in_from"
            value={lodging.check_in_from}
            type="time"
          />
          <TextField
            label="Hora de check-out"
            name="check_out_time"
            value={lodging.check_out_time}
            type="time"
          />
          <fieldset className="field">
            <legend>Idiomas</legend>
            {LANGUAGE_OPTIONS.map((language) => (
              <label key={language} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="languages"
                  value={language}
                  defaultChecked={selectedLanguages.includes(language)}
                />
                {language}
              </label>
            ))}
          </fieldset>
          <label className="field">
            Plan de comidas
            <select
              name="meal_plan_id"
              defaultValue={String(service.meal_plan_id ?? "")}
            >
              <option value="">Selecciona un plan</option>
              {props.mealPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label}
                </option>
              ))}
            </select>
          </label>
          <ChoiceField
            label="Estacionamiento"
            name="parking_details"
            value={lodging.parking_details}
            options={PARKING_OPTIONS}
          />
          <ChoiceField
            label="¿Se aceptan mascotas?"
            name="pet_policy"
            value={lodging.pet_policy}
            options={YES_NO_OPTIONS}
          />
          <ChoiceField
            label="¿Se permite fumar?"
            name="smoking_policy"
            value={lodging.smoking_policy}
            options={YES_NO_OPTIONS}
          />
          <EventsPolicyField policy={lodging.events_policy} rules={details.events_rules} />
          <TextField
            label="Cancelación"
            name="cancellation_policy"
            value={lodging.cancellation_policy}
            multiline
          />
          {detailFields.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              name={`detail__${field.key}`}
              value={details[field.key]}
              multiline={field.multiline}
            />
          ))}
        </Panel>
      )}

      {categoryId === "restaurantes" && (
        <RestaurantFields
          restaurant={restaurant}
          features={props.restaurantFeatures}
          selectedFeatureIds={props.selectedFeatureIds}
        />
      )}

      {categoryId === "actividades" && (
        <>
          <Panel>
            <h2>Horarios</h2>
            <ActivityScheduleField
              schedule={schedule}
              onScheduleChange={setSchedule}
            />
          </Panel>

          <Panel>
            <h2>Descripción y atracciones</h2>
            <label className="field">
              Descripción de la actividad
              <textarea
                name="detail__description"
                defaultValue={typeof details.description === "string" ? details.description : ""}
                placeholder="Describe tu actividad..."
                rows={4}
                maxLength={1000}
              />
              <small style={{ color: "var(--muted)" }}>
                {(typeof details.description === "string" ? details.description : "").length}/1000 caracteres
              </small>
            </label>

            <WhatIncludesField
              items={whatIncludes}
              onItemsChange={setWhatIncludes}
            />

            <AttractionsField
              attractions={attractions}
              onAttractionsChange={setAttractions}
            />
          </Panel>
        </>
      )}

      <footer className="sticky-actions">
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {state.saved && !state.error && (
          <p role="status" style={{ color: "#15803d", margin: 0 }}>
            Cambios guardados correctamente.
          </p>
        )}
        <Button type="submit" name="intent" value="save" disabled={pending}>
          {pending
            ? "Guardando..."
            : !isStaff && !isPublished ? "Guardar como borrador" : "Guardar cambios"}
        </Button>
        {!isStaff && !isPublished && (
          <Button
            tone="secondary"
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
          >
            Enviar a revisión
          </Button>
        )}
        {!isStaff && isPublished && (
          <small>
            Los cambios de esta ficha publicada se muestran en el catálogo al guardarlos.
          </small>
        )}
        {!isStaff && !isPublished && !isNew && (
          <small>
            Al guardar o enviar cambios, el servicio queda como borrador hasta que
            un administrador lo revise y publique.
          </small>
        )}
        {isNew && <small>El nuevo servicio se guardará como borrador.</small>}
      </footer>
    </form>
  );
}

// Código de Google Maps del servicio, con validación y vista previa.
function MapsEmbedField({ initial }: { initial: string }) {
  const [input, setInput] = useState(initial);
  const mapsUrl = extractMapsEmbedUrl(input);
  const invalid = input.trim() !== "" && !mapsUrl;

  return (
    <section className="destination-block">
      <h3>Mapa de Google</h3>
      <p className="muted">
        En Google Maps busca el lugar, pulsa <strong>Compartir → Insertar un mapa</strong> y
        pega aquí el código completo (iframe) o solo la URL del atributo src.
      </p>
      <textarea
        name="maps_embed"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={3}
        placeholder='<iframe src="https://www.google.com/maps/embed?..."></iframe>'
        aria-invalid={invalid}
      />
      {invalid && (
        <small role="alert" className="form-error">
          Ese código no es un mapa de Google válido.
        </small>
      )}
      {mapsUrl && (
        <iframe
          className="destination-map"
          src={mapsUrl}
          title="Vista previa del mapa"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </section>
  );
}

// Agrupa la ficha del restaurante, las reservas y los datos del menú.
function RestaurantFields({
  restaurant,
  features,
  selectedFeatureIds,
}: {
  restaurant: Record<string, unknown>;
  features: Option[];
  selectedFeatureIds: string[];
}) {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const weeklyHours = Array.isArray(restaurant.weekly_hours)
    ? restaurant.weekly_hours
    : [];

  return (
    <Panel>
      <h2>Restaurante y reservas</h2>
      <TextField
        label="Tipo de cocina"
        name="cuisine_type"
        value={restaurant.cuisine_type}
      />
      <label className="field">
        Estilo de servicio
        <select name="service_style" defaultValue={String(restaurant.service_style ?? "casual")}>
          <option value="casual">Casual</option>
          <option value="formal">Formal</option>
        </select>
      </label>
      <TextField
        label="Teléfono de reservas"
        name="restaurant_phone"
        value={restaurant.contact_phone}
        type="tel"
      />
      <TextField
        label="Correo de contacto"
        name="contact_email"
        value={restaurant.contact_email}
      />
      <TextField
        label="Sitio web o redes"
        name="website_url"
        value={restaurant.website_url}
      />
      <TextField
        label="Enlace externo del menú"
        name="menu_url"
        value={restaurant.menu_url}
        type="url"
      />
      <TextField
        label="Ambiente"
        name="ambience"
        value={restaurant.ambience}
        multiline
      />
      <TextField
        label="Métodos de pago (separados por comas)"
        name="payment_methods"
        value={arrayText(restaurant.payment_methods)}
      />
      <h3>Horario semanal de reservas</h3>
      <small>
        Escribe uno o varios turnos por día, separados por comas. Ejemplo:
        12:00-15:00, 18:00-22:00.
      </small>
      {days.map((day, index) => (
        <TextField
          key={day}
          label={day}
          name={`hours_${index}`}
          value={weeklyHours[index]}
        />
      ))}
      <TextField
        label="Precio promedio mínimo (USD)"
        name="average_price_min"
        value={dollars(restaurant.average_price_min_cents)}
        type="number"
      />
      <TextField
        label="Precio promedio máximo (USD)"
        name="average_price_max"
        value={dollars(restaurant.average_price_max_cents)}
        type="number"
      />
      <TextField
        label="Accesibilidad"
        name="accessibility_details"
        value={restaurant.accessibility_details}
        multiline
      />
      <fieldset className="choice-group">
        <legend>Características del restaurante</legend>
        {features.map((feature) => (
          <label className="checkbox-option" key={feature.id}>
            <input
              type="checkbox"
              name="restaurant_feature_ids"
              value={feature.id}
              defaultChecked={selectedFeatureIds.includes(feature.id)}
            />
            {feature.label ?? feature.id}
          </label>
        ))}
      </fieldset>
      <TextField
        label="Política de cancelación"
        name="cancellation_policy"
        value={restaurant.cancellation_policy}
        multiline
      />
      <label className="checkbox-option">
        <input
          type="checkbox"
          name="accepts_reservations"
          defaultChecked={restaurant.accepts_reservations !== false}
        />
        Acepta reservas
      </label>
      <label className="checkbox-option">
        <input
          type="checkbox"
          name="reservation_requires_confirmation"
          defaultChecked={restaurant.reservation_requires_confirmation !== false}
        />
        Requiere confirmación del restaurante
      </label>
      <TextField
        label="Duración por reserva (minutos)"
        name="reservation_duration_minutes"
        value={restaurant.reservation_duration_minutes}
        type="number"
      />
      <TextField
        label="Mínimo de comensales"
        name="reservation_min_party_size"
        value={restaurant.reservation_min_party_size}
        type="number"
      />
      <TextField
        label="Máximo de comensales"
        name="reservation_max_party_size"
        value={restaurant.reservation_max_party_size}
        type="number"
      />
      <TextField
        label="Anticipación mínima (minutos)"
        name="reservation_min_advance_minutes"
        value={restaurant.reservation_min_advance_minutes}
        type="number"
      />
      <TextField
        label="Días disponibles para reservar"
        name="reservation_max_days_ahead"
        value={restaurant.reservation_max_days_ahead}
        type="number"
      />
      <TextField
        label="Capacidad por turno"
        name="reservation_capacity_per_slot"
        value={restaurant.reservation_capacity_per_slot}
        type="number"
      />
      <TextField
        label="Cierre de cancelación (minutos)"
        name="reservation_cancellation_cutoff_minutes"
        value={restaurant.reservation_cancellation_cutoff_minutes}
        type="number"
      />
      <TextField
        label="Política de reservas"
        name="reservation_policy"
        value={restaurant.reservation_policy}
        multiline
      />
    </Panel>
  );
}

// Mantiene etiquetas y valores consistentes entre todos los formularios.
const PARKING_OPTIONS = ["Privado", "Público", "Ambos", "No cuenta con estacionamiento"];
const YES_NO_OPTIONS = ["Sí", "No"];

function TextField({
  label,
  name,
  value,
  type = "text",
  multiline = false,
  required = false,
}: {
  label: string;
  name: string;
  value: unknown;
  type?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  const initial = value == null ? "" : String(value);
  return (
    <label className="field">
      {label}
      {multiline ? (
        <textarea name={name} defaultValue={initial} rows={3} required={required} />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={initial}
          required={required}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "0.01" : undefined}
        />
      )}
    </label>
  );
}

function dollars(value: unknown) {
  return value == null ? "" : (Number(value) / 100).toFixed(2);
}

function arrayText(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : "";
}
