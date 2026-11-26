import type { IconType } from "react-icons";
import { FaUmbrellaBeach } from "react-icons/fa6";
import { IoBoat } from "react-icons/io5";
import {
  LuBike, LuBinoculars, LuBird, LuCamera, LuCoffee, LuCompass, LuFish, LuLandmark,
  LuMapPinned, LuMountain, LuShipWheel, LuSparkles, LuStore, LuTent, LuTreePalm, LuTrees,
  LuUtensilsCrossed, LuWaves,
} from "react-icons/lu";
import type { ActivityIconKey } from "@/lib/panel-site-activities";

// Dibujo de cada clave de ACTIVITY_ICONS. Igual en la página oficial y en la guía.
const ICONS: Record<ActivityIconKey, IconType> = {
  playa: FaUmbrellaBeach,
  agua: LuWaves,
  bote: IoBoat,
  pesca: LuFish,
  bicicleta: LuBike,
  comida: LuUtensilsCrossed,
  cafe: LuCoffee,
  montana: LuMountain,
  bosque: LuTrees,
  camping: LuTent,
  estrellas: LuSparkles,
  fotografia: LuCamera,
  binoculares: LuBinoculars,
  aves: LuBird,
  recorrido: LuMapPinned,
  cultura: LuLandmark,
  compras: LuStore,
  isla: LuTreePalm,
  costa: LuShipWheel,
  exploracion: LuCompass,
};

// Icono automático según el nombre: las mismas reglas que la guía y la página oficial.
const RULES: [RegExp, ActivityIconKey][] = [
  [/(playa|playas)/, "playa"],
  [/(aguas?\s*termales?|termales?|termal)/, "agua"],
  [/(nataci|nado|nadar|swim|surf|snorkel|buce|kayak|mar|arrecife)/, "agua"],
  [/(paseo(?:s)? en lancha|lancha|bote|boat)/, "bote"],
  [/(pesca)/, "pesca"],
  [/(ciclismo|patinaje|ruta|bicicleta)/, "bicicleta"],
  [/(gastron|comida|restaur|sabores|culin)/, "comida"],
  [/(senderismo|monta|trek)/, "montana"],
  [/(bosque|naturaleza|parque)/, "bosque"],
  [/(estrella|estrellas)/, "estrellas"],
  [/(avistamiento|observaci).*(rana|ranas).*(roja|rojas)/, "fotografia"],
  [/(avistamiento|observaci).*(delfin|delfines)/, "binoculares"],
  [/(avistamiento|observaci).*(ballena|tortuga|marin|medusa|pez|peces)/, "agua"],
  [/(avistamiento|observaci).*(coral|arrecife|manta|raya|manglar)/, "agua"],
  [/(avistamiento|observaci|aves|pajar)/, "aves"],
  [/(canal|tour|recorrido|museo|hist|casco|ciudad|urbano|paseo|visitas)/, "recorrido"],
  [/(isla|islote)/, "isla"],
  [/(costa|costera|marino)/, "costa"],
  [/(fotograf|paisaje|foto|mirador)/, "fotografia"],
];

export function automaticIconKey(name: string): ActivityIconKey {
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return RULES.find(([test]) => test.test(normalized))?.[1] ?? "exploracion";
}

// Icono de una actividad: el elegido en el panel o, si no hay, el automático por nombre.
export function ActivityIcon({ name, icon, size = 20 }: {
  name: string;
  icon: string;
  size?: number;
}) {
  const key = (icon in ICONS ? icon : automaticIconKey(name)) as ActivityIconKey;
  const Icon = ICONS[key];
  return <Icon aria-hidden="true" size={size} />;
}
