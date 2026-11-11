import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Search } from "lucide-react"
import { Link } from "react-router"

const PAGE_SIZES = [10, 25, 50]

export function CatalogListPage({
  stats,
  heading,
  headingIcon: HeadingIcon,
  one,
  noun,
  addLabel,
  addTo,
  placeholder,
  rows,
  columns,
  filters,
  oneLine = false,
  searchOf,
  sortOf,
  showSort = true,
  period,
  onPageRequest,
  totalCount = 0,
  pageCount = 1,
  loading = false,
}) {
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState({})
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [sort, setSort] = useState("az")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [sentQuery, setSentQuery] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setSentQuery(query), 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!onPageRequest) return undefined
    onPageRequest({ query: sentQuery, chosen, from, to, sort, page, pageSize })
  }, [onPageRequest, sentQuery, chosen, from, to, sort, page, pageSize])

  const visible = useMemo(() => {
    if (onPageRequest) return rows
    const needle = query.trim().toLocaleLowerCase("fr")
    const next = rows.filter((row) => {
      if (needle && !searchOf(row).toLocaleLowerCase("fr").includes(needle)) return false
      if (period && !period.match(row, from, to)) return false
      return filters.every((filter) => {
        const value = chosen[filter.id] || ""
        return !value || filter.match(row, value)
      })
    })
    next.sort((a, b) => {
      const order = sortOf(a).localeCompare(sortOf(b), "fr")
      return sort === "za" ? -order : order
    })
    return next
  }, [onPageRequest, rows, query, chosen, sort, filters, searchOf, sortOf, period, from, to])

  const total = onPageRequest ? totalCount : visible.length
  const countLabel = `${total.toLocaleString("fr-FR")} ${total === 1 ? one : noun}`
  const pages = onPageRequest ? Math.max(1, pageCount) : Math.max(1, Math.ceil(visible.length / pageSize))
  const current = Math.min(page, pages)
  const start = (current - 1) * pageSize
  const slice = onPageRequest ? rows : visible.slice(start, start + pageSize)

  function reset() {
    setQuery("")
    setChosen({})
    setFrom("")
    setTo("")
    setSort("az")
    setPage(1)
  }

  return (
    <section className="grid gap-4">
      {stats?.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="rounded-panel border border-line bg-white p-4 shadow-card">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-control ${item.chip}`}>
                <Icon aria-hidden="true" size={22} />
              </span>
              <p className="mt-3 text-section text-heading">{item.value}</p>
              <p className="text-muted">{item.label}</p>
              <p className="mt-2 font-semibold text-available">{item.trend}</p>
            </article>
          )
        })}
      </div> : null}

      <article className="rounded-panel border border-line bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex flex-wrap items-center gap-3 text-section text-heading">
            {HeadingIcon ? <HeadingIcon aria-hidden="true" size={26} className="text-violet" /> : null}
            {heading}
            <span className="rounded-full bg-lavender px-3 py-1 text-body font-semibold text-violet">
              {countLabel}
            </span>
          </h2>
          {addTo ? (
            <Link to={addTo} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
              <Plus aria-hidden="true" size={18} />
              {addLabel}
            </Link>
          ) : addLabel ? (
            <button type="button" className="inline-flex items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
              <Plus aria-hidden="true" size={18} />
              {addLabel}
            </button>
          ) : null}
        </div>

        <div className={oneLine ? "mt-4 flex min-w-0 flex-nowrap items-center gap-2" : "mt-4 flex flex-wrap items-center gap-3"}>
          <label className={oneLine ? "relative min-w-0 flex-1" : "relative min-w-60 flex-1"}>
            <span className="sr-only">{placeholder}</span>
            <Search aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder={placeholder}
              className="w-full rounded-control border border-line bg-white pr-3 pl-10"
            />
          </label>
          {filters.map((filter) => (
            <label key={filter.id} className={oneLine ? "flex shrink-0 items-center" : "grid gap-1"}>
              <span className="sr-only">{filter.label}</span>
              <select
                aria-label={filter.label}
                value={chosen[filter.id] || ""}
                onChange={(event) => {
                  setChosen((current) => ({ ...current, [filter.id]: event.target.value }))
                  setPage(1)
                }}
                className={oneLine ? "w-28 max-w-28 rounded-control border border-line bg-white px-2" : "rounded-control border border-line bg-white px-3"}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {oneLine && option.value === "" ? filter.label : option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {period ? (
            <fieldset className={oneLine ? "flex shrink-0 items-center gap-2" : "grid gap-1"}>
              <legend className="font-semibold text-heading">Période</legend>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Du"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value)
                    setPage(1)
                  }}
                  className="rounded-control border border-line bg-white px-3"
                />
                <span className="text-muted">–</span>
                <input
                  type="date"
                  aria-label="Au"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value)
                    setPage(1)
                  }}
                  className="rounded-control border border-line bg-white px-3"
                />
              </div>
            </fieldset>
          ) : null}
          {showSort ? (
            <label className={oneLine ? "flex shrink-0 items-center" : "grid gap-1"}>
              <span className="sr-only">Ordre</span>
              <select
                aria-label="Ordre"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className={oneLine ? "w-32 max-w-32 rounded-control border border-line bg-white px-2" : "rounded-control border border-line bg-white px-3"}
              >
                <option value="az">Nom (A → Z)</option>
                <option value="za">Nom (Z → A)</option>
              </select>
            </label>
          ) : null}
          <button type="button" onClick={reset} aria-label="Réinitialiser" className="inline-flex shrink-0 items-center gap-2 self-end rounded-control border border-line px-3 font-semibold text-violet">
            <RotateCcw aria-hidden="true" size={18} />
            Réinitialiser
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left">
            <thead>
              <tr className="border-b border-line text-muted">
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-3 font-semibold">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-muted">{loading ? "Chargement…" : "Aucun résultat."}</td>
                </tr>
              ) : slice.map((row, index) => (
                <tr key={row.id} className="border-b border-line">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3">
                      {column.render(row, start + index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-muted">
            Afficher
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              className="rounded-control border border-line bg-white px-2"
              aria-label="Éléments par page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            éléments par page
          </label>
          <p className="text-muted">
            {total === 0 ? "0" : `${start + 1} – ${start + slice.length}`} sur {countLabel}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-line"
              aria-label="Page précédente"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-control bg-violet px-3 font-semibold text-white">
              {current}
            </span>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-line"
              aria-label="Page suivante"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </article>
    </section>
  )
}
