import { useEffect, useState } from "react"
import { BookOpen, Building2, CalendarDays, ChevronLeft, ChevronRight, Clock, Mail, MapPin, Megaphone, Newspaper, Phone } from "lucide-react"
import { Link } from "react-router"
import { getAnnouncements, getBooks, getEvents, getLibraryInfo, getPublications } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { SafeHtml } from "../components/ui/SafeHtml.jsx"
import { mapsEmbedSrc } from "../lib/maps.js"
import { richTextIsEmpty } from "../lib/richText.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

const PHOTOS = [
  "/images/hero/hero-960.webp",
  "/images/visuels/lecture.webp",
  "/images/visuels/lectures.webp",
  "/images/annonces/acquisitions.webp",
]

const numberFormat = new Intl.NumberFormat("fr-FR")

function loadAbout() {
  return Promise.all([getLibraryInfo(), getBooks(), getEvents(), getAnnouncements(), getPublications()]).then(
    ([library, catalog, events, announcements, publications]) => ({
      library,
      counts: [
        { label: "Livres", value: catalog.count, icon: BookOpen },
        { label: "Événements", value: events.length, icon: CalendarDays },
        { label: "Annonces", value: announcements.length, icon: Megaphone },
        { label: "Publications", value: publications.length, icon: Newspaper },
      ],
    }),
  )
}

export default function AboutPage() {
  usePageTitle("À propos")
  const state = useAsync(loadAbout, [])

  return (
    <div className="bg-canvas">
      <header className="page-hero relative overflow-hidden bg-brand text-on-brand">
        <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" data-theme-keep="" />
        <div className="absolute inset-0 bg-brand/85" aria-hidden="true" />
        <div className="relative px-4 py-10 sm:px-8 lg:px-14">
          <h1 className="text-page">À propos de la Bibliothèque Totanga</h1>
          <p className="mt-3 max-w-3xl text-lead">Un centre de savoir, de culture et d'échanges au service de la communauté.</p>
          <span className="mt-4 block h-1 w-16 rounded-full bg-brand-accent" aria-hidden="true" />
        </div>
      </header>
      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "À propos" }]} />
        <QueryState status={state.status} error={state.error}>
          {state.data ? <AboutContent library={state.data.library} counts={state.data.counts} /> : null}
        </QueryState>
      </div>
    </div>
  )
}

