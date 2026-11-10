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
