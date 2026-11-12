import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const usePolling = process.env.CHOKIDAR_USEPOLLING === "true"

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
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
