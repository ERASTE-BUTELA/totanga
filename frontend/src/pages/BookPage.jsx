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
import { copyStatusLabel, isBookAvailable } from "../features/catalog/availability.js"
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
        <Link to="/catalogue" className="control mt-6 rounded-control bg-violet px-4 py-2 font-semibold text-white">
          Retour au catalogue
        </Link>
      </section>
    )
  }

  const available = isBookAvailable(book)
  const availableCount = book.copies.filter((copy) => copy.status === "available").length
  const place = book.copies.find((copy) => copy.status === "available") || book.copies[0]
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_18rem] lg:items-start">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          {book.cover ? (
            <img src={book.cover} alt="" className="mx-auto aspect-[3/4] w-full rounded-lg object-cover shadow-cover" />
          ) : (
            <span className="mx-auto grid aspect-[3/4] w-full place-items-center rounded-lg bg-violet text-white">{book.title.slice(0, 1)}</span>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-page text-heading">{book.title}</h1>
          {authors ? (
            <p className="mt-3 inline-flex items-center gap-2 text-body text-muted">
              <User className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
              {authors}
            </p>
          ) : null}
          <dl className="mt-6 space-y-3">
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
            <Fact icon={Library} label="Cote / Référence">
              {place?.callNumber || "Non précisée"}
            </Fact>
            <Fact icon={MapPin} label="Emplacement">
              {placeLabel(place) || "Non précisé"}
            </Fact>
          </dl>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className={`rounded-xl px-4 py-4 ${available ? "bg-available-soft text-available" : "bg-unavailable-soft text-unavailable"}`}>
            <p className="flex items-center gap-2 text-card">
              <span className={`h-3 w-3 rounded-full ${available ? "bg-available" : "bg-unavailable"}`} aria-hidden="true" />
              {available ? "Disponible" : "Indisponible"}
            </p>
          </div>
          <p className="mt-3 text-meta text-muted">{availableText(availableCount)}</p>
          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet px-4 font-semibold text-white"
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
    <div className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-center gap-3 text-body">
      <dt className="inline-flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-semibold text-ink">{children}</dd>
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
                ? "inline-flex items-center gap-2 rounded-xl bg-violet px-4 font-semibold text-white"
                : "inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold text-ink"
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
              {book.copies.map((copy) => (
                <li key={copy.id} className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
                  <p className="text-meta text-muted">{copy.inventoryNumber ? `N. e. ${copy.inventoryNumber}` : "Numéro non précisé"}</p>
                  <p className="text-body font-semibold text-ink">{copy.callNumber || "Sans cote"}</p>
                  {copy.secondaryCallNumber ? <p className="mt-1 text-meta text-muted">Cote secondaire : {copy.secondaryCallNumber}</p> : null}
                  {copy.fonds ? <p className="mt-1 text-meta text-muted">Fonds : {copy.fonds}</p> : null}
                  <p className="mt-1 text-meta text-muted">{placeLabel(copy) || "Emplacement non précisé"}</p>
                  <p className="mt-2 text-badge text-violet">{copyStatusLabel(copy.status)}</p>
                </li>
              ))}
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

function availableText(count) {
  if (count === 0) return "Aucun exemplaire disponible"
  if (count === 1) return "1 exemplaire disponible"
  return `${count} exemplaires disponibles`
}
