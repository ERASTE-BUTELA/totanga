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

const PASSWORD_MESSAGES = new Set([
  "Vous n'avez pas l'autorisation d'effectuer cette action.",
  "Ce compte n'existe pas.",
  "Le mot de passe n'a pas pu être généré. Réessayez.",
])

export async function resetStaffPassword(userId) {
  try {
    const response = await fetch(`/api/gestion/utilisateurs/${userId}/mot-de-passe/`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken(),
      },
      body: "{}",
    })
    const payload = await response.json().catch(() => ({}))
    if (response.ok && payload && typeof payload.password === "string") {
      return { ok: true, data: payload }
    }
    const detail = typeof payload.detail === "string" ? payload.detail : ""
    if (PASSWORD_MESSAGES.has(detail)) return { ok: false, error: detail }
    if (response.status === 403) return { ok: false, error: "Seul un administrateur peut réinitialiser un mot de passe." }
    return { ok: false, error: "Le mot de passe n'a pas pu être réinitialisé. Réessayez." }
  } catch {
    return { ok: false, error: "Le mot de passe n'a pas pu être réinitialisé. Réessayez." }
  }
}

const ROLE_MESSAGES = new Set([
  "Vous n'avez pas l'autorisation d'effectuer cette action.",
  "Indiquez les rôles à enregistrer.",
  "Un rôle demandé n'existe pas.",
  "Chaque rôle ne peut apparaître qu'une fois.",
  "Tous les rôles doivent être envoyés ensemble.",
  "L'administrateur doit garder la consultation et la modification des comptes.",
  "Les rôles n'ont pas pu être enregistrés. Réessayez.",
])

export async function listRoles() {
  try {
    const response = await fetch("/api/gestion/roles/", {
      credentials: "same-origin",
      headers: { "X-CSRFToken": csrfToken() },
    })
    const payload = await response.json().catch(() => ({}))
    if (response.ok && Array.isArray(payload.roles)) return { ok: true, data: payload.roles }
    if (response.status === 403) return { ok: false, error: "Vous n'avez pas l'autorisation de voir les rôles." }
    return { ok: false, error: "Les rôles n'ont pas pu être chargés. Réessayez." }
  } catch {
    return { ok: false, error: "Les rôles n'ont pas pu être chargés. Réessayez." }
  }
}

export async function saveRoles(roles) {
  try {
    const response = await fetch("/api/gestion/roles/", {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken(),
      },
      body: JSON.stringify({ roles }),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.ok && Array.isArray(payload.roles)) return { ok: true, data: payload.roles }
    const detail = typeof payload.detail === "string" ? payload.detail : ""
    if (ROLE_MESSAGES.has(detail)) return { ok: false, error: detail }
    if (response.status === 403) return { ok: false, error: "Seul un administrateur peut modifier les rôles." }
    return { ok: false, error: "Les rôles n'ont pas pu être enregistrés. Réessayez." }
  } catch {
    return { ok: false, error: "Les rôles n'ont pas pu être enregistrés. Réessayez." }
  }
}
