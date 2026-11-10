import { bookStatusLabel, isBookAvailable } from "../../features/catalog/availability.js"

export function BookStatus({ book, prominent = false, marked = false }) {
  const available = isBookAvailable(book)
  const label = bookStatusLabel(book)
  const tone = available
    ? "bg-available-soft text-available"
    : "bg-unavailable-soft text-unavailable"
  const size = prominent ? "px-3 py-1 text-meta font-bold" : "px-2.5 py-1 text-badge"
  return (
    <span className={`inline-flex items-center rounded-full ${size} ${tone}`}>
      {marked ? (
        <span className={`mr-1.5 h-2 w-2 rounded-full ${available ? "bg-available" : "bg-unavailable"}`} aria-hidden="true" />
      ) : null}
      {label}
    </span>
  )
}
