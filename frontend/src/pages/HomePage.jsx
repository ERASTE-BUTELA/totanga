import { Link, useNavigate } from "react-router"
import { BookOpen, Calendar, CalendarDays, ChevronRight, Landmark, LayoutGrid, Megaphone, Newspaper, Search, Smile, Star } from "lucide-react"
import { getAnnouncements, getBooks, getCategories, getEvents, getPublications } from "../api/client.js"
import { BookCard } from "../components/cards/BookCard.jsx"
import { Panel } from "../components/ui/Panel.jsx"
import { EventCard } from "../components/cards/EventCard.jsx"
import { HomeContact } from "../components/home/HomeContact.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { useAsync } from "../lib/useAsync.js"
import { formatDate } from "../lib/format.js"
import { usePageTitle } from "../lib/usePageTitle.js"

function loadHome() {
  return Promise.all([getBooks(), getCategories(), getAnnouncements(), getPublications(), getEvents()]).then(
    ([catalog, categories, announcements, publications, events]) => ({
      books: catalog.books,
      bookCount: catalog.count,
      categories,
      announcements,
      publications,
      events,
    }),
  )
}

const CATEGORY_ICONS = {
  roman: BookOpen,
  jeunesse: Smile,
  histoire: Landmark,
}

function bookCountLabel(count) {
  if (count === 0) return "Aucun livre référencé"
  if (count === 1) return "1 livre référencé"
  return `${count} livres référencés`
}

function kindLabel(item) {
  if (item.important || item.kind === "important") return "Important"
  if (item.categoryLabel) return item.categoryLabel
  if (/horaire/i.test(item.title)) return "Horaires"
  return "Nouveauté"
}

function kindTone(item) {
  if (item.important || item.kind === "important") return { text: "text-unavailable", bar: "bg-unavailable" }
  if (item.category === "horaires" || /horaire/i.test(item.title)) return { text: "text-gold", bar: "bg-gold" }
  if (item.category === "maintenance") return { text: "text-violet", bar: "bg-violet" }
  return { text: "text-available", bar: "bg-available" }
}

function byDateDesc(items) {
  return [...items].sort((a, b) => String(b.publishedOn).localeCompare(String(a.publishedOn)))
}

function featuredAnnouncement(items) {
  const sorted = byDateDesc(items)
  return sorted.find((item) => item.kind === "important") || sorted[0] || null
}

function homeAnnouncements(items) {
  const featured = featuredAnnouncement(items)
  if (!featured) return []
  const next = byDateDesc(items).find((item) => item.id !== featured.id)
  return next ? [featured, next] : [featured]
}

function featuredPublication(items) {
  const sorted = byDateDesc(items)
  return sorted.find((item) => item.featured) || sorted[0] || null
}

export default function HomePage() {
  usePageTitle("Accueil")
  const navigate = useNavigate()
  const state = useAsync(loadHome, [])

  function onSearch(event) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get("q") || "").trim()
    const params = new URLSearchParams()
    if (value) params.set("q", value)
    navigate(params.toString() ? `/catalogue?${params}` : "/catalogue")
  }

  return (
    <>
      <QueryState status={state.status} error={state.error}>
        {state.data ? <HomeContent data={state.data} onSearch={onSearch} /> : null}
      </QueryState>
      <HomeContact />
    </>
  )
}

