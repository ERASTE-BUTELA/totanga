import { ChevronRight, House } from "lucide-react"
import { Link } from "react-router"

export function Breadcrumb({ items, withHome = false }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-meta">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? (
              withHome ? <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" /> : <span aria-hidden="true">/</span>
            ) : null}
            {item.to ? (
              <Link to={item.to} className="inline-flex items-center gap-1.5 font-semibold text-violet">
                {withHome && index === 0 ? <House className="h-4 w-4" aria-hidden="true" /> : null}
                {item.label}
              </Link>
            ) : (
              <span className="text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
