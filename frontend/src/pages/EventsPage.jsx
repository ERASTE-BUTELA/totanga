import { useMemo, useState } from "react"
import { Link } from "react-router"
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, MapPin, Play, Search } from "lucide-react"
import { getEvents } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { eventDay, formatDate, formatTimeRange } from "../lib/format.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

const FILTERS = [
  ["tous", "Tous les événements", CalendarDays],
  ["avenir", "À venir", Clock],
  ["cours", "En cours", Play],
  ["passe", "Passés", Check],
]

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function dateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "")
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ""
}

function eventStatus(event, now) {
  const start = new Date(event.startsAt)
  const end = new Date(event.endsAt || event.startsAt)
  if (Number.isNaN(start.getTime())) return "avenir"
  if (now < start) return "avenir"
  if (now <= end) return "cours"
  return "passe"
}

function monthCells(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= count; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function monthTitle(year, month) {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function EventsPage() {
  usePageTitle("Événements")
  const state = useAsync(getEvents, [])
  const [filter, setFilter] = useState("tous")
  const [query, setQuery] = useState("")
  const [day, setDay] = useState("")
  const [cursor, setCursor] = useState(null)
  const events = useMemo(
    () => [...(state.data || [])].sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt))),
    [state.data],
  )
  const now = new Date()
  const firstKey = dateKey(events.find((event) => eventStatus(event, now) !== "passe")?.startsAt || events[0]?.startsAt)
  const shown = cursor || (firstKey ? { year: Number(firstKey.slice(0, 4)), month: Number(firstKey.slice(5, 7)) - 1 } : { year: now.getFullYear(), month: now.getMonth() })
  const needle = query.trim().toLocaleLowerCase("fr")
  const visible = events.filter((event) => {
    if (filter !== "tous" && eventStatus(event, now) !== filter) return false
    if (day && dateKey(event.startsAt) !== day) return false
    if (!needle) return true
    return `${event.title} ${event.summary} ${event.location}`.toLocaleLowerCase("fr").includes(needle)
  })
  const upcoming = events.filter((event) => eventStatus(event, now) !== "passe")
  const marked = new Set(events.map((event) => dateKey(event.startsAt)).filter((key) => key.startsWith(`${shown.year}-${String(shown.month + 1).padStart(2, "0")}`)))

  function shiftMonth(amount) {
    const next = new Date(shown.year, shown.month + amount, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <div className="bg-canvas">
      <header className="relative overflow-hidden bg-violet text-white">
        <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-violet/85" aria-hidden="true" />
        <div className="relative px-4 py-10 sm:px-8 lg:px-14">
          <h1 className="text-page">Événements</h1>
          <p className="mt-3 max-w-3xl text-lead">Conférences, ateliers, rencontres littéraires et autres activités de la bibliothèque.</p>
          <span className="mt-4 block h-1 w-16 rounded-full bg-gold-bright" aria-hidden="true" />
        </div>
      </header>

      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Événements" }]} />
        <QueryState status={state.status} error={state.error}>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
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
                          active ? "bg-violet text-white" : "border border-line bg-white text-violet"
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
                    className="w-full rounded-full border border-line bg-white pr-4 pl-10"
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

            <aside className="space-y-4">
              <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="calendrier-evenements">
                <h2 id="calendrier-evenements" className="flex items-center gap-2 text-card text-heading">
                  <CalendarDays className="h-5 w-5 text-violet" aria-hidden="true" />
                  Calendrier des événements
                </h2>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-violet" aria-label="Mois précédent" onClick={() => shiftMonth(-1)}>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <p className="text-body font-bold text-heading">{monthTitle(shown.year, shown.month)}</p>
                  <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-violet" aria-label="Mois suivant" onClick={() => shiftMonth(1)}>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1 text-center text-badge text-muted">
                  {WEEKDAYS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                  {monthCells(shown.year, shown.month).map((value, index) => {
                    if (!value) return <span key={`empty-${index}`} className="h-11" />
                    const key = `${shown.year}-${String(shown.month + 1).padStart(2, "0")}-${String(value).padStart(2, "0")}`
                    const hasEvent = marked.has(key)
                    const selected = day === key
                    if (!hasEvent) return <span key={key} className="inline-flex h-11 items-center justify-center text-body text-ink">{value}</span>
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${value} ${monthTitle(shown.year, shown.month)}`}
                        className={`inline-flex h-11 items-center justify-center rounded-lg bg-violet text-body font-bold text-white ${selected ? "ring-2 ring-gold-bright" : ""}`}
                        onClick={() => setDay(selected ? "" : key)}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="prochains-evenements">
                <h2 id="prochains-evenements" className="flex items-center gap-2 text-card text-heading">
                  <Clock className="h-5 w-5 text-violet" aria-hidden="true" />
                  Prochains événements
                </h2>
                {upcoming.length === 0 ? <p className="mt-4 text-body text-muted">Aucun événement à venir.</p> : null}
                <ul className="mt-3">
                  {upcoming.map((event) => {
                    const when = eventDay(event.startsAt)
                    return (
                      <li key={event.id} className="border-b border-line last:border-b-0">
                        <Link to={`/evenements/${event.slug}`} className="flex items-center gap-3 py-3">
                          {when ? (
                            <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-violet text-white">
                              <span className="text-card">{when.day}</span>
                              <span className="text-badge">{when.month}</span>
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 block text-body font-bold text-heading">{event.title}</span>
                            <span className="mt-1 block text-meta text-muted">{formatTimeRange(event.startsAt, event.endsAt)}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </aside>
          </div>
        </QueryState>
      </div>
    </div>
  )
}

function EventListCard({ event }) {
  const when = eventDay(event.startsAt)
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card sm:flex-row">
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
        <Link to={`/evenements/${event.slug}`} className="mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-violet px-4 font-semibold text-white">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Voir les détails
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
