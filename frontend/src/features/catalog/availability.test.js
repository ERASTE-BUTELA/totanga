import assert from "node:assert/strict"
import test from "node:test"
import { bookStatusLabel, copyStatusLabel, isBookAvailable } from "./availability.js"

test("un livre avec un exemplaire disponible est disponible", () => {
  const book = {
    copies: [
      { status: "borrowed" },
      { status: "available" },
    ],
  }
  assert.equal(isBookAvailable(book), true)
  assert.equal(bookStatusLabel(book), "Disponible")
})

test("un livre sans exemplaire disponible est indisponible", () => {
  const book = {
    copies: [{ status: "borrowed" }, { status: "in_repair" }, { status: "lost" }],
  }
  assert.equal(isBookAvailable(book), false)
  assert.equal(bookStatusLabel(book), "Indisponible")
})

test("le catalogue utilise le drapeau available quand les exemplaires ne sont pas listés", () => {
  assert.equal(isBookAvailable({ available: true, copies: [] }), true)
  assert.equal(isBookAvailable({ available: false, copies: [] }), false)
})

test("le détail d'un exemplaire a un libellé français", () => {
  assert.equal(copyStatusLabel("reserved"), "Réservé")
  assert.equal(copyStatusLabel("inconnu"), "Indisponible")
})
