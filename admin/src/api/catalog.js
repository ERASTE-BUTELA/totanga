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
  if (!response) return { ok: false, error: "Le catalogue n'a pas pu être chargé. Réessayez." }
  if (response.status === 204) return { ok: true, data: null }
  const body = await response.json().catch(() => ({}))
  if (response.ok) return { ok: true, data: body }
  const detail = typeof body.detail === "string" ? body.detail : ""
  return { ok: false, error: detail || "L'enregistrement n'a pas abouti. Réessayez." }
}

export function listAuthors() {
  return request("/api/gestion/catalogue/auteurs/").then(finish)
}

export function getAuthor(id) {
  return request(`/api/gestion/catalogue/auteurs/${id}/`).then(finish)
}

export function saveAuthor(id, body) {
  const path = id ? `/api/gestion/catalogue/auteurs/${id}/` : "/api/gestion/catalogue/auteurs/"
  return request(path, { method: id ? "PATCH" : "POST", body }).then(finish)
}

export function deleteAuthor(id) {
  return request(`/api/gestion/catalogue/auteurs/${id}/`, { method: "DELETE" }).then(finish)
}

export function listCategories() {
  return request("/api/gestion/catalogue/categories/").then(finish)
}

export function getCategory(id) {
  return request(`/api/gestion/catalogue/categories/${id}/`).then(finish)
}

export function saveCategory(id, body) {
  const path = id ? `/api/gestion/catalogue/categories/${id}/` : "/api/gestion/catalogue/categories/"
  return request(path, { method: id ? "PATCH" : "POST", body: JSON.stringify(body) }).then(finish)
}

export function deleteCategory(id) {
  return request(`/api/gestion/catalogue/categories/${id}/`, { method: "DELETE" }).then(finish)
}

export function listBooks() {
  return request("/api/gestion/catalogue/livres/").then(finish)
}

export function getBook(id) {
  return request(`/api/gestion/catalogue/livres/${id}/`).then(finish)
}

export function saveBook(id, body) {
  const path = id ? `/api/gestion/catalogue/livres/${id}/` : "/api/gestion/catalogue/livres/"
  return request(path, { method: id ? "PATCH" : "POST", body }).then(finish)
}

export function archiveBook(id, archived) {
  return request(`/api/gestion/catalogue/livres/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ archived }),
  }).then(finish)
}
