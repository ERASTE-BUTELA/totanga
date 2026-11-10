function csrfToken() {
  const entry = document.cookie.split("; ").find((part) => part.startsWith("csrftoken="))
  if (!entry) return ""
  return decodeURIComponent(entry.slice("csrftoken=".length))
}

const CREATION_MESSAGES = new Set([
  "Indiquez un identifiant valide.",
  "Indiquez le prénom et le nom.",
  "Choisissez un rôle du personnel.",
  "Cet identifiant est déjà utilisé.",
  "Le compte n'a pas pu être créé. Réessayez.",
  "Vous n'avez pas l'autorisation d'effectuer cette action.",
])

export async function createStaff(body) {
  try {
    const response = await fetch("/api/gestion/utilisateurs/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken(),
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 201 && payload && typeof payload.password === "string") {
      return { ok: true, data: payload }
    }
    const detail = typeof payload.detail === "string" ? payload.detail : ""
    if (CREATION_MESSAGES.has(detail)) return { ok: false, error: detail }
    if (response.status === 403) return { ok: false, error: "Vous n'avez pas l'autorisation de créer un compte." }
    return { ok: false, error: "Le compte n'a pas pu être créé. Réessayez." }
  } catch {
    return { ok: false, error: "Le compte n'a pas pu être créé. Réessayez." }
  }
}

export async function listStaff() {
  try {
    const response = await fetch("/api/gestion/utilisateurs/", {
      credentials: "same-origin",
      headers: { "X-CSRFToken": csrfToken() },
    })
    if (response.ok) return { ok: true, data: await response.json() }
    if (response.status === 403) return { ok: false, error: "Vous n'avez pas l'autorisation de voir les comptes." }
    return { ok: false, error: "Les comptes n'ont pas pu être chargés. Réessayez." }
  } catch {
    return { ok: false, error: "Les comptes n'ont pas pu être chargés. Réessayez." }
  }
}
