"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  getPreviewServerSnapshot,
  getPreviewSnapshot,
  savePreview,
  subscribePreview,
} from "@/lib/preview-store";
import type { PreviewData, PreviewEntity, PreviewRole } from "@/types/preview";

type PreviewContextValue = {
  data: PreviewData;
  role: PreviewRole;
  message: string;
  notify: (message: string) => void;
  save: (entity: PreviewEntity, action: string) => boolean;
  remove: (id: string) => void;
  dismiss: () => void;
};

const PreviewContext = createContext<PreviewContextValue | null>(null);

// Centraliza cambios locales, historial y mensajes de la vista previa.
export function PreviewProvider({ role, children }: { role: PreviewRole; children: ReactNode }) {
  const data = useSyncExternalStore(subscribePreview, getPreviewSnapshot, getPreviewServerSnapshot);
  const [message, setMessage] = useState("");
  const actor = role === "admin" ? "Administrador" : "María López";

  function persist(entities: PreviewEntity[], action: string) {
    try {
      savePreview({
        entities,
        history: [
          { id: crypto.randomUUID(), action, actor, date: new Date().toISOString() },
          ...data.history,
        ],
      });
      setMessage(`${action}. Cambio guardado en la vista previa.`);
      return true;
    } catch {
      setMessage("No se pudo guardar en este navegador. Revisa el espacio de almacenamiento.");
      return false;
    }
  }

  function save(entity: PreviewEntity, action: string) {
    // Limita las modificaciones de propietarios al negocio del recorrido ilustrativo.
    if (role === "propietario" && entity.business !== "Hotel Casa Casco") {
      setMessage("Este registro pertenece a otro negocio.");
      return false;
    }
    const exists = data.entities.some((record) => record.id === entity.id);
    return persist(
      exists
        ? data.entities.map((record) => (record.id === entity.id ? entity : record))
        : [...data.entities, entity],
      action,
    );
  }

  function remove(id: string) {
    const entity = data.entities.find((record) => record.id === id);
    if (!entity || (role === "propietario" && entity.business !== "Hotel Casa Casco")) return;
    persist(
      data.entities.filter((record) => record.id !== id),
      "Registro eliminado",
    );
  }

  return (
    <PreviewContext.Provider
      value={{
        data,
        role,
        message,
        notify: setMessage,
        save,
        remove,
        dismiss: () => setMessage(""),
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) throw new Error("Falta el contexto de la vista previa.");
  return context;
}
