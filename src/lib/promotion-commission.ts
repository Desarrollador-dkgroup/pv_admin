// Comisión de una promoción según el contrato del negocio. Todo en centavos y porcentajes (0-100).

export type CommissionTerms = {
  baseCommissionPct: number;
  discountLimitPct: number;
  targetProfitCents: number;
  commissionCapPct: number;
};

export type PromotionPreview = {
  finalPriceCents: number;
  commissionPct: number;
  profitCents: number;
  exceedsLimit: boolean;
  blocked: boolean;
  maxDiscountPct: number;
};

// Por encima del límite, la comisión sube para que nuestra ganancia sea la objetivo.
export function previewPromotion(
  regularPriceCents: number,
  discountPct: number,
  terms: CommissionTerms,
): PromotionPreview {
  const finalPriceCents = Math.round(regularPriceCents * (1 - discountPct / 100));
  const exceedsLimit = discountPct > terms.discountLimitPct;
  const requiredPct = finalPriceCents > 0
    ? (terms.targetProfitCents * 100) / finalPriceCents
    : Number.POSITIVE_INFINITY;
  const commissionPct = exceedsLimit
    ? Math.max(terms.baseCommissionPct, requiredPct)
    : terms.baseCommissionPct;
  const blocked = commissionPct > terms.commissionCapPct;
  const appliedPct = Math.min(commissionPct, terms.commissionCapPct);
  const profitCents = Math.round((finalPriceCents * appliedPct) / 100);

  return {
    finalPriceCents,
    commissionPct: Number(appliedPct.toFixed(2)),
    profitCents,
    exceedsLimit,
    blocked,
    maxDiscountPct: maxDiscountFor(regularPriceCents, terms),
  };
}

// Mayor descuento que aún deja la ganancia objetivo con el tope de comisión.
export function maxDiscountFor(regularPriceCents: number, terms: CommissionTerms): number {
  if (regularPriceCents <= 0 || terms.commissionCapPct <= 0) return 0;
  const minFinalCents = (terms.targetProfitCents * 100) / terms.commissionCapPct;
  const maxPct = (1 - minFinalCents / regularPriceCents) * 100;
  return Math.max(0, Math.min(99, Number(maxPct.toFixed(2))));
}
