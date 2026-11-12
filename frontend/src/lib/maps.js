/**
 * Aide Google Maps Embed (localisation de la bibliothèque uniquement).
 * La clé VITE_GOOGLE_MAPS_EMBED_KEY doit être restreinte par référent HTTP.
 */

export function parseMapsCoords(value) {
  const text = String(value || "").trim()
  if (!text) return null
  const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]) }
  const query = text.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (query) return { latitude: Number(query[1]), longitude: Number(query[2]) }
  const bang = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (bang) return { latitude: Number(bang[1]), longitude: Number(bang[2]) }
  const plain = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (plain) return { latitude: Number(plain[1]), longitude: Number(plain[2]) }
  return null
}

export function mapsEmbedSrc({ mapsUrl = "", latitude = null, longitude = null, query = "" } = {}) {
  const key = String(import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || "").trim()
  const lat = latitude === null || latitude === undefined || latitude === "" ? null : Number(latitude)
  const lng = longitude === null || longitude === undefined || longitude === "" ? null : Number(longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
  const place = String(query || "").trim() || String(mapsUrl || "").trim()

  if (key) {
    if (hasCoords) {
      return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(key)}&center=${lat},${lng}&zoom=16&language=fr`
    }
    if (place) {
      return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(place)}&language=fr&zoom=16`
    }
    return ""
  }

  // Sans clé : repli output=embed (toujours Google, pour l'aperçu local).
  if (hasCoords) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=fr&output=embed`
  }
  if (place) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=16&hl=fr&output=embed`
  }
  return ""
}
