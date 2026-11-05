"use client";

import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import styles from "./back-button.module.css";

// Botón redondo de volver de la app: regresa en el historial o va a la portada.
export function BackButton({ fallback = "/", onPhoto = false }: {
  fallback?: string;
  onPhoto?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Volver"
      className={`${styles.button} ${onPhoto ? styles.onPhoto : ""}`}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <IoChevronBack size={22} color="var(--text-strong)" aria-hidden />
    </button>
  );
}
