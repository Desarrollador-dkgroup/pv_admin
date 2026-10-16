import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LodgingCatalogManager,
  type Area,
  type RatePeriod,
  type Room,
} from "@/components/lodging-catalog-manager";
import { getPanelIdentity } from "@/lib/panel-access";

// Carga tipos de unidad y áreas reservadas para un hospedaje.
export default async function LodgingUnitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name, hospedaje_type_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !service || !service.hospedaje_type_id) notFound();

  const [rooms, areas] = await Promise.all([
    supabase
      .from("room_types")
      .select(
        "id, name, description, capacity, beds_label, price_cents, total_units, " +
        "booking_unit, bedroom_count, bathroom_count, area_m2, details",
      )
      .eq("service_id", id)
      .order("position"),
    supabase
      .from("lodging_areas")
      .select(
        "id, name, description, is_available, opening_hours, capacity, " +
        "included_in_rate, additional_price_cents, access_details, details",
      )
      .eq("service_id", id)
      .order("position"),
  ]);
  if (rooms.error || areas.error) throw new Error("No se pudieron cargar unidades y áreas.");

  const roomRecords = (rooms.data ?? []) as unknown as Room[];
  const areaRecords = (areas.data ?? []) as unknown as Area[];
  const roomIds = roomRecords.map((room) => room.id);
  const rateResult = roomIds.length
    ? await supabase
        .from("lodging_rate_periods")
        .select(
          "id, room_type_id, valid_from, valid_to, price_cents, minimum_nights, " +
          "included_guests, extra_guest_price_cents, cleaning_fee_cents, " +
          "taxes_details, deposit_cents, cancellation_policy",
        )
        .in("room_type_id", roomIds)
        .order("valid_from")
    : { data: [], error: null };
  if (rateResult.error) throw new Error("No se pudieron cargar tarifas de temporada.");

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Unidades de {service.name}</h1>
          <p>Configura lo que el viajero reserva y las instalaciones disponibles.</p>
        </div>
        <Link className="button quiet" href={`/panel/servicios/${id}`}>
          Volver al servicio
        </Link>
      </header>
      <LodgingCatalogManager
        serviceId={id}
        lodgingTypeId={service.hospedaje_type_id}
        rooms={roomRecords}
        areas={areaRecords}
        rates={(rateResult.data ?? []) as unknown as RatePeriod[]}
      />
    </>
  );
}
