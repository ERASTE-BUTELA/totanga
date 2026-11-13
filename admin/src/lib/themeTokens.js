/**
 * Palette sémantique Totanga — clair et sombre.
 * Les composants doivent utiliser ces noms, pas des hex en dur.
 */

export const THEME_TOKENS = [
  { id: "canvas", label: "Fond de page", light: "#f6f4f8", dark: "#17131f", role: "surface" },
  { id: "panel", label: "Panneau / carte", light: "#ffffff", dark: "#221c2c", role: "surface" },
  { id: "panel-soft", label: "Panneau doux", light: "#f4f0fa", dark: "#2a2435", role: "surface" },
  { id: "line", label: "Bordure", light: "#e7e2ef", dark: "#6f6582", role: "border" },
  { id: "scrim", label: "Voile modal", light: "rgb(36 24 32 / 0.45)", dark: "rgb(10 8 14 / 0.65)", role: "surface" },
  { id: "ink", label: "Texte principal", light: "#1c1917", dark: "#ebe6f0", role: "text" },
  { id: "heading", label: "Titre", light: "#241820", dark: "#f3eff7", role: "text" },
  { id: "muted", label: "Texte secondaire", light: "#4b4b4b", dark: "#b0a6bc", role: "text" },
  { id: "violet", label: "Primaire (violet)", light: "#4e154f", dark: "#c4a3c8", role: "brand" },
  { id: "violet-dark", label: "Primaire fort / barre", light: "#3a103c", dark: "#2a2033", role: "brand" },
  { id: "lavender", label: "Primaire doux", light: "#f4f0fa", dark: "#322a3d", role: "brand" },
  { id: "on-primary", label: "Texte sur primaire", light: "#f7f2f8", dark: "#1a1220", role: "text" },
  { id: "on-bar", label: "Texte sur barre / pied", light: "#f7f2f8", dark: "#ebe6f0", role: "text" },
  { id: "gold", label: "Accent doré (texte)", light: "#7c5e10", dark: "#e0bc5a", role: "accent" },
  { id: "gold-bright", label: "Accent doré (fond)", light: "#e4ae24", dark: "#c99920", role: "accent" },
  { id: "available", label: "Succès", light: "#0e6a3a", dark: "#6dcea0", role: "status" },
  { id: "available-soft", label: "Succès (fond)", light: "#e7f6ec", dark: "#2d353c", role: "status" },
  { id: "unavailable", label: "Danger", light: "#9f1239", dark: "#f08aa6", role: "status" },
  { id: "unavailable-soft", label: "Danger (fond)", light: "#fde8ef", dark: "#3f2b3d", role: "status" },
  { id: "info", label: "Info", light: "#1d4ed8", dark: "#8bb4ff", role: "status" },
  { id: "info-soft", label: "Info (fond)", light: "#e7eefc", dark: "#31314a", role: "status" },
  { id: "warning", label: "Attention", light: "#9a3412", dark: "#f0b089", role: "status" },
  { id: "warning-soft", label: "Attention (fond)", light: "#fde7c7", dark: "#43343b", role: "status" },
]

/** Paires à vérifier (≥ 4,5 texte, ≥ 3 icône/bordure). */
export const CONTRAST_PAIRS = [
  { fg: "ink", bg: "canvas", min: 4.5, label: "Texte / fond" },
  { fg: "ink", bg: "panel", min: 4.5, label: "Texte / panneau" },
  { fg: "heading", bg: "panel", min: 4.5, label: "Titre / panneau" },
  { fg: "muted", bg: "canvas", min: 4.5, label: "Secondaire / fond" },
  { fg: "muted", bg: "panel", min: 4.5, label: "Secondaire / panneau" },
  { fg: "on-primary", bg: "violet", min: 4.5, label: "Texte sur primaire" },
  { fg: "violet", bg: "panel", min: 3, label: "Primaire / panneau (icône)" },
  { fg: "available", bg: "available-soft", min: 4.5, label: "Succès" },
  { fg: "unavailable", bg: "unavailable-soft", min: 4.5, label: "Danger" },
  { fg: "info", bg: "info-soft", min: 4.5, label: "Info" },
  { fg: "warning", bg: "warning-soft", min: 4.5, label: "Attention" },
  { fg: "line", bg: "panel", min: 3, label: "Bordure / panneau", modes: ["dark"] },
]

export function tokenMap(mode) {
  const key = mode === "dark" ? "dark" : "light"
  return Object.fromEntries(THEME_TOKENS.map((token) => [token.id, token[key]]))
}
