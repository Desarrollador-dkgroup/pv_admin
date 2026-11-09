import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Un anuncio sube dos imágenes de hasta 5 MB cada una: el límite por defecto (1 MB) las rechazaba.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
