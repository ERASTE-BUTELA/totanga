import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Search, SlidersHorizontal } from "lucide-react"
import { useSearchParams } from "react-router"
import { getBooks, getCategories } from "../api/client.js"
import { BookCard } from "../components/cards/BookCard.jsx"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { isBookAvailable } from "../features/catalog/availability.js"
import { queryBooks } from "../features/catalog/queryBooks.js"
import { useAsync } from "../lib/useAsync.js"
import { usePageTitle } from "../lib/usePageTitle.js"

const PAGE_SIZE = 8

function loadCatalog() {
  return Promise.all([getBooks(), getCategories()]).then(([books, categories]) => ({ books, categories }))
}

function countLabel(count) {
  const formatted = count.toLocaleString("fr-FR")
  return count === 1 ? "1 livre trouvé" : `${formatted} livres trouvés`
}

function pageNumber(value) {
  const page = Number(value || "1")
  if (!Number.isInteger(page) || page < 1) return 1
  return page
}

export default function CatalogPage() {
  usePageTitle("Catalogue")
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useAsync(loadCatalog, [])
  const criteria = {
    q: searchParams.get("q") || "",
    category: searchParams.get("categorie") || "",
    availability: searchParams.get("dispo") || "",
    yearMin: searchParams.get("anneeMin") || "",
    yearMax: searchParams.get("anneeMax") || "",
    sort: searchParams.get("tri") || "",
  }

  function onSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params = new URLSearchParams()
    const q = String(data.get("q") || "").trim()
    const categories = data.getAll("categorie").map(String).filter(Boolean)
    const dispo = data.getAll("dispo").map(String).filter(Boolean)
    const anneeMin = String(data.get("anneeMin") || "").trim()
    const anneeMax = String(data.get("anneeMax") || "").trim()
    const tri = String(data.get("tri") || "")
    if (q) params.set("q", q)
    if (categories.length) params.set("categorie", categories.join(","))
    if (dispo.length === 1) params.set("dispo", dispo[0])
    if (anneeMin) params.set("anneeMin", anneeMin)
    if (anneeMax) params.set("anneeMax", anneeMax)
    if (tri) params.set("tri", tri)
    setSearchParams(params)
  }

  const selectedCategories = criteria.category.split(",").filter(Boolean)
  const books = state.data ? queryBooks(state.data.books, criteria) : []
  const pageCount = Math.max(1, Math.ceil(books.length / PAGE_SIZE))
  const page = Math.min(pageNumber(searchParams.get("page")), pageCount)
  const visible = books.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function goToPage(next) {
    const params = new URLSearchParams(searchParams)
    if (next <= 1) params.delete("page")
    else params.set("page", String(next))
    setSearchParams(params)
  }

  return (
    <div className="bg-canvas">
      <header className="relative overflow-hidden bg-violet text-white">
        <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-violet/85" aria-hidden="true" />
        <div className="relative px-4 py-10 sm:px-8 lg:px-14">
          <h1 className="text-page">Catalogue des livres</h1>
          <p className="mt-3 max-w-3xl text-lead">Explorez le répertoire complet des ouvrages de la Bibliothèque Totanga.</p>
          <span className="mt-4 block h-1 w-16 rounded-full bg-gold-bright" aria-hidden="true" />
        </div>
      </header>

      <div className="px-4 py-6 sm:px-8 lg:px-14">
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Catalogue" }]} />
        <QueryState status={state.status} error={state.error}>
          {state.data ? (
            <form key={searchParams.toString()} onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
              <FilterPanel
                categories={state.data.categories}
                books={state.data.books}
                selectedCategories={selectedCategories}
                availability={criteria.availability}
                yearMin={criteria.yearMin}
                yearMax={criteria.yearMax}
                onReset={() => setSearchParams(new URLSearchParams())}
              />

              <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label htmlFor="recherche-catalogue" className="sr-only">
                    Rechercher un livre
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input
                      id="recherche-catalogue"
                      name="q"
                      type="search"
                      defaultValue={criteria.q}
                      placeholder="Rechercher un livre (titre, auteur, mot-clé...)"
                      className="w-full rounded-full border border-line bg-white py-3 pl-12 pr-4"
                    />
                  </div>
                  <button type="submit" className="rounded-xl bg-violet px-6 font-semibold text-white">
                    Rechercher
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-body font-semibold text-ink" aria-live="polite">
                    {countLabel(books.length)}
                  </p>
                  <label className="flex items-center gap-2 text-meta text-muted">
                    Trier par :
                    <select
                      name="tri"
                      defaultValue={criteria.sort}
                      className="rounded-xl border border-line bg-white px-3 py-2 text-body text-ink"
                      onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    >
                      <option value="">Pertinence</option>
                      <option value="titre">Titre</option>
                      <option value="annee">Année</option>
                    </select>
                  </label>
                </div>

                {visible.length === 0 ? (
                  <p className="mt-6 text-muted">Aucun livre ne correspond à cette recherche.</p>
                ) : (
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {visible.map((book) => (
                      <li key={book.id}>
                        <BookCard book={book} catalog />
                      </li>
                    ))}
                  </ul>
                )}

                <Pagination page={page} pageCount={pageCount} onPage={goToPage} />
              </div>
            </form>
          ) : null}
        </QueryState>
      </div>
    </div>
  )
}

