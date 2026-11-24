import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"

/**
 * Champ de filtre autocomplete (catalogue public).
 * `search(query)` → Promise<Array<{ id, label }>>
 */
export function AutocompleteField({
  label,
  value,
  onChange,
  search,
  placeholder = "Rechercher…",
  disabled = false,
  emptyLabel = "Aucun résultat",
}) {
  const listId = useId()
  const root = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || disabled) return undefined
    let gone = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      Promise.resolve(search(query.trim()))
        .then((rows) => {
          if (gone) return
          setLoading(false)
          const list = Array.isArray(rows) ? rows : []
          setHits(list.filter((item) => item && item.id != null && item.id !== value?.id))
        })
        .catch(() => {
          if (gone) return
          setLoading(false)
          setHits([])
        })
    }, query.trim() ? 200 : 0)
    return () => {
      gone = true
      window.clearTimeout(timer)
    }
  }, [open, query, search, disabled, value?.id])

  useEffect(() => {
    if (!open) return undefined
    function onDoc(event) {
      if (root.current && !root.current.contains(event.target)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  function pick(item) {
    onChange(item)
    setOpen(false)
    setQuery("")
    setHits([])
  }

  return (
    <div ref={root} className={`relative min-w-0 ${disabled ? "opacity-60" : ""}`}>
      <span className="mb-1 block text-meta font-semibold text-ink">{label}</span>
      <div
        className={`flex min-h-11 items-center gap-1 rounded-xl border border-line bg-panel px-2 ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-1 py-2 text-left text-body text-ink disabled:cursor-not-allowed"
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (disabled) return
            setOpen((current) => !current)
          }}
        >
          <span className={`min-w-0 truncate ${value ? "text-ink" : "text-muted"}`}>
            {value?.label || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
        {value ? (
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-lavender hover:text-violet"
            aria-label={`Effacer ${label}`}
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {open && !disabled ? (
        <div
          id={listId}
          className="absolute z-30 mt-1 flex max-h-60 w-full flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-card"
          role="listbox"
        >
          <div className="shrink-0 border-b border-line bg-panel p-2">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-body text-ink outline-none"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="px-3 py-3 text-meta text-muted">Recherche…</p>
            ) : hits.length === 0 ? (
              <p className="px-3 py-3 text-meta text-muted">{emptyLabel}</p>
            ) : (
              <ul>
                {hits.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      className="w-full px-3 py-2 text-left text-body text-ink hover:bg-lavender"
                      onClick={() => pick(item)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
