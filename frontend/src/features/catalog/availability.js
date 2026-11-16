const COPY_STATUS_LABELS = {
  available: "Disponible",
  borrowed: "Emprunté",
  reserved: "Réservé",
  in_repair: "En réparation",
  lost: "Perdu",
}

export function isCopyAvailable(copy) {
  return copy?.status === "available"
}

export function isBookAvailable(book) {
  // Un livre est disponible dès qu'au moins un exemplaire l'est.
  // Indisponible seulement si tous les exemplaires sont indisponibles (ou s'il n'y en a aucun).
  if (Array.isArray(book?.copies) && book.copies.length > 0) {
    return book.copies.some((copy) => isCopyAvailable(copy))
  }
  if (typeof book?.available === "boolean") return book.available
  return false
}

export function bookStatusLabel(book) {
  return isBookAvailable(book) ? "Disponible" : "Indisponible"
}

export function copyStatusLabel(status) {
  return COPY_STATUS_LABELS[status] ?? "Indisponible"
}