function AboutContent({ library, counts }) {
  const place = [library.address, library.city].filter(Boolean).join(", ")
  const mapSrc = mapsEmbedSrc({
    mapsUrl: library.mapsUrl,
    latitude: library.latitude,
    longitude: library.longitude,
    query: library.mapsUrl || place,
  })

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-stretch">
      <div className="order-2 flex min-h-0 min-w-0 flex-col gap-8 lg:order-1 lg:h-full">
        <PhotoCarousel />

        <section aria-labelledby="chiffres">
          <h2 id="chiffres" className="text-section text-heading">
            La bibliothèque en chiffres
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {counts.map((item) => (
              <li key={item.label} className="rounded-2xl border border-line bg-panel p-5 text-center shadow-card">
                <item.icon className="mx-auto h-6 w-6 text-violet" aria-hidden="true" />
                <p className="mt-3 text-section text-violet">{numberFormat.format(item.value)}</p>
                <p className="mt-1 text-meta text-muted">{item.label}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="fonctionnement-bibliotheque"
          className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-6"
          aria-labelledby="fonctionnement"
        >
          <h2 id="fonctionnement" className="flex shrink-0 items-center gap-2 text-section text-heading">
            <Building2 className="h-6 w-6 text-violet" aria-hidden="true" />
            Fonctionnement de la bibliothèque
          </h2>
          <p className="mt-2 shrink-0 text-meta font-semibold uppercase tracking-wide text-violet">Structure et fonctionnement</p>
          <div className="scrollbar-hidden mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {richTextIsEmpty(library.functioning) ? (
              <p className="text-article text-muted">Les informations de fonctionnement seront publiées prochainement.</p>
            ) : (
              <SafeHtml html={library.functioning} className="rich-text space-y-4 text-article text-ink" />
            )}
          </div>
        </section>

        <section className="mt-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand px-5 py-6 text-on-brand sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BookOpen className="h-8 w-8 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-card">Le catalogue de la bibliothèque</p>
              <p className="text-body text-on-brand/80">Consultez les livres disponibles sur place.</p>
            </div>
          </div>
          <Link to="/catalogue" className="inline-flex min-h-11 items-center rounded-full bg-panel px-4 font-semibold text-violet">
            Voir le catalogue
          </Link>
        </section>
      </div>

      <div className="order-1 flex min-h-0 min-w-0 flex-col gap-6 lg:order-2 lg:h-full">
        <aside
          className="flex min-h-[20rem] max-h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-card lg:max-h-none"
          aria-labelledby="histoire-bibliotheque"
        >
          <h2 id="histoire-bibliotheque" className="flex shrink-0 items-center gap-2 px-5 pt-5 text-section text-heading sm:px-6 sm:pt-6">
            <span className="h-6 w-1 rounded-full bg-violet" aria-hidden="true" />
            Histoire de la bibliothèque
          </h2>
          <div className="scrollbar-hidden mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">
            {richTextIsEmpty(library.about) ? (
              <p className="text-article text-muted">L'histoire de la bibliothèque sera publiée prochainement.</p>
            ) : (
              <SafeHtml html={library.about} className="rich-text space-y-4 text-article text-ink" />
            )}
          </div>
        </aside>

        <section id="contact-bibliotheque" className="mt-auto shrink-0 rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-6" aria-labelledby="nous-trouver">
          <h2 id="nous-trouver" className="flex items-center gap-2 text-section text-heading">
            <MapPin className="h-6 w-6 text-violet" aria-hidden="true" />
            Nous trouver
          </h2>
          {library.notice ? <p className="mt-3 text-meta font-semibold text-violet">{library.notice}</p> : null}
          <ul className="mt-4 space-y-3">
            {place ? (
              <li className="flex items-start gap-3 text-body text-heading">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
                <span>{place}</span>
              </li>
            ) : null}
            {library.phone ? (
              <li>
                <ContactLink href={phoneHref(library.phone)} icon={Phone}>
                  {library.phone}
                </ContactLink>
              </li>
            ) : null}
            {library.email ? (
              <li>
                <ContactLink href={mailHref(library.email)} icon={Mail}>
                  {library.email}
                </ContactLink>
              </li>
            ) : null}
            {library.hoursSummary ? (
              <li className="flex items-start gap-3 text-body text-heading">
                <Clock className="mt-1 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
                <span id="horaires-bibliotheque">{library.hoursSummary}</span>
              </li>
            ) : null}
          </ul>
          {!library.hoursSummary ? (
            <div className="mt-6">
              <h3 id="horaires-bibliotheque" className="text-card text-heading">
                Horaires d'ouverture
              </h3>
              <p className="mt-2 text-body text-muted">Les horaires seront publiés prochainement.</p>
            </div>
          ) : null}
          {mapSrc ? (
            <iframe
              title="Localisation de la Bibliothèque Totanga"
              src={mapSrc}
              className="mt-6 h-64 w-full rounded-2xl border border-line bg-lavender sm:h-72"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <p className="mt-6 flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl bg-lavender text-violet">
              <MapPin className="h-8 w-8" aria-hidden="true" />
              <span className="text-meta font-semibold">{library.city || "Kinshasa"}</span>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function PhotoCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReducedMotion(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (reducedMotion || paused) return undefined
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % PHOTOS.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [reducedMotion, paused])

  function show(step) {
    setIndex((current) => (current + step + PHOTOS.length) % PHOTOS.length)
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <img src={PHOTOS[index]} alt="" className="h-64 w-full rounded-2xl object-cover sm:h-80" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3 font-semibold text-violet" onClick={() => show(-1)} aria-label="Photo précédente">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Précédent
        </button>
        <p className="text-meta text-muted">
          {index + 1} / {PHOTOS.length}
        </p>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3 font-semibold text-violet" onClick={() => show(1)} aria-label="Photo suivante">
          Suivant
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function ContactLink({ href, icon: Icon, children }) {
  const content = (
    <>
      <Icon className="mt-1 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
      <span>{children}</span>
    </>
  )
  if (!href) return <p className="flex items-start gap-3 text-body text-heading">{content}</p>
  return (
    <a href={href} className="flex items-start gap-3 text-body text-heading hover:text-violet">
      {content}
    </a>
  )
}

function phoneHref(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "")
  if (!/^\+?[0-9]{8,15}$/.test(compact)) return null
  return `tel:${compact}`
}

function mailHref(email) {
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email || "")) return null
  return `mailto:${email}`
}
