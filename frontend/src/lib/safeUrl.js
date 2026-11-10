const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export function toSafeExternalUrl(value) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null
    return url.href
  } catch {
    return null
  }
}
