import { sanitizeRichText } from "../../lib/richText.js"

/** Affiche du HTML déjà nettoyé côté serveur, re-filtré côté navigateur. */
export function SafeHtml({ html, className }) {
  const clean = sanitizeRichText(html)
  if (!clean) return null
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
