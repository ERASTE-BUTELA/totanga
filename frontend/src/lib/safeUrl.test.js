import assert from "node:assert/strict"
import test from "node:test"
import { toSafeExternalUrl } from "./safeUrl.js"

test("accepte http et https", () => {
  assert.equal(
    toSafeExternalUrl("https://exemple.totanga.test/inscription"),
    "https://exemple.totanga.test/inscription",
  )
  assert.equal(
    toSafeExternalUrl("  http://exemple.totanga.test/atelier "),
    "http://exemple.totanga.test/atelier",
  )
})

test("ignore les autres adresses", () => {
  assert.equal(toSafeExternalUrl("javascript:alert(1)"), null)
  assert.equal(toSafeExternalUrl("data:text/html,bonjour"), null)
  assert.equal(toSafeExternalUrl("mailto:contact@exemple.test"), null)
  assert.equal(toSafeExternalUrl("/chemin-relatif"), null)
  assert.equal(toSafeExternalUrl(""), null)
  assert.equal(toSafeExternalUrl(null), null)
})
