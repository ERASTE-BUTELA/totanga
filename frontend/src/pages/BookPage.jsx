import { useState } from "react"
import { Link, useParams } from "react-router"
import {
  BookOpen,
  Bookmark,
  Building2,
  Calendar,
  ChevronRight,
  Info,
  Languages,
  Library,
  MapPin,
  User,
} from "lucide-react"
import { getBookBySlug } from "../api/client.js"
import { BookCard } from "../components/cards/BookCard.jsx"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { copyStatusLabel, isBookAvailable, isCopyAvailable } from "../features/catalog/availability.js"
import { authorNames, languageLabel } from "../lib/format.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

function loadBook(slug) {
  return getBookBySlug(slug)
}

export default function BookPage() {
  const { slug } = useParams()
  const state = useAsync(() => loadBook(slug), [slug])
  const book = state.data
  usePageTitle(book ? book.title : "Livre introuvable")

  return (
    <div className="bg-canvas px-4 py-6 sm:px-8 lg:px-14">
      <QueryState status={state.status} error={state.error}>
        <BookContent book={book} />
      </QueryState>
    </div>
  )
}

function BookContent({ book }) {
  const [tab, setTab] = useState(book.summary.trim() ? "resume" : "infos")

  if (!book) {
    return (
      <section className="max-w-3xl">
        <h1 className="text-page text-ink">Ce livre est introuvable</h1>
        <p className="mt-4 text-muted">Il n'est pas au catalogue public.</p>
        <Link to="/catalogue" className="control mt-6 rounded-control bg-violet px-4 py-2 font-semibold text-on-primary">
          Retour au catalogue
        </Link>
      </section>
    )
  }

  const available = isBookAvailable(book)
  const availableCount = book.copies.filter((copy) => copy.status === "available").length
  const place = book.copies.find((copy) => isCopyAvailable(copy)) || book.copies[0]
  const similar = book.similar || []
  const authors = authorNames(book.authors)

  return (
    <article>
      <Breadcrumb
        withHome
        items={[
          { label: "Accueil", to: "/" },
          { label: "Catalogue", to: "/catalogue" },
          { label: "Détail du livre" },
        ]}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
        <div className="flex gap-4 sm:mx-auto sm:w-full sm:max-w-[15rem] sm:flex-col lg:mx-0 lg:max-w-none">
          <div className="w-[7.5rem] shrink-0 rounded-2xl bg-panel p-2 shadow-card sm:w-full sm:p-4">
            {book.cover ? (
              <img src={book.cover} alt="" className="aspect-[3/4] w-full rounded-lg object-cover shadow-cover" />
            ) : (
              <span className="grid aspect-[3/4] w-full place-items-center rounded-lg bg-violet text-on-primary">{book.title.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 sm:hidden">
            <h1 className="text-section text-heading">{book.title}</h1>
            {authors ? <p className="mt-2 text-meta text-muted">{authors}</p> : null}
            <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-badge font-semibold ${available ? "bg-available-soft text-available" : "bg-unavailable-soft text-unavailable"}`}>
              <span className={`h-2 w-2 rounded-full ${available ? "bg-available" : "bg-unavailable"}`} aria-hidden="true" />
              {available ? "Disponible" : "Indisponible"}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="hidden text-page text-heading sm:block">{book.title}</h1>
          {authors ? (
            <p className="mt-3 hidden items-center gap-2 text-body text-muted sm:inline-flex">
              <User className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
              {authors}
            </p>
          ) : null}
          <div className="mt-4 rounded-2xl border border-violet/25 bg-lavender px-4 py-3 sm:mt-5">
            <p className="inline-flex items-center gap-2 text-meta font-semibold text-violet">
              <Library className="h-4 w-4 shrink-0" aria-hidden="true" />
              Cotes des exemplaires
            </p>
            {book.copies.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {book.copies.map((copy) => {
                  const free = isCopyAvailable(copy)
                  return (
                    <li
                      key={copy.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2"
                    >
                      <span className="font-mono text-body font-bold tracking-wide text-heading">
                        {copy.callNumber || "Sans cote"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-badge font-semibold ${
                          free ? "bg-available-soft text-available" : "bg-unavailable-soft text-unavailable"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${free ? "bg-available" : "bg-unavailable"}`} aria-hidden="true" />
                        {free ? "Disponible" : copyStatusLabel(copy.status)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-2 text-body font-semibold text-muted">Aucun exemplaire</p>
            )}
            <p className="mt-2 text-meta text-muted">Notez la cote d’un exemplaire disponible pour le retrouver en rayon.</p>
          </div>

          <dl className="mt-4 space-y-3 sm:mt-6">
            <Fact icon={Bookmark} label="Catégorie">
              {book.category?.name ? (
                <Link
                  to={`/catalogue?categorie=${encodeURIComponent(book.category.slug)}`}
                  className="inline-flex rounded-full bg-lavender px-3 py-1 text-badge text-violet"
                >
                  {book.category.parentName ? `${book.category.parentName} — ${book.category.name}` : book.category.name}
                </Link>
              ) : (
                "Non précisée"
              )}
            </Fact>
            <Fact icon={Calendar} label="Année de publication">
              {book.publicationYear || "Non précisée"}
            </Fact>
            <Fact icon={Building2} label="Éditeur">
              {book.publisher || "Non précisé"}
            </Fact>
            <Fact icon={Languages} label="Langue">
              {languageLabel(book.language) || "Non précisée"}
            </Fact>
            {placeLabel(place) ? (
              <Fact icon={MapPin} label="Emplacement">
                {placeLabel(place)}
              </Fact>
            ) : null}
          </dl>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-panel p-4 shadow-card">
          <div className={`hidden rounded-xl px-4 py-4 sm:block ${available ? "bg-available-soft text-available" : "bg-unavailable-soft text-unavailable"}`}>
            <p className="flex items-center gap-2 text-card">
              <span className={`h-3 w-3 rounded-full ${available ? "bg-available" : "bg-unavailable"}`} aria-hidden="true" />
              {available ? "Disponible" : "Indisponible"}
            </p>
          </div>
          {place?.callNumber ? (
            <div className="mt-3 rounded-xl border border-line bg-canvas px-3 py-3">
              <p className="text-meta text-muted">{isCopyAvailable(place) ? "Cote disponible" : "Cote"}</p>
              <p className="mt-1 font-mono text-card font-bold text-heading">{place.callNumber}</p>
            </div>
          ) : null}
          <p className="mt-3 text-meta text-muted">{availableText(availableCount, book.copies.length)}</p>
          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet px-4 font-semibold text-on-primary"
            onClick={() => setTab("exemplaires")}
          >
            <Library className="h-4 w-4" aria-hidden="true" />
            Voir les exemplaires
          </button>
        </aside>
      </div>

      <BookTabs book={book} authors={authors} tab={tab} setTab={setTab} />

      {similar.length > 0 ? (
        <section className="mt-10 border-t border-line pt-8" aria-labelledby="livres-similaires">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="livres-similaires" className="flex items-center gap-2 text-section text-ink">
              <BookOpen className="h-6 w-6 text-violet" aria-hidden="true" />
              Livres similaires
            </h2>
            {book.category?.slug ? (
              <Link
                to={`/catalogue?categorie=${encodeURIComponent(book.category.slug)}`}
                className="inline-flex items-center gap-1 text-body font-bold text-violet"
              >
                Voir plus
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {similar.map((item) => (
              <li key={item.id}>
                <BookCard book={item} catalog />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="grid grid-cols-1 gap-1 text-body sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center sm:gap-3">
      <dt className="inline-flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 break-words font-semibold text-ink">{children}</dd>
    </div>
  )
}

function BookTabs({ book, authors, tab, setTab }) {
  const tabs = [
    ["infos", "Informations complémentaires", Info],
    ["exemplaires", "Exemplaires", Library],
  ]
  if (book.summary.trim()) tabs.unshift(["resume", "Résumé", BookOpen])

  return (
    <section className="mt-8">
      <div role="tablist" aria-label="Détail du livre" className="flex flex-wrap gap-2">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`onglet-${id}`}
            aria-selected={tab === id}
            aria-controls={`panneau-${id}`}
            className={
              tab === id
                ? "inline-flex items-center gap-2 rounded-xl bg-violet px-4 font-semibold text-on-primary"
                : "inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 font-semibold text-ink"
            }
            onClick={() => setTab(id)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "resume" ? (
        <p role="tabpanel" id="panneau-resume" aria-labelledby="onglet-resume" className="mt-5 max-w-4xl text-body text-ink">
          {book.summary}
        </p>
      ) : null}

      {tab === "infos" ? (
        <dl role="tabpanel" id="panneau-infos" aria-labelledby="onglet-infos" className="mt-5 max-w-3xl space-y-3">
          <Fact icon={User} label="Auteur">
            {authors || "Non précisé"}
          </Fact>
          <Fact icon={Building2} label="Éditeur">
            {book.publisher || "Non précisé"}
          </Fact>
          <Fact icon={Languages} label="Langue">
            {languageLabel(book.language) || "Non précisée"}
          </Fact>
          <Fact icon={Bookmark} label="ISBN">
            {book.isbn || "Non précisé"}
          </Fact>
        </dl>
      ) : null}

      {tab === "exemplaires" ? (
        <div role="tabpanel" id="panneau-exemplaires" aria-labelledby="onglet-exemplaires" className="mt-5">
          {book.copies.length === 0 ? (
            <p className="text-muted">Aucun exemplaire n'est enregistré.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {book.copies.map((copy) => {
                const free = isCopyAvailable(copy)
                return (
                  <li key={copy.id} className="rounded-2xl border border-line bg-panel px-4 py-3 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-meta font-semibold text-violet">Cote à noter</p>
                        <p className="mt-1 font-mono text-section font-bold tracking-wide text-heading">{copy.callNumber || "Sans cote"}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-badge font-semibold ${
                          free ? "bg-available-soft text-available" : "bg-unavailable-soft text-unavailable"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${free ? "bg-available" : "bg-unavailable"}`} aria-hidden="true" />
                        {free ? "Disponible" : copyStatusLabel(copy.status)}
                      </span>
                    </div>
                    {copy.secondaryCallNumber ? <p className="mt-2 text-meta text-muted">Cote secondaire : {copy.secondaryCallNumber}</p> : null}
                    {copy.inventoryNumber ? <p className="mt-1 text-meta text-muted">N. e. {copy.inventoryNumber}</p> : null}
                    {copy.fonds ? <p className="mt-1 text-meta text-muted">Fonds : {copy.fonds}</p> : null}
                    {placeLabel(copy) ? <p className="mt-1 text-meta text-muted">{placeLabel(copy)}</p> : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}

function placeLabel(copy) {
  if (!copy) return ""
  const parts = []
  if (copy.section) parts.push(`Rayon ${copy.section}`)
  if (copy.shelf) parts.push(copy.shelf)
  return parts.join(" – ")
}

function availableText(availableCount, totalCount) {
  if (totalCount === 0) return "Aucun exemplaire enregistré"
  if (availableCount === 0) return "Tous les exemplaires sont indisponibles"
  if (availableCount === 1) return `1 exemplaire disponible sur ${totalCount}`
  return `${availableCount} exemplaires disponibles sur ${totalCount}`
}
