/** Préférence d'apparence : clair / sombre / système. Aucune autre donnée. */

export const THEME_STORAGE_KEY = "totanga-theme"
export const THEME_OPTIONS = [
  { id: "light", label: "Clair" },
  { id: "dark", label: "Sombre" },
  { id: "system", label: "Système" },
]

export function normalizeTheme(value) {
  if (value === "light" || value === "dark" || value === "system") return value
  if (value === "clair") return "light"
  if (value === "sombre") return "dark"
  if (value === "systeme") return "system"
  return "light"
}

export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored == null) return "light"
    return normalizeTheme(stored)
  } catch {
    return "light"
  }
}

export function resolvedTheme(theme = readStoredTheme()) {
  const mode = normalizeTheme(theme)
  if (mode !== "system") return mode
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function applyTheme(theme) {
  const next = normalizeTheme(theme)
  const resolved = resolvedTheme(next)
  document.documentElement.setAttribute("data-theme", next)
  document.documentElement.setAttribute("data-color-scheme", resolved)
  document.documentElement.style.colorScheme = resolved
  return next
}

export function persistTheme(theme) {
  const next = applyTheme(theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("totanga-theme", { detail: next }))
  return next
}
