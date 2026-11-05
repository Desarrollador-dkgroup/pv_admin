"use client";

import { IoHeart, IoHeartOutline } from "react-icons/io5";
import { BackButton } from "@/components/public-service/back-button";
import { toggleFavorite, useIsFavorite } from "@/lib/public-service/session-stubs";
import styles from "./service.module.css";

// Botones redondos sobre la foto: volver (fijo al desplazar) y favorito.
export function HeroButtons({ serviceId }: { serviceId: string }) {
  const isFavorite = useIsFavorite(serviceId);
  return (
    <>
      <div className={styles.fixedBack}>
        <BackButton onPhoto />
      </div>
      <button
        type="button"
        className={styles.heroFavorite}
        onClick={() => toggleFavorite(serviceId)}
        aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        aria-pressed={isFavorite}
      >
        {isFavorite
          ? <IoHeart size={20} color="var(--coral)" aria-hidden />
          : <IoHeartOutline size={20} color="var(--coral)" aria-hidden />}
      </button>
    </>
  );
}