function FilterPanel({ categories, books, selectedCategories, availability, yearMin, yearMax, onReset }) {
  const counts = new Map()
  for (const book of books) {
    const slug = book.category?.slug
    if (slug) counts.set(slug, (counts.get(slug) || 0) + 1)
  }
  const available = books.filter((book) => isBookAvailable(book)).length

  return (
    <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="filtres-catalogue">
      <h2 id="filtres-catalogue" className="flex items-center gap-2 text-card text-ink">
        <SlidersHorizontal className="h-5 w-5 text-violet" aria-hidden="true" />
        Filtrer les résultats
      </h2>

      <fieldset className="mt-6">
        <legend className="text-body font-semibold text-ink">Catégories</legend>
        <ul className="mt-3 space-y-2">
          {categories.map((category) => (
            <li key={category.id}>
              <label className="flex items-center gap-2 text-body text-ink">
                <input
                  type="checkbox"
                  name="categorie"
                  value={category.slug}
                  defaultChecked={selectedCategories.includes(category.slug)}
                  className="h-4 w-4 accent-violet"
                />
                <span className="min-w-0 flex-1">{category.name}</span>
                <span className="text-meta text-muted">({(counts.get(category.slug) || 0).toLocaleString("fr-FR")})</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-body font-semibold text-ink">Disponibilité</legend>
        <ul className="mt-3 space-y-2">
          <li>
            <label className="flex items-center gap-2 text-body text-ink">
              <input type="checkbox" name="dispo" value="disponible" defaultChecked={availability === "disponible"} className="h-4 w-4 accent-violet" />
              <span className="min-w-0 flex-1">Disponible</span>
              <span className="text-meta text-muted">({available.toLocaleString("fr-FR")})</span>
            </label>
          </li>
          <li>
            <label className="flex items-center gap-2 text-body text-ink">
              <input type="checkbox" name="dispo" value="indisponible" defaultChecked={availability === "indisponible"} className="h-4 w-4 accent-violet" />
              <span className="min-w-0 flex-1">Indisponible</span>
              <span className="text-meta text-muted">({(books.length - available).toLocaleString("fr-FR")})</span>
            </label>
          </li>
        </ul>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-body font-semibold text-ink">Année de publication</legend>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <label className="text-meta text-muted" htmlFor="annee-min">
            De
            <input
              id="annee-min"
              name="anneeMin"
              inputMode="numeric"
              defaultValue={yearMin}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-body text-ink"
            />
          </label>
          <span className="pb-3 text-muted" aria-hidden="true">
            —
          </span>
          <label className="text-meta text-muted" htmlFor="annee-max">
            À
            <input
              id="annee-max"
              name="anneeMax"
              inputMode="numeric"
              defaultValue={yearMax}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-body text-ink"
            />
          </label>
        </div>
      </fieldset>

      <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet px-4 font-semibold text-white">
        <Search className="h-4 w-4" aria-hidden="true" />
        Appliquer les filtres
      </button>
      <button
        type="button"
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-4 font-semibold text-ink"
        onClick={onReset}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Réinitialiser
      </button>
    </aside>
  )
}

function Pagination({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null
  const items = []
  for (let number = 1; number <= pageCount; number += 1) items.push(number)

  return (
    <nav aria-label="Pages du catalogue" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <PageButton label="Première page" disabled={page === 1} onClick={() => onPage(1)}>
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton label="Page précédente" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        {items.map((number) => (
          <li key={number}>
            <button
              type="button"
              aria-label={`Page ${number}`}
              aria-current={number === page ? "page" : undefined}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-body font-semibold ${
                number === page ? "bg-violet text-white" : "bg-white text-ink hover:bg-lavender"
              }`}
              onClick={() => onPage(number)}
            >
              {number}
            </button>
          </li>
        ))}
        <PageButton label="Page suivante" disabled={page === pageCount} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton label="Dernière page" disabled={page === pageCount} onClick={() => onPage(pageCount)}>
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
      </ul>
    </nav>
  )
}

function PageButton({ label, disabled, onClick, children }) {
  return (
    <li>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-ink hover:bg-lavender disabled:text-muted"
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  )
}
