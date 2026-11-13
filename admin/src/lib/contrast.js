/** Contraste WCAG relatif (formule relative luminance). */

function channel(value) {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function parseColor(input) {
  const raw = String(input || "").trim()
  if (raw.startsWith("rgba")) {
    const match = raw.match(/rgba?\(([^)]+)\)/i)
    if (!match) return null
    const parts = match[1].split(",").map((part) => part.trim())
    const r = Number(parts[0])
    const g = Number(parts[1])
    const b = Number(parts[2])
    const a = parts[3] === undefined ? 1 : Number(parts[3])
    if ([r, g, b, a].some((n) => Number.isNaN(n))) return null
    return { r, g, b, a }
  }
  let hex = raw.replace("#", "")
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("")
  if (hex.length !== 6 || /[^0-9a-f]/i.test(hex)) return null
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: 1,
  }
}

function blendOn(fg, bg) {
  if (fg.a >= 1) return fg
  const a = fg.a
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  }
}

export function relativeLuminance(color) {
  const parsed = typeof color === "string" ? parseColor(color) : color
  if (!parsed) return 0
  return 0.2126 * channel(parsed.r) + 0.7152 * channel(parsed.g) + 0.0722 * channel(parsed.b)
}

export function contrastRatio(foreground, background) {
  const bg = parseColor(background)
  let fg = parseColor(foreground)
  if (!bg || !fg) return 0
  if (fg.a < 1) fg = blendOn(fg, bg)
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function formatRatio(ratio) {
  return `${ratio.toFixed(2)} : 1`
}
