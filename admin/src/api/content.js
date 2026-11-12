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
  if (!response) return { ok: false, error: "Le serveur n'a pas répondu. Réessayez." }
  if (response.status === 204) return { ok: true, data: null }
  const body = await response.json().catch(() => ({}))
  if (response.ok) return { ok: true, data: body }
  const detail = typeof body.detail === "string" ? body.detail : ""
  return { ok: false, error: detail || "L'enregistrement n'a pas abouti. Réessayez." }
}

async function listAll(path) {
  const first = await request(`${path}?page_size=100`).then(finish)
  if (!first.ok || Array.isArray(first.data)) return first
  const rows = [...(first.data.results || [])]
  const pages = Number(first.data.pages) || 1
  for (let page = 2; page <= pages; page += 1) {
    const next = await request(`${path}?page_size=100&page=${page}`).then(finish)
    if (!next.ok) return next
    rows.push(...(next.data.results || []))
  }
  return { ok: true, data: rows }
}

export function listAnnouncements() {
  return listAll("/api/gestion/annonces/")
}

export function getAnnouncement(id) {
  return request(`/api/gestion/annonces/${id}/`).then(finish)
}

export function saveAnnouncement(id, body) {
  const path = id ? `/api/gestion/annonces/${id}/` : "/api/gestion/annonces/"
  return request(path, { method: id ? "PATCH" : "POST", body }).then(finish)
}

export function setAnnouncementState(id, state) {
  return request(`/api/gestion/annonces/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ state }),
  }).then(finish)
}

export function listEvents() {
  return listAll("/api/gestion/evenements/")
}

export function getEvent(id) {
  return request(`/api/gestion/evenements/${id}/`).then(finish)
}

export function saveEvent(id, body) {
  const path = id ? `/api/gestion/evenements/${id}/` : "/api/gestion/evenements/"
  return request(path, { method: id ? "PATCH" : "POST", body }).then(finish)
}

export function setEventState(id, state) {
  return request(`/api/gestion/evenements/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ state }),
  }).then(finish)
}

export function listJournal() {
  return request("/api/gestion/journal/").then(finish)
}

export function listMessages() {
  return request("/api/gestion/messages/").then(finish).then((result) => {
    if (!result.ok) return result
    const body = result.data
    if (Array.isArray(body)) {
      return { ok: true, data: { results: body, unread_count: body.filter((row) => !row.is_read).length } }
    }
    return {
      ok: true,
      data: {
        results: Array.isArray(body?.results) ? body.results : [],
        unread_count: Number(body?.unread_count) || 0,
      },
    }
  })
}

export function markMessageRead(id) {
  return request("/api/gestion/messages/", {
    method: "PATCH",
    body: JSON.stringify({ id }),
  }).then(finish)
}

export function markAllMessagesRead() {
  return request("/api/gestion/messages/", {
    method: "PATCH",
    body: JSON.stringify({ mark_all: true }),
  }).then(finish)
}
