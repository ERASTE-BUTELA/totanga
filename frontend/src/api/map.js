import { toSafeExternalUrl } from "../lib/safeUrl.js"

function text(value) {
  return typeof value === "string" ? value : ""
}

export function mapAuthor(raw) {
  return {
    id: raw.id,
    name: text(raw.name),
    biography: text(raw.biography),
    photo: text(raw.photo),
  }
}

export function mapCategory(raw) {
  return {
    id: raw.id,
    name: text(raw.name),
    slug: text(raw.slug),
    description: text(raw.description),
    parentName: text(raw.parent_name),
    parentSlug: text(raw.parent_slug),
    count: Number(raw.count) || 0,
  }
}

export function mapCopy(raw) {
  return {
    id: raw.id,
    callNumber: text(raw.call_number),
    inventoryNumber: text(raw.inventory_number),
    fonds: text(raw.fonds),
    secondaryCallNumber: text(raw.secondary_call_number),
    section: text(raw.section),
    shelf: text(raw.shelf),
    status: text(raw.status),
    acquiredOn: raw.acquired_on || null,
  }
}

export function mapBook(raw) {
  return {
    id: raw.id,
    title: text(raw.title),
    slug: text(raw.slug),
    authors: Array.isArray(raw.authors) ? raw.authors.map(mapAuthor) : [],
    category: raw.category ? mapCategory(raw.category) : null,
    publicationYear: raw.publication_year ?? null,
    summary: text(raw.summary),
    cover: text(raw.cover),
    language: text(raw.language) || "fr",
    publisher: text(raw.publisher),
    isbn: text(raw.isbn),
    archived: Boolean(raw.archived),
    copies: Array.isArray(raw.copies) ? raw.copies.map(mapCopy) : [],
  }
}

export function mapAnnouncement(raw) {
  const important = Boolean(raw.important) || raw.kind === "important"
  return {
    id: raw.id,
    title: text(raw.title),
    slug: text(raw.slug),
    summary: text(raw.summary),
    body: text(raw.body),
    publishedOn: raw.published_on || null,
    endsOn: raw.display_until || raw.ends_on || null,
    category: text(raw.category),
    categoryLabel: text(raw.category_label),
    important,
    kind: important ? "important" : "news",
    image: text(raw.image),
  }
}

export function mapPublication(raw) {
  return {
    id: raw.id,
    title: text(raw.title),
    slug: text(raw.slug),
    summary: text(raw.summary),
    body: text(raw.body),
    publishedOn: raw.published_on || null,
    image: text(raw.image),
    kind: text(raw.kind),
  }
}

export function mapEvent(raw) {
  return {
    id: raw.id,
    title: text(raw.title),
    slug: text(raw.slug),
    summary: text(raw.summary),
    startsAt: raw.starts_at || null,
    endsAt: raw.ends_at || null,
    location: text(raw.location),
    image: text(raw.image),
    registrationUrl: toSafeExternalUrl(raw.registration_url),
    programme: text(raw.programme),
    audience: text(raw.audience),
    eventType: text(raw.event_type),
    typeLabel: text(raw.type_label),
    speakers: Array.isArray(raw.speakers)
      ? raw.speakers.map((speaker) => ({
        name: text(speaker.name),
        title: text(speaker.title),
        position: Number(speaker.position) || 0,
        photo: text(speaker.photo),
      }))
      : [],
  }
}

export function mapLibraryInfo(raw) {
  const hours = Array.isArray(raw.opening_hours) ? raw.opening_hours : []
  return {
    name: text(raw.name),
    address: text(raw.address),
    city: text(raw.city),
    phone: text(raw.phone),
    email: text(raw.email),
    notice: text(raw.notice),
    logo: text(raw.logo) || "/images/logo.png",
    about: text(raw.about),
    facebookUrl: text(raw.facebook_url),
    whatsappUrl: text(raw.whatsapp_url),
    mapsUrl: text(raw.maps_url),
    latitude: raw.latitude === null || raw.latitude === undefined || raw.latitude === "" ? null : Number(raw.latitude),
    longitude: raw.longitude === null || raw.longitude === undefined || raw.longitude === "" ? null : Number(raw.longitude),
    maintenance: Boolean(raw.maintenance),
    hoursSummary: text(raw.hours_summary),
    socials: (Array.isArray(raw.social_links) ? raw.social_links : [])
      .map((item) => ({ label: text(item.label), url: toSafeExternalUrl(item.url) }))
      .filter((item) => item.url),
    hours: hours.map((item) => ({
      label: text(item.label),
      closed: Boolean(item.closed),
      opens: text(item.opens),
      closes: text(item.closes),
    })),
  }
}
