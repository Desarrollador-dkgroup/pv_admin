"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoCalendarOutline } from "react-icons/io5";
import { useAuthSession } from "@/lib/public-service/session-stubs";
import { loginHref } from "@/lib/public-service/session-stubs";
import styles from "./service.module.css";

// Reservar exige cuenta: sin sesión se abre el acceso y, después de entrar, vuelve aquí.
function ReserveLink({ href, className, label, children }: {
  href: string;
  className: string;
  label?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status } = useAuthSession();
  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      onClick={(event) => {
        if (status === "signedIn") return;
        event.preventDefault();
        router.push(loginHref(href));
      }}
    >
      {children}
    </Link>
  );
}

// Barras inferiores de la ficha (reserve-bar.tsx y booking-bar.tsx). En escritorio se
// muestran como una tarjeta fija a la derecha.

export function ReserveBar({ href, summary, priceLine, label = "Reservar" }: {
  href: string;
  summary?: string;
  priceLine?: string;
  label?: string;
}) {
  return (
    <div className={styles.bar}>
      {(summary || priceLine) && (
        <div className={styles.barLines}>
          {summary && <span className={styles.barSummary}>{summary}</span>}
          {priceLine && <span className={styles.barPriceLine}>{priceLine}</span>}
        </div>
      )}
      <ReserveLink href={href} className={styles.reserveButton} label={label}>
        <IoCalendarOutline size={20} color="#FFFFFF" aria-hidden />
        Reservar
      </ReserveLink>
    </div>
  );
}

export function BookingBar({ href, priceLine }: { href: string; priceLine?: string }) {
  return (
    <div className={styles.bar}>
      {priceLine && (
        <div className={styles.barLines}>
          <span className={styles.barPriceLine}>{priceLine}</span>
        </div>
      )}
      <ReserveLink href={href} className={styles.reserveButton}>Reservar</ReserveLink>
    </div>
  );
}
