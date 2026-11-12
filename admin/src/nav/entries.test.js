import assert from "node:assert/strict"
import test from "node:test"
import { canOpen, visibleNav } from "./entries.js"

const librarian = [
  "catalog.view_book",
  "catalog.view_author",
  "catalog.view_publisher",
  "catalog.view_category",
  "catalog.change_book",
]

test("editor only sees the dashboard", () => {
  const labels = visibleNav([]).map((entry) => entry.label)
  assert.deepEqual(labels, ["Tableau de bord"])
})

test("librarian sees the catalogue and not the accounts", () => {
  const nav = visibleNav(librarian)
  const labels = nav.map((entry) => entry.label)
  assert.deepEqual(labels, ["Tableau de bord", "Catalogue"])
  assert.deepEqual(
    nav[1].children.map((entry) => entry.label),
    ["Livres", "Auteurs", "Éditeurs", "Catégories"],
  )
  assert.equal(canOpen(librarian, "accounts.view_user"), false)
})

test("administrator sees accounts when the server grants the right", () => {
  const nav = visibleNav([...librarian, "accounts.view_user"])
  assert.equal(
    nav.some((entry) => entry.label === "Utilisateurs et rôles"),
    true,
  )
  assert.equal(
    nav.some((entry) => entry.label === "Annonces"),
    false,
  )
})

test("editor with content rights sees announcements and events", () => {
  const nav = visibleNav(["announcements.view_announcement", "events.view_event"])
  assert.deepEqual(
    nav.map((entry) => entry.label),
    ["Tableau de bord", "Annonces", "Événements"],
  )
})

test("the administrator role sees the whole menu from the mockup", () => {
  const labels = visibleNav([], "administrateur").map((entry) => entry.label)
  assert.deepEqual(labels, [
    "Tableau de bord",
    "Catalogue",
    "Annonces",
    "Publications",
    "Événements",
    "Utilisateurs et rôles",
    "Journal",
    "Messages",
    "Paramètres",
  ])
})
