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
 * Le catalogue, les annonces et les événements lisent l'API.
 * Les exemples fictifs ne servent que si VITE_USE_FIXTURES=true,
 * et jamais dans une construction de production.
 */
function catalogUsesFixtures() {
  if (import.meta.env.PROD) return false
  return import.meta.env.VITE_USE_FIXTURES === "true"
}

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  throw userFacingError()
}

async function catalogRequest(path, { allowMissing = false } = {}) {
  try {
    const response = await fetch(path, { credentials: "same-origin" })
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

function mapPublicBook(raw) {
  return { ...mapBook(raw), available: Boolean(raw.available) }
}

export async function getLibraryInfo() {
  if (catalogUsesFixtures()) return mapLibraryInfo(fixtures.library)
  try {
    const payload = await catalogRequest("/api/bibliotheque/")
    const mapped = mapLibraryInfo(payload)
    const fallback = mapLibraryInfo(fixtures.library)
    return {
      ...mapped,
      hours: mapped.hours.length ? mapped.hours : fallback.hours,
      hoursSummary: mapped.hoursSummary || fallback.hoursSummary,
      // Réseaux : uniquement ceux enregistrés (Facebook / WhatsApp), pas les exemples fictifs.
      socials: mapped.socials,
      notice: mapped.notice || fallback.notice,
    }
  } catch {
    return mapLibraryInfo(fixtures.library)
  }
}

export async function getCategories() {
  if (catalogUsesFixtures()) return fixtures.categories.map(mapCategory)
  const payload = await catalogRequest("/api/catalogue/categories/")
  return asList(payload).map(mapCategory)
}

function mapChoice(item) {
  return {
    id: item.id,
    label: String(item.label || item.name || ""),
    slug: String(item.slug || ""),
    parent_id: item.parent_id ?? null,
    is_class: Boolean(item.is_class),
  }
}

/** Autocomplete public : classes / catégories avec livres publiés. */
export async function searchCatalogCategories(query = "", parent = "", id = "") {
  if (catalogUsesFixtures()) {
    const rows = fixtures.categories.map(mapCategory).map((item) => ({
      id: item.id,
      label: item.parent_name ? `${item.parent_name} — ${item.name}` : item.name,
      slug: item.slug,
      parent_id: item.parent_id || null,
      is_class: !item.parent_id,
    }))
    if (id) {
      if (/^\d+$/.test(String(id))) return rows.filter((item) => String(item.id) === String(id))
      return rows.filter((item) => item.slug === id)
    }
    const needle = String(query || "").trim().toLocaleLowerCase("fr")
    return rows
      .filter((item) => {
        if (parent) return String(item.parent_id || "") === String(parent)
        return item.is_class
      })
      .filter((item) => !needle || item.label.toLocaleLowerCase("fr").includes(needle))
      .slice(0, 20)
  }
  const params = new URLSearchParams()
  if (id) {
    if (/^\d+$/.test(String(id))) params.set("id", String(id))
    else params.set("slug", String(id))
  }
  if (query) params.set("q", query)
  if (parent) params.set("parent", String(parent))
  params.set("page_size", parent ? "50" : "20")
  const payload = await catalogRequest(`/api/catalogue/categories/?${params}`)
  return asList(payload).map(mapChoice)
}

export async function searchCatalogAuthors(query = "", id = "") {
  if (catalogUsesFixtures()) {
    const names = [...new Set(fixtures.books.flatMap((book) => (book.authors || []).map((author) => author.name || author)))]
    const rows = names.map((name, index) => ({ id: index + 1, label: String(name) }))
    if (id) return rows.filter((item) => String(item.id) === String(id))
    const needle = String(query || "").trim().toLocaleLowerCase("fr")
    return rows.filter((item) => !needle || item.label.toLocaleLowerCase("fr").includes(needle)).slice(0, 20)
  }
  const params = new URLSearchParams()
  if (id) params.set("id", String(id))
  if (query) params.set("q", query)
  params.set("page_size", "20")
  const payload = await catalogRequest(`/api/catalogue/auteurs/?${params}`)
  return asList(payload).map(mapChoice)
}

export async function searchCatalogPublishers(query = "", id = "") {
  if (catalogUsesFixtures()) {
    const names = [...new Set(fixtures.books.map((book) => book.publisher).filter(Boolean))]
    const rows = names.map((name, index) => ({ id: index + 1, label: String(name) }))
    if (id) return rows.filter((item) => String(item.id) === String(id))
    const needle = String(query || "").trim().toLocaleLowerCase("fr")
    return rows.filter((item) => !needle || item.label.toLocaleLowerCase("fr").includes(needle)).slice(0, 20)
  }
  const params = new URLSearchParams()
  if (id) params.set("id", String(id))
  if (query) params.set("q", query)
  params.set("page_size", "20")
  const payload = await catalogRequest(`/api/catalogue/editeurs/?${params}`)
  return asList(payload).map(mapChoice)
}

export async function getBooks() {
  if (catalogUsesFixtures()) {
    const books = fixtures.books.map(mapBook).filter((book) => !book.archived)
    return { books, count: books.length }
  }
  const payload = await catalogRequest("/api/catalogue/livres/?page_size=8&tri=recent")
  return {
    books: asList(payload).map(mapPublicBook),
    count: Number(payload.count) || 0,
  }
}

export async function getCatalog(search) {
  if (catalogUsesFixtures()) {
    const books = fixtures.books.map(mapBook).filter((book) => !book.archived)
    return {
      books,
      categories: fixtures.categories.map(mapCategory),
      count: books.length,
      pages: 1,
      availability: {
        disponible: books.filter((book) => book.copies?.some((copy) => copy.status === "available")).length,
        indisponible: books.filter((book) => !book.copies?.some((copy) => copy.status === "available")).length,
      },
    }
  }
  const incoming = new URLSearchParams(search)
  const params = new URLSearchParams()
  const query = incoming.get("q")
  const category = incoming.get("categorie")
  const author = incoming.get("auteur")
  const publisher = incoming.get("editeur")
  const availability = incoming.get("dispo")
  const yearMin = incoming.get("anneeMin")
  const yearMax = incoming.get("anneeMax")
  const sort = incoming.get("tri")
  if (query) params.set("q", query)
  if (category) params.set("categorie", category)
  if (author) params.set("auteur", author)
  if (publisher) params.set("editeur", publisher)
  if (availability) params.set("disponibilite", availability)
  if (yearMin) params.set("annee_min", yearMin)
  if (yearMax) params.set("annee_max", yearMax)
  if (sort) params.set("tri", sort)
  params.set("page", incoming.get("page") || "1")
  params.set("page_size", "25")
  const payload = await catalogRequest(`/api/catalogue/livres/?${params}`)
  return {
    books: asList(payload).map(mapPublicBook),
    categories: Array.isArray(payload.categories) ? payload.categories.map((item) => ({ ...mapCategory(item), count: Number(item.count) || 0 })) : [],
    count: Number(payload.count) || 0,
    pages: Number(payload.pages) || 1,
    availability: payload.availability || { disponible: 0, indisponible: 0 },
  }
}

export async function getBookBySlug(slug) {
  if (catalogUsesFixtures()) {
    const book = fixtures.books
      .map(mapBook)
      .find((item) => item.slug === slug && !item.archived)
    return book ?? null
  }
  const payload = await catalogRequest(`/api/catalogue/livres/${encodeURIComponent(slug)}/`, { allowMissing: true })
  if (!payload) return null
  const book = mapPublicBook(payload)
  book.similar = Array.isArray(payload.similar) ? payload.similar.map(mapPublicBook) : []
  return book
}

async function listPages(path) {
  const first = await catalogRequest(`${path}?page_size=100`)
  const rows = [...asList(first)]
  const pages = Number(first.pages) || 1
  for (let page = 2; page <= pages; page += 1) {
    const next = await catalogRequest(`${path}?page_size=100&page=${page}`)
    rows.push(...asList(next))
  }
  return rows
}

export async function getAnnouncements() {
  if (catalogUsesFixtures()) return fixtures.announcements.map(mapAnnouncement)
  const rows = await listPages("/api/annonces/")
  return rows.map(mapAnnouncement)
}

export async function getAnnouncementBySlug(slug) {
  if (catalogUsesFixtures()) {
    const item = fixtures.announcements.map(mapAnnouncement).find((entry) => entry.slug === slug)
    return item ?? null
  }
  const payload = await catalogRequest(`/api/annonces/${encodeURIComponent(slug)}/`, { allowMissing: true })
  return payload ? mapAnnouncement(payload) : null
}

export async function getPublications() {
  if (catalogUsesFixtures()) return fixtures.publications.map(mapPublication)
  const rows = await listPages("/api/publications/")
  return rows.map(mapPublication)
}

export async function getPublicationBySlug(slug) {
  if (catalogUsesFixtures()) {
    const item = fixtures.publications.map(mapPublication).find((entry) => entry.slug === slug)
    return item ?? null
  }
  const payload = await catalogRequest(`/api/publications/${encodeURIComponent(slug)}/`, { allowMissing: true })
  return payload ? mapPublication(payload) : null
}

export async function getEvents() {
  if (catalogUsesFixtures()) return fixtures.events.map(mapEvent)
  const rows = await listPages("/api/evenements/")
  return rows.map(mapEvent)
}

export async function getEventBySlug(slug) {
  if (catalogUsesFixtures()) {
    const events = fixtures.events.map(mapEvent)
    return events.find((event) => event.slug === slug) ?? null
  }
  const payload = await catalogRequest(`/api/evenements/${encodeURIComponent(slug)}/`, { allowMissing: true })
  return payload ? mapEvent(payload) : null
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ""
}

/**
 * Fréquentation anonyme : le backend calcule une empreinte quotidienne.
 * Aucun cookie de suivi, aucun localStorage, échec silencieux.
 */
export function recordSiteVisit(pathname) {
  if (catalogUsesFixtures()) return
  const path = pathname || "/"
  const referrer = typeof document === "undefined" ? "" : document.referrer || ""
  const search = (() => {
    try {
      return new URLSearchParams(window.location.search).get("q") || ""
    } catch {
      return ""
    }
  })()
  const send = () => {
    fetch("/api/visites/", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken(),
      },
      body: JSON.stringify({ path, referrer, search }),
    }).catch(() => {})
  }
  try {
    if (!csrfToken()) {
      fetch("/api/visites/", { credentials: "same-origin" })
        .then(() => send())
        .catch(() => {})
      return
    }
    send()
  } catch {
    // La visite ne doit jamais bloquer la navigation.
  }
}

function mapPublicMessage(item) {
  // Jamais d'email ni de WhatsApp côté public.
  if (!item || typeof item !== "object" || "email" in item || "whatsapp" in item) return null
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
        kind: fields.kind || "contact",
        name: fields.name,
        email: fields.email || "",
        whatsapp: fields.whatsapp || "",
        subject: fields.subject || "",
        body: fields.body,
      }),
    })
  } catch {
    throw new Error("Le message n'a pas pu être envoyé.")
  }
  if (response.status === 201) {
    // Les avis reviennent dans la réponse publique ; les contacts n'ont pas à être listés.
    if ((fields.kind || "contact") === "contact") return { ok: true }
    const message = mapPublicMessage(await response.json())
    if (!message) throw new Error("Le message n'a pas pu être envoyé.")
    return message
  }
  if (response.status === 400) throw new Error("Vérifiez les champs du message.")
  if (response.status === 429) throw new Error("Trop de messages ont été envoyés. Réessayez plus tard.")
  throw new Error("Le message n'a pas pu être envoyé.")
}

export const AVIS_BODY_MAX = 280
