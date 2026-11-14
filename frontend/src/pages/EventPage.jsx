import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { CalendarDays, ChevronLeft, Clock, Info, MapPin, Share2, SquarePen } from "lucide-react"
import { getEventBySlug } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { ExternalLink } from "../components/ui/ExternalLink.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { eventDay, formatDate, formatTimeRange } from "../lib/format.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

function loadEvent(slug) {
  return getEventBySlug(slug).then((item) => ({ item }))
}

function shareTargets(url, title) {
  const page = encodeURIComponent(url)
  const text = encodeURIComponent(title)
  return [
    { name: "Facebook", label: "Partager sur Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${page}`, className: "text-[#1877f2]", icon: IconFacebook },
    { name: "X", label: "Partager sur X", href: `https://twitter.com/intent/tweet?url=${page}&text=${text}`, className: "text-ink", icon: IconX },
    { name: "LinkedIn", label: "Partager sur LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${page}`, className: "text-[#0a66c2]", icon: IconLinkedIn },
    { name: "WhatsApp", label: "Partager sur WhatsApp", href: `https://wa.me/?text=${text}%20${page}`, className: "text-[#128c7e]", icon: IconWhatsApp },
  ]
}

export default function EventPage() {
  const { slug } = useParams()
  const state = useAsync(() => loadEvent(slug), [slug])
  const item = state.data?.item
  usePageTitle(item ? item.title : "Événement introuvable")

  return (
    <div className="bg-canvas">
      <header className="page-hero relative overflow-hidden bg-brand text-on-brand">
        <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" data-theme-keep="" />
        <div className="absolute inset-0 bg-brand/85" aria-hidden="true" />
        <div className="relative px-4 py-10 sm:px-8 lg:px-14">
          <p className="text-page">Événements</p>
          <p className="mt-3 max-w-3xl text-lead">Conférences, ateliers, rencontres littéraires et autres activités de la bibliothèque.</p>
          <span className="mt-4 block h-1 w-16 rounded-full bg-brand-accent" aria-hidden="true" />
        </div>
      </header>
      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <QueryState status={state.status} error={state.error}>
          {state.data ? <EventContent item={item} /> : null}
        </QueryState>
      </div>
    </div>
  )
}

function programmeLines(value) {
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean)
}

function EventContent({ item }) {
  if (!item) {
    return (
      <section>
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Événements", to: "/evenements" }, { label: "Introuvable" }]} />
        <div className="mt-6 max-w-3xl rounded-2xl border border-line bg-panel p-6 shadow-card">
          <h1 className="text-page text-ink">Cet événement est introuvable</h1>
          <Link to="/evenements" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-violet px-4 font-semibold text-violet">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Retour aux événements
          </Link>
        </div>
      </section>
    )
  }

  const when = eventDay(item.startsAt)
  const facts = [
    { icon: CalendarDays, label: "Date", value: formatDate(item.startsAt) },
    { icon: Clock, label: "Heure", value: formatTimeRange(item.startsAt, item.endsAt) },
    { icon: MapPin, label: "Lieu", value: item.location },
  ].filter((fact) => fact.value)

  return (
    <div>
      <Breadcrumb
        withHome
        items={[
          { label: "Accueil", to: "/" },
          { label: "Événements", to: "/evenements" },
          { label: item.title },
        ]}
      />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-6">
          <h1 className="text-page text-heading">{item.title}</h1>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-meta text-muted">
            {facts.map((fact) => (
              <li key={fact.label} className="inline-flex items-center gap-2">
                <fact.icon className="h-4 w-4 text-violet" aria-hidden="true" />
                {fact.value}
              </li>
            ))}
          </ul>
          {item.image ? (
            <img src={item.image} alt="" className="mt-5 h-56 w-full rounded-xl object-cover sm:h-72" />
          ) : when ? (
            <p className="mt-5 flex h-28 w-28 flex-col items-center justify-center rounded-xl bg-lavender text-violet">
              <span className="text-section">{when.day}</span>
              <span className="text-badge">{when.month}</span>
            </p>
          ) : null}
          {item.summary ? (
            <section className="mt-6" aria-labelledby="description-evenement">
              <h2 id="description-evenement" className="flex items-center gap-2 text-card text-heading">
                <span className="h-5 w-1 rounded-full bg-violet" aria-hidden="true" />
                Description
              </h2>
              <p className="mt-3 text-article text-ink">{item.summary}</p>
            </section>
          ) : null}
          {item.typeLabel ? <p className="mt-4 font-semibold text-violet">{item.typeLabel}</p> : null}
          {programmeLines(item.programme).length > 0 ? (
            <section className="mt-6" aria-labelledby="programme-evenement">
              <h2 id="programme-evenement" className="flex items-center gap-2 text-card text-heading">
                <span className="h-5 w-1 rounded-full bg-violet" aria-hidden="true" />
                Programme
              </h2>
              <ul className="mt-3 grid list-disc gap-2 pl-5 text-article text-ink">
                {programmeLines(item.programme).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>
          ) : null}
          {item.speakers?.length ? (
            <section className="mt-6" aria-labelledby="intervenants-evenement">
              <h2 id="intervenants-evenement" className="flex items-center gap-2 text-card text-heading">
                <span className="h-5 w-1 rounded-full bg-violet" aria-hidden="true" />
                Intervenants
              </h2>
              <ul className="mt-3 grid gap-3">
                {item.speakers.map((speaker) => (
                  <li key={`${speaker.position}-${speaker.name}`} className="flex items-center gap-3">
                    {speaker.photo ? <img src={speaker.photo} alt="" className="h-14 w-14 rounded-full object-cover" /> : null}
                    <span>
                      <span className="block font-semibold text-heading">{speaker.name}</span>
                      {speaker.title ? <span className="text-muted">{speaker.title}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <Link to="/evenements" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-violet px-4 font-semibold text-violet">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Retour aux événements
          </Link>
        </article>

        <aside className="space-y-4">
          {item.registrationUrl ? (
            <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-labelledby="participer-evenement">
              <h2 id="participer-evenement" className="flex items-center gap-2 text-card text-heading">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-lavender text-violet">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </span>
                Participer à l'événement
              </h2>
              <p className="mt-3 text-body text-muted">L'inscription se fait sur la page indiquée par la bibliothèque.</p>
              <ExternalLink href={item.registrationUrl} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet px-4 font-semibold text-on-primary">
                <SquarePen className="h-4 w-4" aria-hidden="true" />
                S'inscrire maintenant
              </ExternalLink>
            </section>
          ) : null}

          <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-labelledby="infos-evenement">
            <h2 id="infos-evenement" className="flex items-center gap-2 text-card text-heading">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-lavender text-violet">
                <Info className="h-5 w-5" aria-hidden="true" />
              </span>
              Informations pratiques
            </h2>
            <dl className="mt-2">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
                  <dt className="inline-flex items-center gap-2 text-body text-muted">
                    <fact.icon className="h-4 w-4 text-violet" aria-hidden="true" />
                    {fact.label}
                  </dt>
                  <dd className="min-w-0 text-right text-body font-semibold text-heading">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <SharePanel title={item.title} />
        </aside>
      </div>
    </div>
  )
}

function SharePanel({ title }) {
  const [pageUrl, setPageUrl] = useState("")

  useEffect(() => {
    setPageUrl(window.location.href)
  }, [title])

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-labelledby="partager-evenement">
      <h2 id="partager-evenement" className="flex items-center gap-2 text-card text-heading">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-lavender text-violet">
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </span>
        Partager cet événement
      </h2>
      {pageUrl ? (
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {shareTargets(pageUrl, title).map((target) => {
            const Icon = target.icon
            return (
              <li key={target.name}>
                <ExternalLink
                  href={target.href}
                  label={target.label}
                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 text-badge font-semibold ${target.className}`}
                >
                  <Icon className="h-4 w-4" />
                  {target.name}
                </ExternalLink>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

function IconFacebook({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M14.2 8.5V6.9c0-.7.4-1 1.1-1H17V3.2h-2.2C12.1 3.2 11 4.5 11 6.7v1.8H9V11h2v8.8h3.2V11h2.2l.3-2.5h-2.5z" />
    </svg>
  )
}

function IconX({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M14.7 10.4 21.4 3h-1.6l-5.8 6.4L9.2 3H3.4l7 10-7 7.6h1.6l6.2-6.8 4.9 6.8h5.8l-7.2-10.2Zm-2.2 2.4-.7-1-5.6-7.7h2.4l4.5 6.2.7 1 5.9 8.1h-2.4l-4.8-6.6Z" />
    </svg>
  )
}

function IconLinkedIn({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M6.5 9.2H3.7V20h2.8V9.2ZM5.1 3.6A1.7 1.7 0 1 0 5.1 7a1.7 1.7 0 0 0 0-3.4ZM20.3 20h-2.8v-5.6c0-1.6-.6-2.6-2-2.6-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V20h-2.8s.1-9.3 0-10.8h2.8v1.8c.4-.6 1.1-1.5 2.8-1.5 2 0 3.6 1.3 3.6 4.2V20Z" />
    </svg>
  )
}

function IconWhatsApp({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.1 3.2A8.7 8.7 0 0 0 4.6 16.3L3.4 20.6l4.4-1.2a8.7 8.7 0 0 0 4.3 1.1 8.7 8.7 0 0 0 0-17.3Zm0 15.9c-1.3 0-2.6-.4-3.7-1l-.3-.2-2.6.7.7-2.5-.2-.3a7.2 7.2 0 1 1 6.1 3.3Zm4-5.4c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1l-.6.7c-.1.2-.3.2-.5.1a5.9 5.9 0 0 1-2.9-2.5c-.2-.4 0-.5.1-.7l.4-.5.1-.3c0-.1 0-.3-.1-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4 1.4.6 1.7.5 2.3.4.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.1-.4-.2Z"
      />
    </svg>
  )
}
