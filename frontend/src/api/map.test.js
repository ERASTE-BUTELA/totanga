import assert from "node:assert/strict"
import test from "node:test"
import { mapEvent } from "./map.js"

test("un lien d'inscription non http est ignoré", () => {
  const event = mapEvent({
    id: 1,
    title: "Atelier fictif",
    slug: "atelier-fictif",
    summary: "Exemple.",
    starts_at: "2026-12-01T14:00:00+01:00",
    ends_at: null,
    location: "Salle fictive",
    image: "",
    registration_url: "javascript:alert(1)",
  })
  assert.equal(event.registrationUrl, null)
})

test("un lien https d'inscription est conservé", () => {
  const event = mapEvent({
    id: 2,
    title: "Lecture fictive",
    slug: "lecture-fictive",
    summary: "Exemple.",
    starts_at: null,
    ends_at: null,
    location: "",
    image: "",
    registration_url: "https://exemple.totanga.test/inscription",
  })
  assert.equal(event.registrationUrl, "https://exemple.totanga.test/inscription")
})
