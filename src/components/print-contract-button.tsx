"use client";

import { Button } from "@/components/ui";

export function PrintContractButton() {
  return (
    <Button type="button" tone="primary" onClick={() => window.print()}>
      Imprimir o guardar PDF
    </Button>
  );
}
