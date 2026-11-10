import assert from "node:assert/strict"
import test from "node:test"
import { formatDate, formatTimeRange } from "./format.js"

test("une date du calendrier reste au jour indiqué", () => {
  assert.equal(formatDate("2026-11-18"), "18 novembre 2026")
})

test("l'horaire d'un événement s'affiche en heure de Kinshasa", () => {
  assert.equal(
    formatTimeRange("2026-11-22T14:00:00+01:00", "2026-11-22T16:00:00+01:00"),
    "14:00 – 16:00",
  )
})
