import Link from "next/link";
import { Panel } from "@/components/ui";
import { DestinationForm } from "@/components/panel-destination-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadSiteOptions } from "@/lib/panel-site-options";

// Alta de un destino: solo se ofrecen las provincias que todavía no tienen tarjeta.
export default async function NewDestinationPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const [options, existing] = await Promise.all([
    loadSiteOptions(supabase),
    supabase.from("destinations").select("province_id"),
  ]);
  if (existing.error) throw new Error("No se pudieron cargar los destinos.");

  const taken = new Set((existing.data ?? []).map((row) => row.province_id));
  const available = options.provinces.filter((province) => !taken.has(province.id));

  return (
    <>
      <header className="page-heading">
        <div>
          <Link className="back-link" href="/panel/sitios">← Volver a sitios turísticos</Link>
          <h1>Añadir destino</h1>
          <p>Elige la provincia y completa la tarjeta que verán los visitantes.</p>
        </div>
      </header>
      <Panel>
        {available.length ? (
          <DestinationForm
            initial={{
              id: crypto.randomUUID(),
              provinceId: "",
              name: "",
              subtitle: "",
              description: "",
              cardImagePath: "",
              cardImageUrl: null,
              bannerImagePath: "",
              bannerImageUrl: null,
              mapsEmbed: "",
            }}
            provinces={available}
            isNew
          />
        ) : (
          <p className="muted">Todas las provincias ya tienen un destino.</p>
        )}
      </Panel>
    </>
  );
}
