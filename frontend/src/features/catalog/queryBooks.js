import { isBookAvailable } from "./availability.js"

function yearValue(value) {
  if (value === "" || value == null) return null
  const year = Number(value)
  if (!Number.isInteger(year)) return null
  return year
}

export function queryBooks(books, criteria = {}) {
  const query = String(criteria.q || "").trim().toLocaleLowerCase("fr")
  const categories = String(criteria.category || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const yearMin = yearValue(criteria.yearMin)
  const yearMax = yearValue(criteria.yearMax)

  const filtered = books.filter((book) => {
    if (categories.length > 0 && !categories.includes(book.category?.slug)) return false
    const available = isBookAvailable(book)
    if (criteria.availability === "disponible" && !available) return false
    if (criteria.availability === "indisponible" && available) return false
    const year = book.publicationYear
    if (yearMin != null && (year == null || year < yearMin)) return false
    if (yearMax != null && (year == null || year > yearMax)) return false
    if (!query) return true
    const haystack = [book.title, book.summary, book.category?.name, ...(book.authors || []).map((author) => author.name)]
      .join(" ")
      .toLocaleLowerCase("fr")
    return haystack.includes(query)
  })

  if (criteria.sort === "titre") {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, "fr"))
  }
  if (criteria.sort === "annee") {
    return [...filtered].sort((a, b) => (b.publicationYear ?? 0) - (a.publicationYear ?? 0))
  }
  return filtered
}
