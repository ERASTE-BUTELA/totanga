import { fixtures } from "../data/fixtures.js"
import { USER_FACING_ERROR_MESSAGE, userFacingError } from "../lib/errors.js"
import {
  mapAnnouncement,
  mapBook,
  mapCategory,
  mapEvent,
  mapLibraryInfo,
  mapPublication,
} from "./map.js"

/**
 * Seul accès aux données du site.
 * VITE_USE_FIXTURES=true : exemples fictifs.
 * VITE_USE_FIXTURES=false : API publique (VITE_API_URL).
 * En développement, sans réglage, les exemples fictifs sont utilisés.
 */
function useFixtures() {
  const flag = import.meta.env.VITE_USE_FIXTURES
  if (flag === "true") return true
  if (flag === "false") return false
  return import.meta.env.DEV
}

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  throw userFacingError()
}

async function request(path, { allowMissing = false } = {}) {
  const base = import.meta.env.VITE_API_URL
  if (typeof base !== "string" || !base.trim()) throw userFacingError()
  try {
    const response = await fetch(new URL(path, base.endsWith("/") ? base : `${base}/`))
    if (allowMissing && response.status === 404) return null
    if (!response.ok) throw userFacingError()
    return await response.json()
  } catch (error) {
    if (import.meta.env.DEV && error?.message !== USER_FACING_ERROR_MESSAGE) {
      console.error(error)
    }
    if (error?.message === USER_FACING_ERROR_MESSAGE) throw error
    throw userFacingError()
  }
}

export async function getLibraryInfo() {
  const payload = useFixtures() ? fixtures.library : await request("/api/library/")
  return mapLibraryInfo(payload)
}

export async function getCategories() {
  const payload = useFixtures() ? fixtures.categories : await request("/api/categories/")
  return asList(payload).map(mapCategory)
}

export async function getBooks() {
  const payload = useFixtures() ? fixtures.books : await request("/api/books/")
  return asList(payload)
    .map(mapBook)
    .filter((book) => !book.archived)
}

export async function getBookBySlug(slug) {
  if (useFixtures()) {
    const book = fixtures.books
      .map(mapBook)
      .find((item) => item.slug === slug && !item.archived)
    return book ?? null
  }
  const payload = await request(`/api/books/${encodeURIComponent(slug)}/`, { allowMissing: true })
  if (!payload) return null
  const book = mapBook(payload)
  return book.archived ? null : book
}

export async function getAnnouncements() {
  const payload = useFixtures() ? fixtures.announcements : await request("/api/announcements/")
  return asList(payload).map(mapAnnouncement)
}

export async function getAnnouncementBySlug(slug) {
  if (useFixtures()) {
    const item = fixtures.announcements.map(mapAnnouncement).find((entry) => entry.slug === slug)
    return item ?? null
  }
  const payload = await request(`/api/announcements/${encodeURIComponent(slug)}/`, { allowMissing: true })
  return payload ? mapAnnouncement(payload) : null
}

export async function getPublications() {
  const payload = useFixtures() ? fixtures.publications : await request("/api/publications/")
  return asList(payload).map(mapPublication)
}

export async function getPublicationBySlug(slug) {
  if (useFixtures()) {
    const item = fixtures.publications.map(mapPublication).find((entry) => entry.slug === slug)
    return item ?? null
  }
  const payload = await request(`/api/publications/${encodeURIComponent(slug)}/`, { allowMissing: true })
  return payload ? mapPublication(payload) : null
}

export async function getEvents() {
  const payload = useFixtures() ? fixtures.events : await request("/api/events/")
  return asList(payload).map(mapEvent)
}

export async function getEventBySlug(slug) {
  const events = await getEvents()
  return events.find((event) => event.slug === slug) ?? null
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ""
}

function mapPublicMessage(item) {
  if (!item || typeof item !== "object" || "email" in item) return null
  if (typeof item.name !== "string" || typeof item.body !== "string") return null
  return {
    id: item.id,
    name: item.name,
    subject: typeof item.subject === "string" ? item.subject : "",
    body: item.body,
    createdAt: typeof item.created_at === "string" ? item.created_at : "",
  }
}

export async function getVisitorMessages() {
  try {
    const response = await fetch("/api/messages/", { credentials: "same-origin" })
    if (!response.ok) throw userFacingError()
    const payload = await response.json()
    if (!Array.isArray(payload)) throw userFacingError()
    return payload.map(mapPublicMessage).filter(Boolean)
  } catch (error) {
    if (error?.message === USER_FACING_ERROR_MESSAGE) throw error
    throw userFacingError()
  }
}

export async function sendVisitorMessage(fields) {
  await getVisitorMessages()
  let response
  try {
    response = await fetch("/api/messages/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken(),
      },
      body: JSON.stringify({
        name: fields.name,
        email: fields.email,
        subject: fields.subject,
        body: fields.body,
      }),
    })
  } catch {
    throw new Error("Le message n'a pas pu être envoyé.")
  }
  if (response.status === 201) {
    const message = mapPublicMessage(await response.json())
    if (!message) throw new Error("Le message n'a pas pu être envoyé.")
    return message
  }
  if (response.status === 400) throw new Error("Vérifiez les champs du message.")
  if (response.status === 429) throw new Error("Trop de messages ont été envoyés. Réessayez plus tard.")
  throw new Error("Le message n'a pas pu être envoyé.")
}
