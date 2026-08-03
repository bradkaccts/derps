import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Dev only: MapLibre spawns its worker from a URL relative to its own module.
  // Pre-bundling breaks that resolution in dev, which silently kills every
  // GeoJSON source. Has no effect on the production build.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  // Build: emit worker chunks as ES modules, matching how MapLibre 6 loads its
  // worker under Rollup. Without this, dev and prod can diverge silently.
  worker: {
    format: "es",
  },
}));


