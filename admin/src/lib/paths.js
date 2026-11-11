/** Préfixe public de l'administration (aligné sur vite.config.js base). */
export const ADMIN_BASENAME = "/admin"

/** Chemin interne React Router (sans /admin, sans slash final). */
export function normalizeAdminPath(pathname) {
  let path = pathname || "/"
  if (path === ADMIN_BASENAME || path.startsWith(`${ADMIN_BASENAME}/`)) {
    path = path.slice(ADMIN_BASENAME.length) || "/"
  }
  if (!path.startsWith("/")) path = `/${path}`
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1)
  return path || "/"
}