function HomeContent({ data, onSearch }) {
  const { books, bookCount, categories, announcements, publications, events } = data
  const upcomingEvents = events.filter((event) => {
    const end = new Date(event.endsAt || event.startsAt)
    return !Number.isNaN(end.getTime()) && end >= new Date()
  })
  const shortcuts = [
    { to: "/catalogue", title: "Consulter le catalogue", short: "Catalogue", text: bookCountLabel(bookCount), icon: BookOpen, gold: true },
    { to: "/annonces", title: "Suivre les annonces", short: "Annonces", text: "Restez informé des actualités", icon: Megaphone },
    { to: "/evenements", title: "Participer aux événements", short: "Événements", text: "Conférences, ateliers, clubs de lecture", icon: CalendarDays },
    { to: "/publications", title: "Lire nos publications", short: "Publications", text: "Articles, recommandations et plus", icon: Newspaper },
  ]

  return (
    <div>
      <section className="relative overflow-hidden bg-[#140e12] text-on-bar md:h-[clamp(26rem,calc(100svh-16.5rem),34rem)]">
        <img
          src="/images/hero/hero-1024.webp"
          srcSet="/images/hero/hero-640.webp 640w, /images/hero/hero-960.webp 960w, /images/hero/hero-1024.webp 1024w"
          sizes="100vw"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
          data-theme-keep=""
        />
        <div className="absolute inset-0 bg-black/50 md:bg-transparent md:bg-gradient-to-r md:from-black/75 md:via-black/40 md:to-transparent" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-center px-4 py-6 sm:px-8 lg:px-14">
          <h1 className="max-w-4xl text-display">Bibliothèque Totanga</h1>
          <p className="mt-3 max-w-3xl text-lead md:mt-4">Un espace de savoir, de culture et de découverte à Kinshasa.</p>
          <span className="mt-4 hidden h-1 w-16 rounded-full bg-gold-bright md:block" aria-hidden="true" />
          <form onSubmit={onSearch} className="mt-5 w-full max-w-4xl md:mt-6" role="search">
            <label htmlFor="recherche-accueil" className="sr-only">
              Rechercher un livre
            </label>
            <div className="flex items-center rounded-full bg-panel p-1.5 shadow-card md:rounded-2xl">
              <Search className="ml-3 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              <input
                id="recherche-accueil"
                name="q"
                type="search"
                placeholder="Rechercher un livre (titre, auteur, mot-clé...)"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-ink outline-none md:py-3"
              />
              <button type="submit" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet text-on-primary md:hidden" aria-label="Rechercher">
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="submit" className="hidden shrink-0 rounded-xl bg-violet px-5 py-3 font-semibold text-on-primary md:inline-flex">
                Rechercher
              </button>
            </div>
          </form>
          <div className="mt-4 hidden flex-wrap items-center gap-3 pb-1 md:flex">
            <p className="shrink-0 text-body">Explorer par catégorie :</p>
            <ul className="flex flex-wrap items-center gap-2">
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.slug] || BookOpen
                return (
                  <li key={category.id}>
                    <Link
                      to={`/catalogue?categorie=${encodeURIComponent(category.slug)}`}
                      className="inline-flex items-center gap-2 rounded-full border border-on-bar/80 bg-black/40 px-3 py-1.5 text-badge text-on-bar"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {category.name}
                    </Link>
                  </li>
                )
              })}
              <li>
                <Link
                  to="/catalogue"
                  className="inline-flex items-center gap-2 rounded-full border border-on-bar/80 bg-black/40 px-3 py-1.5 text-badge text-on-bar"
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  Toutes les catégories
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <nav aria-label="Accès rapides" className="bg-canvas px-4 py-4 md:border-b md:border-line md:bg-panel md:px-8 md:py-0 lg:px-14">
        <ul className="grid grid-cols-2 gap-3 md:gap-0 lg:grid-cols-4">
          {shortcuts.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex h-full min-w-0 flex-col items-center gap-3 rounded-2xl bg-panel px-3 py-5 text-center shadow-card md:flex-row md:items-center md:rounded-none md:bg-transparent md:px-2 md:text-left md:shadow-none"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl md:bg-lavender md:text-violet ${
                    item.gold ? "bg-gold-bright text-heading" : "bg-violet text-on-primary"
                  }`}
                >
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-card text-ink md:hidden">{item.short}</span>
                  <span className="hidden text-card text-ink md:block">{item.title}</span>
                  <span className="mt-1 hidden text-meta text-muted md:block">{item.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-8 bg-canvas px-4 py-8 sm:px-8 lg:grid-cols-3 lg:px-14">
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-8">
        <Panel labelledBy="livres-catalogue" className="order-1 lg:order-none">
          <PanelHeading id="livres-catalogue" title="Livres du catalogue" to="/catalogue" linkLabel="Voir tout" icon={BookOpen} />
          {books.length === 0 ? (
            <p className="text-muted">Aucun livre n'est publié pour le moment.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 lg:grid-cols-4">
              {books.slice(0, 8).map((book) => (
                <li key={book.id}>
                  <BookCard book={book} plain />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel labelledBy="evenements-accueil" className="order-3 lg:order-none">
          <PanelHeading id="evenements-accueil" title="Prochains événements" to="/evenements" linkLabel="Voir tous" icon={CalendarDays} />
          {upcomingEvents.length === 0 ? (
            <p className="text-muted">Aucun événement à venir.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                  <EventCard event={event} plain />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        </div>

        <div className="contents lg:flex lg:h-0 lg:min-h-full lg:flex-col lg:gap-8">
          <Panel labelledBy="annonces-accueil" className="order-2 lg:order-none">
            <PanelHeading id="annonces-accueil" title="Annonces" to="/annonces" linkLabel="Voir toutes" icon={Megaphone} />
            <ul className="divide-y divide-line">
              {homeAnnouncements(announcements).map((item) => {
                const tone = kindTone(item)
                const featured = item.id === featuredAnnouncement(announcements)?.id
                return (
                  <li key={item.id}>
                    <Link
                      to={`/annonces/${item.slug}`}
                      className={`group -mx-3 grid grid-cols-[0.25rem_minmax(0,1fr)] gap-x-3 rounded-lg px-3 py-4 transition-colors hover:bg-violet/10 ${featured ? "bg-lavender/70" : ""}`}
                    >
                      <span className={`self-stretch ${tone.bar}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {featured ? (
                              <span className="inline-flex items-center gap-1 text-badge text-violet">
                                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                                À la une
                              </span>
                            ) : null}
                            <span className={`text-badge ${tone.text}`}>{kindLabel(item)}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-meta text-muted">
                            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {formatDate(item.publishedOn)}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-cover text-heading group-hover:text-violet">{item.title}</span>
                        <span className="excerpt mt-1 block text-body text-muted">{item.summary}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Panel labelledBy="publications-accueil" className="order-4 flex flex-col lg:order-none lg:min-h-0 lg:flex-1">
            <PanelHeading id="publications-accueil" title="Dernières publications" to="/publications" linkLabel="Voir toutes" icon={Newspaper} />
            <ul className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
              {byDateDesc(publications).map((item) => {
                const featured = item.id === featuredPublication(publications)?.id
                return (
                <li key={item.id} className="lg:flex lg:min-h-0 lg:flex-1">
                  <Link to={`/publications/${item.slug}`} className="group relative block rounded-lg lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    {item.image ? (
                      <img src={item.image} alt="" className="aspect-[3/2] w-full rounded-lg object-cover shadow-cover lg:aspect-auto lg:min-h-0 lg:flex-1" />
                    ) : null}
                    {featured ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-violet px-2.5 py-1 text-badge text-on-primary">
                        <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        À la une
                      </span>
                    ) : null}
                    <span className="mt-2 block text-cover text-heading group-hover:text-violet">{item.title}</span>
                    <span className="mt-1 block text-meta text-muted">{formatDate(item.publishedOn)}</span>
                  </Link>
                </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function PanelHeading({ id, title, to, linkLabel, icon: Icon }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="flex min-w-0 items-center gap-2 text-panel text-heading">
        <Icon className="h-6 w-6 shrink-0 text-gold-bright" aria-hidden="true" />
        {title}
      </h2>
      <Link to={to} className="ml-auto inline-flex items-center gap-1 text-body font-bold text-violet">
        {linkLabel}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
