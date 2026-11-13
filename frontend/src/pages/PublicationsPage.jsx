import { useMemo, useState } from "react"
import { Link } from "react-router"
import { BookOpen, Building2, Calendar, ChevronRight, Filter, Search, Star } from "lucide-react"
import { getPublications } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { fixtures } from "../data/fixtures.js"
import { PublicationsHero } from "../features/publications/PublicationsHero.jsx"
import { publicationKind } from "../features/publications/presentation.js"
import { formatDate } from "../lib/format.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

export default function PublicationsPage() {
  usePageTitle("Publications")
  const state = useAsync(getPublications, [])
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState("")
  const items = useMemo(
    () => [...(state.data || [])].sort((a, b) => String(b.publishedOn).localeCompare(String(a.publishedOn))),
    [state.data],
  )
  const kinds = useMemo(() => [...new Set(items.map((item) => item.kind).filter(Boolean))], [items])
  const needle = query.trim().toLocaleLowerCase("fr")
  const visible = items.filter((item) => {
    if (kind && item.kind !== kind) return false
    if (!needle) return true
    return `${item.title} ${item.summary}`.toLocaleLowerCase("fr").includes(needle)
  })
  const featured = items[0]

  return (
    <div className="bg-canvas">
      <PublicationsHero />

      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Publications" }]} />
        <QueryState status={state.status} error={state.error}>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <h2 className="text-section text-heading">Toutes les publications</h2>
                <form
                  key={query}
                  className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-xl"
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault()
                    setQuery(String(new FormData(event.currentTarget).get("q") || ""))
                  }}
                >
                  <label htmlFor="recherche-publication" className="sr-only">
                    Rechercher une publication
                  </label>
                  <span className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input
                      id="recherche-publication"
                      name="q"
                      type="search"
                      defaultValue={query}
                      placeholder="Rechercher une publication…"
                      className="w-full rounded-full border border-line bg-panel pr-4 pl-10"
                    />
                  </span>
                  <button type="submit" className="rounded-xl bg-violet px-5 font-semibold text-on-primary">
                    Rechercher
                  </button>
                </form>
              </div>

              {visible.length === 0 ? (
                <p className="mt-6 text-muted">Aucune publication ne correspond à cette recherche.</p>
              ) : (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visible
                    .slice()
                    .sort((a, b) => Number(b.id === featured?.id) - Number(a.id === featured?.id))
                    .map((item) => (
                      <li key={item.id}>
                        <PublicationCard item={item} featured={item.id === featured?.id} />
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-labelledby="categories-publications">
                <h2 id="categories-publications" className="flex items-center gap-2 text-card text-ink">
                  <Filter className="h-5 w-5 text-violet" aria-hidden="true" />
                  Catégories
                </h2>
                <ul className="mt-4 space-y-1">
                  <li>
                    <CategoryButton label="Toutes" count={items.length} active={kind === ""} icon={BookOpen} onClick={() => setKind("")} />
                  </li>
                  {kinds.map((value) => (
                    <li key={value}>
                      <CategoryButton
                        label={value}
                        count={items.filter((item) => item.kind === value).length}
                        active={kind === value}
                        icon={publicationKind(value).icon}
                        onClick={() => setKind(value)}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              {featured ? (
                <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-labelledby="publication-une">
                  <h2 id="publication-une" className="flex items-center gap-2 text-card text-heading">
                    <Star className="h-5 w-5 text-violet" aria-hidden="true" />
                    Publication à la une
                  </h2>
                  {featured.image ? (
                    <img src={featured.image} alt="" className="mt-4 h-36 w-full rounded-xl object-cover" />
                  ) : null}
                  <h3 className="mt-4 text-card text-heading">
                    <Link to={`/publications/${featured.slug}`} className="hover:text-violet">
                      {featured.title}
                    </Link>
                  </h3>
                  <p className="excerpt mt-2 text-body text-muted">{featured.summary}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-meta text-muted">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(featured.publishedOn)}
                  </p>
                  <Link
                    to={`/publications/${featured.slug}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-xl bg-violet px-4 font-semibold text-on-primary"
                  >
                    Lire l'article
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </section>
              ) : null}
            </aside>
          </div>
        </QueryState>
      </div>
    </div>
  )
}

function PublicationCard({ item, featured = false }) {
  const badge = publicationKind(item.kind)
  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-panel shadow-card ${featured ? "border-violet" : "border-line"}`}>
      <div className="relative">
        {item.image ? <img src={item.image} alt="" className="aspect-[16/10] w-full object-cover" /> : <div className="aspect-[16/10] bg-lavender" />}
        {featured ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-violet px-2.5 py-1 text-badge text-on-primary">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            À la une
          </span>
        ) : null}
        {item.kind ? (
          <span className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-badge ${badge.className}`}>{item.kind}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-card text-heading">
          <Link to={`/publications/${item.slug}`} className="hover:text-violet">
            {item.title}
          </Link>
        </h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(item.publishedOn)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            {fixtures.library.name}
          </span>
        </p>
        <p className="excerpt mt-3 text-body text-muted">{item.summary}</p>
        <Link to={`/publications/${item.slug}`} className="mt-auto inline-flex items-center gap-1 pt-3 text-body font-bold text-violet">
          Lire la suite
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function CategoryButton({ label, count, active, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-body ${
        active ? "bg-lavender font-semibold text-violet" : "text-ink hover:bg-canvas"
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="text-meta text-muted">({count})</span>
    </button>
  )
}
