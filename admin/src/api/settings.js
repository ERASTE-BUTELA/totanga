function csrfToken() {
  const entry = document.cookie.split("; ").find((part) => part.startsWith("csrftoken="))
  if (!entry) return ""
  return decodeURIComponent(entry.slice("csrftoken=".length))
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  if (options.method && options.method !== "GET") {
    headers.set("X-CSRFToken", csrfToken())
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json")
  }
  try {
    return await fetch(path, { ...options, headers, credentials: "same-origin" })
  } catch {
    return null
  }
}

async function finish(response) {
  if (!response) return { ok: false, error: "Les paramètres n'ont pas pu être chargés. Réessayez." }
  if (response.status === 204) return { ok: true, data: null }
  const body = await response.json().catch(() => ({}))
  if (response.ok) return { ok: true, data: body }
  const detail = typeof body.detail === "string" ? body.detail : ""
  return { ok: false, error: detail || "L'enregistrement n'a pas abouti. Réessayez." }
}

export function getLibrarySettings() {
  return request("/api/gestion/parametres/").then(finish)
}

export function saveLibrarySettings(body) {
  return request("/api/gestion/parametres/", { method: "PATCH", body }).then(finish)
}

/** Active ou coupe le mode maintenance immédiatement (sans toucher aux autres champs). */
export function setMaintenanceMode(enabled) {
  const body = new FormData()
  body.set("maintenance", enabled ? "true" : "false")
  return saveLibrarySettings(body)
}

export function mapLibrarySettings(raw) {
  return {
    name: String(raw?.name || ""),
    slogan: String(raw?.slogan || ""),
    address: String(raw?.address || ""),
    city: String(raw?.city || "Kinshasa"),
    phone: String(raw?.phone || ""),
    email: String(raw?.email || ""),
    facebookUrl: String(raw?.facebook_url || ""),
    whatsappUrl: String(raw?.whatsapp_url || ""),
    mapsUrl: String(raw?.maps_url || ""),
    latitude: raw?.latitude === null || raw?.latitude === undefined ? "" : String(raw.latitude),
    longitude: raw?.longitude === null || raw?.longitude === undefined ? "" : String(raw.longitude),
    about: String(raw?.about || ""),
    language: String(raw?.language || "Français"),
    theme: String(raw?.theme || "Violet (Totanga)"),
    darkMode: Boolean(raw?.dark_mode),
    timezone: String(raw?.timezone || "(UTC+01:00) Kinshasa"),
    dateFormat: String(raw?.date_format || "31 déc. 2026"),
    timeFormat: String(raw?.time_format || "24 heures (14:30)"),
    pageSize: String(raw?.page_size || 10),
    maintenance: Boolean(raw?.maintenance),
    logo: String(raw?.logo || "") || "/admin/images/logo.png",
  }
}
