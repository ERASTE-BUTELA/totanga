import { useMemo, useState } from "react"
import { Link } from "react-router"
import { CalendarDays, Check, ChevronRight, Clock, MapPin, Play, Search } from "lucide-react"
import { getEvents } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { eventDay, formatDate, formatTimeRange } from "../lib/format.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

const FILTERS = [
  ["tous", "Tous", CalendarDays],
  ["avenir", "À venir", Clock],
  ["cours", "En cours", Play],
  ["passe", "Passés", Check],
]

function eventStatus(event, now) {
  const start = new Date(event.startsAt)
  const end = new Date(event.endsAt || event.startsAt)
  if (Number.isNaN(start.getTime())) return "avenir"
  if (now < start) return "avenir"
  if (now <= end) return "cours"
  return "passe"
}

export default function EventsPage() {
  usePageTitle("Événements")
  const state = useAsync(getEvents, [])
  const [filter, setFilter] = useState("tous")
  const [query, setQuery] = useState("")
  const events = useMemo(
    () => [...(state.data || [])].sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt))),
    [state.data],
  )
  const now = new Date()
  const needle = query.trim().toLocaleLowerCase("fr")
  const visible = events.filter((event) => {
    if (filter !== "tous" && eventStatus(event, now) !== filter) return false
    if (!needle) return true
    return `${event.title} ${event.summary} ${event.location}`.toLocaleLowerCase("fr").includes(needle)
  })

  return (
    <div className="bg-canvas">
      <header className="page-hero relative overflow-hidden bg-brand text-on-brand">
        <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" data-theme-keep="" />
        <div className="absolute inset-0 bg-brand/85" aria-hidden="true" />
        <div className="relative px-4 py-10 sm:px-8 lg:px-14">
          <h1 className="text-page">Événements</h1>
          <p className="mt-3 max-w-3xl text-lead">Conférences, ateliers, rencontres littéraires et autres activités de la bibliothèque.</p>
          <span className="mt-4 block h-1 w-16 rounded-full bg-brand-accent" aria-hidden="true" />
        </div>
      </header>

      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Événements" }]} />
        <QueryState status={state.status} error={state.error}>
          <div className="mt-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les événements">
                {FILTERS.map(([value, label, Icon]) => {
                  const active = filter === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-full px-4 text-body font-semibold ${
                        active ? "bg-violet text-on-primary" : "border border-line bg-panel text-violet"
                      }`}
                      onClick={() => setFilter(value)}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </button>
                  )
                })}
              </div>
              <form
                key={query}
                className="relative w-full xl:max-w-xs"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  setQuery(String(new FormData(event.currentTarget).get("q") || ""))
                }}
              >
                <label htmlFor="recherche-evenement" className="sr-only">
                  Rechercher un événement
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="recherche-evenement"
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Rechercher un événement…"
                  className="w-full rounded-full border border-line bg-panel pr-4 pl-10"
                />
              </form>
            </div>

            {visible.length === 0 ? (
              <p className="mt-6 text-muted">Aucun événement ne correspond.</p>
            ) : (
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {visible.map((event) => (
                  <li key={event.id}>
                    <EventListCard event={event} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </QueryState>
      </div>
    </div>
  )
}

function EventListCard({ event }) {
  const when = eventDay(event.startsAt)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-card sm:flex-row">
      {event.image ? (
        <img src={event.image} alt="" className="aspect-[16/10] w-full object-cover sm:aspect-auto sm:w-40 sm:shrink-0" />
      ) : when ? (
        <span className="flex aspect-[16/10] w-full flex-col items-center justify-center bg-lavender text-violet sm:aspect-auto sm:w-40 sm:shrink-0">
          <span className="text-section">{when.day}</span>
          <span className="text-badge">{when.month}</span>
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h2 className="text-card text-heading">
          <Link to={`/evenements/${event.slug}`} className="hover:text-violet">
            {event.title}
          </Link>
        </h2>
        {event.typeLabel ? <p className="mt-1 font-semibold text-violet">{event.typeLabel}</p> : null}
        <ul className="mt-2 space-y-1 text-meta text-muted">
          <li className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(event.startsAt)}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatTimeRange(event.startsAt, event.endsAt)}
          </li>
          {event.location ? (
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {event.location}
            </li>
          ) : null}
        </ul>
        <p className="excerpt mt-3 text-body text-muted">{event.summary}</p>
        <Link to={`/evenements/${event.slug}`} className="mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-violet px-4 font-semibold text-on-primary">
          Voir les détails
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
