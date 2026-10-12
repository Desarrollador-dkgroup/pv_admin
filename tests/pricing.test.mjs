import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPromotionDiscount,
  formatPromotionPrice,
  validatePromotionPrices,
} from "../src/types/content.ts";

// Comprueba los importes visibles y las validaciones antes de guardar una promoción.
test("Presenta el descuento y convierte centavos a dólares", () => {
  assert.equal(formatPromotionDiscount(50), "-50%");
  assert.equal(formatPromotionPrice(5000), "$50.00");
  assert.equal(formatPromotionDiscount(66.67), "-66.67%");
});

test("Rechaza precios parciales, fraccionarios y superiores al precio habitual", () => {
  for (const [regular, promotional] of [
    [100, null],
    [null, 50],
    [100, 101],
    [100, 0.5],
  ]) {
    assert.throws(() =>
      validatePromotionPrices({
        regular_price_cents: regular,
        promotional_price_cents: promotional,
      }),
    );
  }
  assert.doesNotThrow(() =>
    validatePromotionPrices({
      regular_price_cents: 10000,
      promotional_price_cents: 5000,
    }),
  );
});
