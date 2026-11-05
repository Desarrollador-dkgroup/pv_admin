"use client";

import type { MouseEvent, ReactNode } from "react";

// Muestra la ficha tal como se ve en la web, pero sin navegar: enlaces y botones no hacen nada.
// Los puntos de la galería sí funcionan, para cambiar de foto.
export function PreviewFrame({ children }: { children: ReactNode }) {
  function blockNavigation(event: MouseEvent<HTMLDivElement>) {
    const control = (event.target as HTMLElement).closest("a, button");
    if (!control) return;
    if (control.getAttribute("aria-label")?.startsWith("Foto ")) return;
    event.preventDefault();
    event.stopPropagation();
  }
  return (
    <div className="public-preview" onClickCapture={blockNavigation}>
      {children}
    </div>
  );
}
