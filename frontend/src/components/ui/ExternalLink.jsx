import { toSafeExternalUrl } from "../../lib/safeUrl.js"

export function ExternalLink({ href, className, children, label }) {
  const safeHref = toSafeExternalUrl(href)
  if (!safeHref) return null
  return (
    <a href={safeHref} className={className} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
    </a>
  )
}
