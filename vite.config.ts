import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

const REGISTRATION_API = "https://dental-registration.angonorizal.net"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: true,
    allowedHosts: ["dental-registration.angonorizal.net", "localhost"],
    // Same-origin API calls (see src/lib/patient.ts). Proxied here in dev and by
    // nginx in production so the browser never makes a cross-origin request.
    proxy: {
      "/api": {
        target: REGISTRATION_API,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    host: true,
  },
})
