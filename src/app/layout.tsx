import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Define la identidad y los metadatos de padmin.
export const metadata: Metadata = {
  title: "Panel del propietario | Panamá Viajero",
  description: "Administración de Panamá Viajero.",
};

// Comparte el idioma y la estructura base de las páginas.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
