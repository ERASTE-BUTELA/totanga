import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"

const fieldClass = "w-full rounded-control border border-line bg-panel px-3"

/**
 * Select filtrable : les options viennent de la base via `search(query)`.
 * `search` doit renvoyer Promise<{ ok, data: { results: [{ id, ... }] } }>.
 * Mode `multiple` : plusieurs valeurs (puces) + select pour en ajouter.
 */
export function SearchSelect({
  label,
  value = null,
  values = null,
  onChange,
  search,
  labelOf,
  placeholder = "Rechercher…",
  emptyLabel = "Aucun résultat",
  required = false,
  disabled = false,
  clearable = true,
  multiple = false,
}) {
  const listId = useId()
  const root = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState([])
  const [loading, setLoading] = useState(false)
  const selected = multiple ? (values || []) : (value ? [value] : [])
  const chosen = new Set(selected.map((item) => item.id))

  useEffect(() => {
    if (!open || disabled) return undefined
    let gone = false
    setLoading(true)
    const timer = setTimeout(() => {
      Promise.resolve(search(query.trim()))
        .then((result) => {
          if (gone) return
          setLoading(false)
          if (!result || !result.ok) {
            setHits([])
            return
          }
          const rows = result.data?.results || result.data || []
          const list = Array.isArray(rows) ? rows : []
          setHits(list.filter((item) => item && item.id != null && !chosen.has(item.id)))
        })
        .catch(() => {
          if (gone) return
          setLoading(false)
          setHits([])
        })
    }, query.trim() ? 200 : 0)
    return () => {
      gone = true
      clearTimeout(timer)
    }
  }, [open, query, search, disabled, selected.map((item) => item.id).join(",")])

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
    if (multiple) {
      if (chosen.has(item.id)) return
      onChange([...selected, item])
      setQuery("")
      setHits((current) => current.filter((row) => row.id !== item.id))
      return
    }
    onChange(item)
    setOpen(false)
    setQuery("")
    setHits([])
  }

  function remove(item) {
    if (multiple) {
      onChange(selected.filter((row) => row.id !== item.id))
      return
    }
    onChange(null)
  }

  function clear(event) {
    event.stopPropagation()
    onChange(multiple ? [] : null)
    setQuery("")
    setHits([])
    setOpen(false)
  }

  const shown = !multiple && value ? labelOf(value) : ""

  return (
    <div className="grid gap-1" ref={root}>
      <span className="font-semibold text-heading">
        {label}
        {required ? " *" : ""}
      </span>
      {multiple && selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-1 font-semibold text-violet">
              {labelOf(item)}
              {disabled ? null : (
                <button type="button" aria-label={`Retirer ${labelOf(item)}`} onClick={() => remove(item)}>
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      ) : null}
      {disabled ? (
        multiple ? null : (
          <div className={`${fieldClass} flex min-h-11 items-center text-heading`}>{shown || "—"}</div>
        )
      ) : (
        <div className="relative">
          <div className={`${fieldClass} flex min-h-11 items-center gap-2`}>
            {open ? (
              <input
                className="min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
                value={query}
                aria-label={label}
                aria-expanded="true"
                aria-controls={listId}
                role="combobox"
                autoComplete="off"
                placeholder={multiple ? placeholder : (value ? shown : placeholder)}
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(false)
                    setQuery("")
                  }
                  if (event.key === "Enter") {
                    event.preventDefault()
                    if (hits[0]) pick(hits[0])
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-left"
                aria-haspopup="listbox"
                aria-expanded="false"
                onClick={() => setOpen(true)}
              >
                <span className={shown ? "truncate text-heading" : "truncate text-muted"}>
                  {multiple ? placeholder : (shown || placeholder)}
                </span>
                <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-muted" />
              </button>
            )}
            {clearable && !multiple && value && !open ? (
              <button type="button" aria-label="Effacer" className="shrink-0 text-muted" onClick={clear}>
                <X size={16} />
              </button>
            ) : null}
          </div>
          {open ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-control border border-line bg-panel shadow-card"
            >
              {loading ? (
                <li className="px-3 py-2 text-muted">Recherche…</li>
              ) : hits.length === 0 ? (
                <li className="px-3 py-2 text-muted">{emptyLabel}</li>
              ) : (
                hits.map((item) => (
                  <li key={item.id} role="option">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-lavender"
                      onClick={() => pick(item)}
                    >
                      {labelOf(item)}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}
      {disabled && multiple && selected.length === 0 ? (
        <div className={`${fieldClass} flex min-h-11 items-center text-muted`}>—</div>
      ) : null}
    </div>
  )
}
