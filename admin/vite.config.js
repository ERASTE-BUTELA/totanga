import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const usePolling = process.env.CHOKIDAR_USEPOLLING === "true"
const privateHeaders = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
}

export default defineConfig(({ mode }) => ({
  base: "/admin/",
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  preview: {
    headers: privateHeaders,
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    headers: privateHeaders,
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://backend:8000",
      },
      "/media": {
        target: process.env.VITE_PROXY_TARGET || "http://backend:8000",
      },
    },
  },
}))
