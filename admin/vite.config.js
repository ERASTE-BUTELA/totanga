import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const usePolling = process.env.CHOKIDAR_USEPOLLING === "true"
const privateHeaders = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
}

/**
 * Vite exige le préfixe /admin/. Sans slash final (/admin) ou hors préfixe
 * (/parametres), le serveur affiche une page d'erreur au F5.
 * On redirige vers l'URL correcte sous /admin/.
 */
function adminBaseRedirect() {
  return {
    name: "admin-base-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url || "/"
        const q = raw.indexOf("?")
        const path = q === -1 ? raw : raw.slice(0, q)
        const query = q === -1 ? "" : raw.slice(q)

        if (path === "/admin") {
          res.statusCode = 302
          res.setHeader("Location", `/admin/${query}`)
          res.end()
          return
        }

        if (
          path.startsWith("/admin/") ||
          path.startsWith("/api/") ||
          path.startsWith("/media/") ||
          path.startsWith("/@") ||
          path.startsWith("/node_modules") ||
          path.startsWith("/src/") ||
          path === "/favicon.ico" ||
          path === "/favicon.svg"
        ) {
          next()
          return
        }

        const target = path === "/" ? `/admin/${query}` : `/admin${path}${query}`
        res.statusCode = 302
        res.setHeader("Location", target)
        res.end()
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: "/admin/",
  plugins: [adminBaseRedirect(), react(), tailwindcss()],
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
