import assert from "node:assert/strict"
import test from "node:test"
import { queryBooks } from "./queryBooks.js"

const books = [
  {
    title: "Les lampes de Lingwala",
    summary: "Un roman fictif.",
    publicationYear: 2018,
    category: { name: "Roman", slug: "roman" },
    authors: [{ name: "Amina Kasaï" }],
    copies: [{ status: "available" }],
  },
  {
    title: "Le cahier du fleuve",
    summary: "Un carnet.",
    publicationYear: 2009,
    category: { name: "Roman", slug: "roman" },
    authors: [{ name: "Joseph Ilunga" }],
    copies: [{ status: "borrowed" }],
  },
]

test("la recherche trouve un titre ou un auteur", () => {
  assert.equal(queryBooks(books, { q: "amina" }).length, 1)
  assert.equal(queryBooks(books, { q: "fleuve" })[0].title, "Le cahier du fleuve")
})

test("le filtre disponible ignore un livre sans exemplaire disponible", () => {
  const found = queryBooks(books, { availability: "disponible" })
  assert.deepEqual(found.map((book) => book.title), ["Les lampes de Lingwala"])
})

test("le tri par année place le plus récent en premier", () => {
  const found = queryBooks(books, { sort: "annee" })
  assert.equal(found[0].publicationYear, 2018)
})
