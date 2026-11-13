import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { Building2, Calendar, ChevronLeft, ChevronRight, Info, Share2, Tag } from "lucide-react"
import { getAnnouncementBySlug, getAnnouncements } from "../api/client.js"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { ExternalLink } from "../components/ui/ExternalLink.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { fixtures } from "../data/fixtures.js"
import { AnnouncementsHero } from "../features/announcements/AnnouncementsHero.jsx"
import { announcementBadge, announcementCategory } from "../features/announcements/presentation.js"
import { formatDate, textBlocks } from "../lib/format.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

function loadAnnouncement(slug) {
  return Promise.all([getAnnouncementBySlug(slug), getAnnouncements()]).then(([item, items]) => ({ item, items }))
}

function shareTargets(url, title) {
  const page = encodeURIComponent(url)
  const text = encodeURIComponent(title)
  return [
    { label: "Partager sur Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${page}`, className: "bg-[#1877f2]", icon: IconFacebook },
    { label: "Partager sur X", href: `https://twitter.com/intent/tweet?url=${page}&text=${text}`, className: "bg-ink", icon: IconX },
    { label: "Partager sur LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${page}`, className: "bg-[#0a66c2]", icon: IconLinkedIn },
    { label: "Partager sur WhatsApp", href: `https://wa.me/?text=${text}%20${page}`, className: "bg-[#128c7e]", icon: IconWhatsApp },
  ]
}

export default function AnnouncementPage() {
  const { slug } = useParams()
  const state = useAsync(() => loadAnnouncement(slug), [slug])
  const item = state.data?.item
  usePageTitle(item ? item.title : "Annonce introuvable")

  return (
    <div className="bg-canvas">
      <AnnouncementsHero titleTag="p" />
      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <QueryState status={state.status} error={state.error}>
          {state.data ? <AnnouncementContent item={item} items={state.data.items} /> : null}
        </QueryState>
      </div>
    </div>
  )
}

function AnnouncementContent({ item, items }) {
  if (!item) {
    return (
      <section>
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Annonces", to: "/annonces" }, { label: "Introuvable" }]} />
        <div className="mt-6 max-w-3xl rounded-2xl border border-line bg-panel p-6 shadow-card">
          <h1 className="text-page text-ink">Cette annonce est introuvable</h1>
          <Link to="/annonces" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-violet px-4 font-semibold text-violet">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Retour aux annonces
          </Link>
        </div>
      </section>
    )
  }

  const badge = announcementBadge(item)
  const BadgeIcon = badge.icon
  const others = items
    .filter((entry) => entry.slug !== item.slug)
    .sort((a, b) => String(b.publishedOn).localeCompare(String(a.publishedOn)))

  return (
    <div>
      <Breadcrumb
        withHome
        items={[
          { label: "Accueil", to: "/" },
          { label: "Annonces", to: "/annonces" },
          { label: item.title },
        ]}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-6">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-badge ${badge.className}`}>
            <BadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {badge.label}
          </span>
          <h1 className="mt-3 text-page text-heading">{item.title}</h1>
          <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-muted">
            <li className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet" aria-hidden="true" />
              {formatDate(item.publishedOn)}
            </li>
            <li className="inline-flex items-center gap-2 sm:border-l sm:border-line sm:pl-3">
              <Tag className="h-4 w-4 text-violet" aria-hidden="true" />
              {announcementCategory(item)}
            </li>
            <li className="inline-flex items-center gap-2 sm:border-l sm:border-line sm:pl-3">
              <Building2 className="h-4 w-4 text-violet" aria-hidden="true" />
              {fixtures.library.name}
            </li>
          </ul>
          {item.image ? <img src={item.image} alt="" className="mt-5 h-64 w-full rounded-xl object-cover sm:h-72" /> : null}
          {textBlocks(item.body).map((paragraph) => (
            <p key={paragraph} className="mt-4 text-article text-ink">
              {paragraph}
            </p>
          ))}
          <div className="mt-8 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/annonces" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-violet px-4 font-semibold text-violet">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Retour aux annonces
            </Link>
            <ShareBar title={item.title} />
          </div>
        </article>

        <aside>
          <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-labelledby="autres-annonces">
            <h2 id="autres-annonces" className="flex items-center gap-2 text-card text-heading">
              <Info className="h-5 w-5 text-violet" aria-hidden="true" />
              Autres annonces
            </h2>
            {others.length === 0 ? <p className="mt-4 text-body text-muted">Aucune autre annonce.</p> : null}
            <ul className="mt-2">
              {others.map((entry) => (
                <li key={entry.id} className="border-b border-line last:border-b-0">
                  <Link to={`/annonces/${entry.slug}`} className="flex items-center gap-3 py-3">
                    {entry.image ? (
                      <img src={entry.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-14 w-20 shrink-0 rounded-lg bg-lavender" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-body font-bold text-heading">{entry.title}</span>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-meta text-muted">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDate(entry.publishedOn)}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function ShareBar({ title }) {
  const [pageUrl, setPageUrl] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    setPageUrl(window.location.href)
    setMessage("")
  }, [title])

  async function onShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error?.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Lien copié.")
    } catch {
      setMessage(url)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onShare} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 font-semibold text-ink">
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Partager
      </button>
      {pageUrl
        ? shareTargets(pageUrl, title).map((target) => {
            const Icon = target.icon
            return (
              <ExternalLink
                key={target.label}
                href={target.href}
                label={target.label}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-on-primary ${target.className}`}
              >
                <Icon className="h-5 w-5" />
              </ExternalLink>
            )
          })
        : null}
      {message ? <p className="w-full text-meta text-muted">{message}</p> : null}
    </div>
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
