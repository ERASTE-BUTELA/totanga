/** Préfixe public de l'administration (aligné sur vite.config.js `base: "/admin/"`). */
export const ADMIN_BASENAME = "/admin"

/** Tableau de bord : URL navigateur = /admin/ */
export const DASHBOARD_PATH = "/"

/** Connexion : URL navigateur = /admin/connexion */
export const LOGIN_PATH = "/connexion"

/** Alias tableau de bord : URL navigateur = /admin/dashboard */
export const DASHBOARD_ALIAS = "/dashboard"

/** Alias connexion : URL navigateur = /admin/login */
export const LOGIN_ALIAS = "/login"

/**
 * Chemin interne React Router (sans préfixe /admin, sans slash final).
 * Avec basename "/admin", useLocation().pathname est déjà sans /admin.
 * La normalisation reste défensive pour les slashs et alias.
 */
export function normalizeAdminPath(pathname) {
  let path = pathname || "/"
  if (path === ADMIN_BASENAME || path.startsWith(`${ADMIN_BASENAME}/`)) {
    path = path.slice(ADMIN_BASENAME.length) || "/"
  }
  if (!path.startsWith("/")) path = `/${path}`
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1)
  path = path || "/"
  if (path === DASHBOARD_ALIAS) return DASHBOARD_PATH
  if (path === LOGIN_ALIAS) return LOGIN_PATH
  return path
}

/** Construit une URL absolue sous /admin sans doubler le préfixe. */
export function adminHref(path = "/") {
  const normalized = normalizeAdminPath(path)
  if (normalized === "/") return `${ADMIN_BASENAME}/`
  return `${ADMIN_BASENAME}${normalized}`
}
