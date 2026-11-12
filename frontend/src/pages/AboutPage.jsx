import { useEffect, useState } from "react"
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Mail, MapPin, Megaphone, Newspaper, Phone } from "lucide-react"
import { Link } from "react-router"
import { getAnnouncements, getBooks, getEvents, getLibraryInfo, getPublications } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { SafeHtml } from "../components/ui/SafeHtml.jsx"
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
      <header className="relative overflow-hidden bg-violet text-white">
        <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-violet/85" aria-hidden="true" />
        <div className="relative px-4 py-10 sm:px-8 lg:px-14">
          <h1 className="text-page">À propos de la Bibliothèque Totanga</h1>
          <p className="mt-3 max-w-3xl text-lead">Un centre de savoir, de culture et d'échanges au service de la communauté.</p>
          <span className="mt-4 block h-1 w-16 rounded-full bg-gold-bright" aria-hidden="true" />
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

  return (
    <>
      <section className="mt-6 grid items-start gap-6 lg:grid-cols-2" aria-labelledby="notre-bibliotheque">
        <PhotoCarousel />
        <div>
          <h2 id="notre-bibliotheque" className="flex items-center gap-2 text-section text-heading">
            <span className="h-6 w-1 rounded-full bg-violet" aria-hidden="true" />
            Notre bibliothèque
          </h2>
          {richTextIsEmpty(library.about) ? (
            <p className="mt-4 text-article text-muted">La présentation de la bibliothèque sera publiée prochainement.</p>
          ) : (
            <SafeHtml html={library.about} className="rich-text mt-4 space-y-4 text-article text-ink" />
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="chiffres">
        <h2 id="chiffres" className="text-section text-heading">
          La bibliothèque en chiffres
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((item) => (
            <li key={item.label} className="rounded-2xl border border-line bg-white p-5 text-center shadow-card">
              <item.icon className="mx-auto h-6 w-6 text-violet" aria-hidden="true" />
              <p className="mt-3 text-section text-violet">{numberFormat.format(item.value)}</p>
              <p className="mt-1 text-meta text-muted">{item.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="contact-bibliotheque" className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="nous-trouver">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div>
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
            </ul>
            <h3 id="horaires-bibliotheque" className="mt-6 text-card text-heading">
              Horaires d'ouverture
            </h3>
            {library.hoursSummary ? <p className="mt-2 text-body text-ink">{library.hoursSummary}</p> : null}
            <ul className="mt-3 space-y-2">
              {library.hours.map((slot) => (
                <li key={slot.label} className="flex justify-between gap-4 border-b border-line py-2 text-body last:border-b-0">
                  <span className="font-semibold text-heading">{slot.label}</span>
                  <span className="text-muted">{slot.closed ? "Fermé" : `${slot.opens} – ${slot.closes}`}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-lavender text-violet">
            <MapPin className="h-8 w-8" aria-hidden="true" />
            <span className="text-meta font-semibold">{library.city || "Kinshasa"}</span>
          </p>
        </div>
      </section>

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-violet px-5 py-6 text-white sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BookOpen className="h-8 w-8 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-card">Le catalogue de la bibliothèque</p>
            <p className="text-body text-lavender">Consultez les livres disponibles sur place.</p>
          </div>
        </div>
        <Link to="/catalogue" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 font-semibold text-violet">
          Voir le catalogue
        </Link>
      </section>
    </>
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
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 font-semibold text-violet" onClick={() => show(-1)} aria-label="Photo précédente">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Précédent
        </button>
        <p className="text-meta text-muted">
          {index + 1} / {PHOTOS.length}
        </p>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 font-semibold text-violet" onClick={() => show(1)} aria-label="Photo suivante">
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
