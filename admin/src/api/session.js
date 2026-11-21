import { loginError } from "./messages.js"

function readCsrfToken() {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("csrftoken="))
  if (!entry) return ""
  return decodeURIComponent(entry.slice("csrftoken=".length))
}

async function send(path, options = {}) {
  const headers = new Headers(options.headers)
  if (options.method && options.method !== "GET") {
    headers.set("Content-Type", "application/json")
    headers.set("X-CSRFToken", readCsrfToken())
  }
  try {
    return await fetch(path, {
      ...options,
      headers,
      credentials: "same-origin",
    })
  } catch {
    return null
  }
}

export async function loadSession() {
  const response = await send("/api/gestion/session/")
  if (!response) return { account: null, expired: false, unavailable: true }
  if (response.status === 200) {
    return { account: await response.json(), expired: false, unavailable: false }
  }
  if (response.status === 401) {
    return { account: null, expired: true, unavailable: false }
  }
  return { account: null, expired: false, unavailable: false }
}

export async function login(username, password) {
  const response = await send("/api/gestion/session/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
  if (!response) return { error: loginError(0) }
  if (response.status === 200) return { account: await response.json() }
  return { error: loginError(response.status) }
}

export async function logout() {
  await send("/api/gestion/session/", { method: "DELETE" })
}

const PASSWORD_CHANGE_MESSAGES = new Set([
  "Indiquez l'ancien mot de passe et le nouveau (avec confirmation).",
  "Le mot de passe est trop long.",
  "L'ancien mot de passe est incorrect.",
  "La confirmation ne correspond pas au nouveau mot de passe.",
  "Le nouveau mot de passe doit être différent de l'ancien.",
  "Le nouveau mot de passe ne respecte pas les règles (longueur, complexité, mots de passe trop courants).",
])

export async function changeOwnPassword({ currentPassword, newPassword, confirmPassword }) {
  const response = await send("/api/gestion/compte/mot-de-passe/", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  })
  if (!response) return { ok: false, error: "Le serveur n'a pas répondu. Réessayez." }
  const payload = await response.json().catch(() => ({}))
  const detail = typeof payload.detail === "string" ? payload.detail : ""
  if (response.ok) return { ok: true, detail: detail || "Mot de passe modifié. Reconnectez-vous." }
  if (PASSWORD_CHANGE_MESSAGES.has(detail)) return { ok: false, error: detail }
  if (response.status === 403) return { ok: false, error: "Session expirée. Reconnectez-vous." }
  return { ok: false, error: "Le mot de passe n'a pas pu être modifié. Réessayez." }
}
