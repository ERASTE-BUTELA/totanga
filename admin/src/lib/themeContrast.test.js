import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { contrastRatio } from "./contrast.js"
import { CONTRAST_PAIRS, tokenMap } from "./themeTokens.js"

function pairsFor(mode) {
  return CONTRAST_PAIRS.filter((pair) => !pair.modes || pair.modes.includes(mode))
}

describe("contraste des jetons de thème", () => {
  for (const mode of ["light", "dark"]) {
    it(`respecte les seuils WCAG en mode ${mode}`, () => {
      const map = tokenMap(mode)
      for (const pair of pairsFor(mode)) {
        const ratio = contrastRatio(map[pair.fg], map[pair.bg])
        assert.ok(
          ratio >= pair.min,
          `${mode}: ${pair.label} = ${ratio.toFixed(2)} < ${pair.min} (${pair.fg}/${pair.bg})`,
        )
      }
    })
  }
})
