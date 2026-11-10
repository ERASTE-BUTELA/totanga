const LANGUAGES = {
  fr: "Français",
  en: "Anglais",
  ln: "Lingala",
  kg: "Kikongo",
  lua: "Tshiluba",
  sw: "Swahili",
}

function dateParts(value) {
  if (typeof value !== "string") return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function formatDate(value) {
  const date = dateParts(value)
  if (!date) return ""
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export function eventDay(value) {
  const date = dateParts(value)
  if (!date) return null
  const month = new Intl.DateTimeFormat("fr-FR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase()
  return { day: String(date.getDate()).padStart(2, "0"), month }
}

export function formatTime(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kinshasa",
  }).format(date)
}

export function formatTimeRange(startsAt, endsAt) {
  const start = formatTime(startsAt)
  const end = formatTime(endsAt)
  if (start && end) return `${start} – ${end}`
  return start || end
}

export function languageLabel(code) {
  return LANGUAGES[code] || "Français"
}

export function authorNames(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return ""
  return authors.map((author) => author.name).filter(Boolean).join(", ")
}

export function textBlocks(value) {
  if (typeof value !== "string") return []
  return value
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}
