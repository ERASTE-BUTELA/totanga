import { usePageTitle } from "../../lib/usePageTitle.js"

export function PlaceholderPage({ title, children }) {
  usePageTitle(title)
  return (
    <section className="max-w-3xl">
      <h1 className="text-page text-ink">{title}</h1>
      <p className="mt-4 text-lead text-muted">{children}</p>
    </section>
  )
}
