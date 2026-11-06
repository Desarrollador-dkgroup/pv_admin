import { formatPrice } from "@/lib/public-service/money";
import styles from "./price-tag.module.css";

// Precio en dólares. Con promoción muestra el precio final y, a la derecha, el regular tachado.
export function PriceTag({ price, promoPrice, className = "" }: {
  price: number;
  promoPrice: number | null;
  className?: string;
}) {
  if (promoPrice === null) return <span className={className}>{formatPrice(price)}</span>;
  return (
    <span className={`${styles.wrap} ${className}`}>
      <span>{formatPrice(promoPrice)}</span>
      <span className={styles.regular}>{formatPrice(price)}</span>
    </span>
  );
}
