const COPY_STATUS_LABELS = {
  available: "Disponible",
  borrowed: "Emprunté",
  reserved: "Réservé",
  in_repair: "En réparation",
  lost: "Perdu",
}

export function isBookAvailable(book) {
  if (typeof book?.available === "boolean") return book.available
  return Array.isArray(book?.copies) && book.copies.some((copy) => copy.status === "available")
}

export function bookStatusLabel(book) {
  return isBookAvailable(book) ? "Disponible" : "Indisponible"
}

export function copyStatusLabel(status) {
  return COPY_STATUS_LABELS[status] ?? "Indisponible"
}
