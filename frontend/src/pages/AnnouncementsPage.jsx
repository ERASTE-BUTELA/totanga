import { useState } from "react"
import { Link } from "react-router"
import { BookOpen, ChevronRight, Clock, Filter, Info, LayoutGrid, Megaphone, Wrench } from "lucide-react"
import { getAnnouncements } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { AnnouncementsHero } from "../features/announcements/AnnouncementsHero.jsx"
import { announcementBadge, announcementGroup } from "../features/announcements/presentation.js"
import { formatDate } from "../lib/format.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

const FILTERS = [
  ["toutes", "Toutes les annonces", LayoutGrid],
  ["informations", "Informations générales", Info],
  ["acquisitions", "Nouvelles acquisitions", BookOpen],
  ["horaires", "Horaires et services", Clock],
  ["maintenance", "Maintenance et travaux", Wrench],
]

function featuredAnnouncement(items) {
  return items.find((item) => item.kind === "important") || items[0] || null
}

export default function AnnouncementsPage() {
  usePageTitle("Annonces")
  const state = useAsync(getAnnouncements, [])
  const [filter, setFilter] = useState("toutes")
  const announcements = [...(state.data || [])].sort((a, b) => String(b.publishedOn).localeCompare(String(a.publishedOn)))
  const featured = featuredAnnouncement(announcements)
  const showFeatured = Boolean(featured) && (filter === "toutes" || announcementGroup(featured) === filter)
  const items = announcements.filter((item) => {
    if (showFeatured && item.id === featured.id) return false
    return filter === "toutes" || announcementGroup(item) === filter
  })

  return (
    <div className="bg-canvas">
      <AnnouncementsHero />

      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Annonces" }]} />
        <QueryState status={state.status} error={state.error}>
          <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mt-6 sm:mx-0 sm:overflow-visible sm:px-0 lg:hidden" role="toolbar" aria-label="Filtrer les annonces">
            <ul className="flex w-max gap-2 pb-1">
              {FILTERS.map(([value, label, Icon]) => {
                const active = filter === value
                return (
                  <li key={value}>
                    <button
                      type="button"
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-meta font-semibold whitespace-nowrap ${
                        active ? "bg-violet text-on-primary" : "border border-line bg-panel text-ink"
                      }`}
                      onClick={() => setFilter(value)}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {value === "toutes" ? "Toutes" : label.split(" ")[0]}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="mt-5 grid gap-6 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
              {showFeatured ? <FeaturedAnnouncement item={featured} /> : null}
              {items.length === 0 && !showFeatured ? <p className="text-muted">Aucune annonce dans cette catégorie.</p> : null}
              <ul className="space-y-3 sm:space-y-4">
              {items.map((item) => {
                const badge = announcementBadge(item)
                const BadgeIcon = badge.icon
                return (
                  <li key={item.id}>
                    <article className="rounded-2xl border border-line bg-panel p-3 shadow-card sm:p-4">
                      <div className="flex gap-3 sm:flex-row sm:gap-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-xl object-cover sm:aspect-[16/10] sm:h-auto sm:w-56"
                          />
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                            <div className="min-w-0">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-badge ${badge.className}`}>
                                <BadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                {badge.label}
                              </span>
                              <h2 className="mt-1.5 text-meta font-bold text-heading sm:mt-2 sm:text-card">
                                <Link to={`/annonces/${item.slug}`} className="hover:text-violet">
                                  {item.title}
                                </Link>
                              </h2>
                              <p className="mt-1 text-badge text-muted sm:text-meta">{formatDate(item.publishedOn)}</p>
                            </div>
                            <Link
                              to={`/annonces/${item.slug}`}
                              className="hidden shrink-0 items-center gap-1 text-body font-bold text-violet sm:inline-flex"
                            >
                              Lire la suite
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </div>
                          <p className="excerpt mt-2 hidden text-body text-muted sm:mt-3 sm:block">{item.summary}</p>
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
              </ul>
            </div>

            <aside className="hidden space-y-4 lg:block">
              <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-labelledby="categories-annonces">
                <h2 id="categories-annonces" className="flex items-center gap-2 text-card text-ink">
                  <Filter className="h-5 w-5 text-violet" aria-hidden="true" />
                  Catégories
                </h2>
                <ul className="mt-4 space-y-1">
                  {FILTERS.map(([value, label, Icon]) => {
                    const count = value === "toutes" ? announcements.length : announcements.filter((item) => announcementGroup(item) === value).length
                    const active = filter === value
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          aria-pressed={active}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-body ${
                            active ? "bg-lavender font-semibold text-violet" : "text-ink hover:bg-canvas"
                          }`}
                          onClick={() => setFilter(value)}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1">{label}</span>
                          <span className="text-meta text-muted">({count})</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section className="rounded-2xl bg-lavender p-5" aria-labelledby="info-annonces">
                <h2 id="info-annonces" className="flex items-center gap-2 text-card text-violet">
                  <Info className="h-5 w-5" aria-hidden="true" />
                  Information importante
                </h2>
                <p className="mt-3 text-body text-ink">
                  Pour ne rien manquer des actualités de la bibliothèque, consultez régulièrement cette section.
                </p>
                <Megaphone className="ml-auto mt-4 h-10 w-10 text-violet" aria-hidden="true" />
              </section>
            </aside>
          </div>
        </QueryState>
      </div>
    </div>
  )
}

function FeaturedAnnouncement({ item }) {
  const badge = announcementBadge(item)
  const BadgeIcon = badge.icon
  return (
    <article className="rounded-2xl border border-line bg-panel p-4 shadow-card sm:p-5">
      <p className="text-badge font-semibold text-violet">À la une</p>
      {item.image ? <img src={item.image} alt="" className="mt-3 h-40 w-full rounded-xl object-cover sm:h-52" /> : null}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-badge ${badge.className}`}>
            <BadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {badge.label}
          </span>
          <h2 className="mt-2 text-section text-heading">
            <Link to={`/annonces/${item.slug}`} className="hover:text-violet">
              {item.title}
            </Link>
          </h2>
          <p className="mt-1 text-meta text-muted">{formatDate(item.publishedOn)}</p>
        </div>
        <Link to={`/annonces/${item.slug}`} className="inline-flex shrink-0 items-center gap-1 text-body font-bold text-violet">
          Lire la suite
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="mt-3 text-body text-muted">{item.summary}</p>
    </article>
  )
}
