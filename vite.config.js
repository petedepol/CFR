import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/apple-touch-icon.png",
        "icons/maskable-512.png",
        // Rider avatars - precache for instant loading
        "riders/ana.png",
        "riders/charlie.png",
        "riders/cole.png",
        "riders/luca.png",
        "riders/jolanda.png",
        // Bike images
        "bikes/race.png",
        "bikes/training.png",
        "bikes/ebike.png",
        "bikes/road.png",
        "bikes/cx.png",
      ],
      manifest: {
        name: "CFR Tools",
        short_name: "CFR Tools",
        description: "CFR team tools (Measurements + Settings)",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
