"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Se monta solo en el navegador: en el servidor no hay <body> al que llevar la hoja.
const subscribe = () => () => {};
const inBrowser = () => true;
const onServer = () => false;

// Hoja de impresión de un contrato. Se monta directamente en <body>, fuera del panel, para que
// al imprimir solo salga la hoja (el panel y sus menús no ocupan páginas).
export function PrintSheet({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, inBrowser, onServer);
  if (!mounted) return null;
  return createPortal(<div className="contract-print-live">{children}</div>, document.body);
}
