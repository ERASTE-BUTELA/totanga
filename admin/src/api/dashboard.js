function csrfToken() {
  const entry = document.cookie.split("; ").find((part) => part.startsWith("csrftoken="))
  if (!entry) return ""
  return decodeURIComponent(entry.slice("csrftoken=".length))
}

async function request(path) {
  try {
    return await fetch(path, { credentials: "same-origin", headers: { "X-CSRFToken": csrfToken() } })
  } catch {
    return null
  }
}

async function finish(response) {
  if (!response) return { ok: false, error: "Le serveur n'a pas répondu. Réessayez." }
  const body = await response.json().catch(() => ({}))
  if (response.ok) return { ok: true, data: body }
  const detail = typeof body.detail === "string" ? body.detail : ""
  return { ok: false, error: detail || "Les statistiques n'ont pas pu être chargées." }
}

export function getDashboard() {
  return request("/api/gestion/tableau-de-bord/").then(finish)
}
