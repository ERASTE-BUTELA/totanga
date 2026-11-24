import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import {
  getCatalog,
  searchCatalogAuthors,
  searchCatalogCategories,
  searchCatalogPublishers,
} from "../api/client.js"
import { BookCard } from "../components/cards/BookCard.jsx"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { AutocompleteField } from "../components/ui/AutocompleteField.jsx"
import { QueryState } from "../components/ui/QueryState.jsx"
import { usePageTitle } from "../lib/usePageTitle.js"

function countLabel(count) {
  const formatted = count.toLocaleString("fr-FR")
  return count === 1 ? "1 livre trouvé" : `${formatted} livres trouvés`
}

function pageNumber(value) {
  const page = Number(value || "1")
  if (!Number.isInteger(page) || page < 1) return 1
  return page
}

function buildParams({ q, classe, sousClasse, auteur, editeur }) {
  const params = new URLSearchParams()
  const query = String(q || "").trim()
  if (query) params.set("q", query)
  const category = sousClasse?.slug || sousClasse?.id || classe?.slug || classe?.id
  if (category) params.set("categorie", String(category))
  if (classe?.id && (sousClasse?.id || sousClasse?.slug)) params.set("classe", String(classe.id))
  if (auteur?.id) params.set("auteur", String(auteur.id))
  if (editeur?.id) params.set("editeur", String(editeur.id))
  return params
}

function sameSearch(a, b) {
  for (const key of ["q", "categorie", "classe", "auteur", "editeur"]) {
    if ((a.get(key) || "") !== (b.get(key) || "")) return false
  }
  return true
}

export default function CatalogPage() {
  usePageTitle("Catalogue")
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: "loading", data: null, error: "" })
  const [q, setQ] = useState(() => searchParams.get("q") || "")
  const [classe, setClasse] = useState(null)
  const [sousClasse, setSousClasse] = useState(null)
  const [auteur, setAuteur] = useState(null)
  const [editeur, setEditeur] = useState(null)
  const [filtersReady, setFiltersReady] = useState(false)

  const categoryKey = searchParams.get("categorie") || ""
  const classKey = searchParams.get("classe") || ""
  const authorId = searchParams.get("auteur") || ""
  const publisherId = searchParams.get("editeur") || ""

  useEffect(() => {
    setQ(searchParams.get("q") || "")
  }, [searchParams])

  useEffect(() => {
    let active = true

    async function hydrate() {
      const [classRows, authorRows, publisherRows] = await Promise.all([
        classKey ? searchCatalogCategories("", "", classKey) : Promise.resolve([]),
        authorId ? searchCatalogAuthors("", authorId) : Promise.resolve([]),
        publisherId ? searchCatalogPublishers("", publisherId) : Promise.resolve([]),
      ])
      let nextClasse = classRows[0] || null
      let nextSous = null
      if (categoryKey) {
        let chosen = null
        if (/^\d+$/.test(categoryKey)) {
          const categoryRows = await searchCatalogCategories("", "", categoryKey)
          chosen = categoryRows[0] || null
        } else {
          const fromClasses = await searchCatalogCategories(categoryKey)
          chosen = fromClasses.find((item) => item.slug === categoryKey) || null
          if (!chosen) {
            const children = await searchCatalogCategories(categoryKey, nextClasse?.id || "")
            chosen = children.find((item) => item.slug === categoryKey) || null
          }
        }
        if (chosen && (chosen.is_class || !chosen.parent_id)) {
          nextClasse = chosen
          nextSous = null
        } else if (chosen) {
          nextSous = chosen
          if (!nextClasse && chosen.parent_id) {
            const parents = await searchCatalogCategories("", "", String(chosen.parent_id))
            nextClasse = parents[0] || null
          }
        }
      } else {
        nextClasse = classKey ? nextClasse : null
        nextSous = null
      }
      if (!active) return
      setClasse(nextClasse)
      setSousClasse(nextSous)
      setAuteur(authorRows[0] || null)
      setEditeur(publisherRows[0] || null)
      setFiltersReady(true)
    }

    hydrate().catch(() => {
      if (!active) return
      setFiltersReady(true)
    })
    return () => {
      active = false
    }
  }, [categoryKey, classKey, authorId, publisherId])

  useEffect(() => {
    if (!filtersReady) return undefined
    const timer = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = buildParams({ q, classe, sousClasse, auteur, editeur })
        if (sameSearch(current, next) && (current.get("page") || "1") === "1") return current
        return next
      }, { replace: true })
    }, 220)
    return () => window.clearTimeout(timer)
  }, [q, classe, sousClasse, auteur, editeur, filtersReady, setSearchParams])

  useEffect(() => {
    let active = true
    setState((current) => ({ status: "loading", data: current.data, error: "" }))
    getCatalog(searchParams.toString())
      .then((data) => {
        if (active) setState({ status: "ready", data, error: "" })
      })
      .catch(() => {
        if (active) setState({ status: "error", data: null, error: "Le catalogue n'a pas pu être chargé. Réessayez." })
      })
    return () => {
      active = false
    }
  }, [searchParams])

  const searchClasses = useCallback((query) => searchCatalogCategories(query), [])
  const searchSubclasses = useCallback(
    (query) => (classe?.id ? searchCatalogCategories(query, classe.id) : Promise.resolve([])),
    [classe?.id],
  )
  const searchAuthors = useCallback((query) => searchCatalogAuthors(query), [])
  const searchPublishers = useCallback((query) => searchCatalogPublishers(query), [])

  const books = state.data?.books || []
  const pageCount = state.data?.pages || 1
  const page = Math.min(pageNumber(searchParams.get("page")), pageCount)

  function goToPage(next) {
    const params = buildParams({ q, classe, sousClasse, auteur, editeur })
    if (next > 1) params.set("page", String(next))
    setSearchParams(params)
  }

  function reset() {
    setQ("")
    setClasse(null)
    setSousClasse(null)
    setAuteur(null)
    setEditeur(null)
    setSearchParams(new URLSearchParams())
  }

  return (
    <div className="bg-canvas">
      <header className="page-hero relative overflow-hidden bg-brand text-on-brand">
        <img src="/images/visuels/lecture.webp" alt="" className="absolute inset-0 h-full w-full object-cover" data-theme-keep="" />
        <div className="absolute inset-0 bg-brand/85" aria-hidden="true" />
        <div className="relative px-4 py-8 sm:px-8 sm:py-10 lg:px-14">
          <h1 className="text-page">Catalogue des livres</h1>
          <p className="mt-3 max-w-3xl text-lead">Explorez le répertoire complet des ouvrages de la Bibliothèque Totanga.</p>
          <span className="mt-4 block h-1 w-16 rounded-full bg-brand-accent" aria-hidden="true" />
        </div>
      </header>

      <div className="px-4 py-5 sm:px-8 sm:py-6 lg:px-14">
        <Breadcrumb withHome items={[{ label: "Accueil", to: "/" }, { label: "Catalogue" }]} />
        <QueryState status={state.data ? "ready" : state.status} error={state.error}>
          {state.data ? (
            <div className="mt-5 sm:mt-6">
              <div className="grid gap-3" role="search">
                <div className="flex min-w-0 items-center gap-2">
                  <label htmlFor="recherche-catalogue" className="sr-only">
                    Rechercher un livre
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted sm:left-4" aria-hidden="true" />
                    <input
                      id="recherche-catalogue"
                      type="search"
                      value={q}
                      onChange={(event) => setQ(event.target.value)}
                      placeholder="Recherche par auteur, titre, éditeur, numéro d'enregistrement, Dewey…"
                      className="w-full rounded-full border border-line bg-panel py-3 pl-11 pr-4 text-body text-ink sm:pl-12"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Réinitialiser la recherche"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-ink"
                    onClick={reset}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <AutocompleteField
                    label="Classe"
                    value={classe}
                    onChange={(next) => {
                      setClasse(next)
                      setSousClasse(null)
                    }}
                    search={searchClasses}
                    placeholder="Filtrer par classe…"
                  />
                  <AutocompleteField
                    label="Sous-classe"
                    value={sousClasse}
                    onChange={setSousClasse}
                    search={searchSubclasses}
                    placeholder={classe ? "Filtrer par sous-classe…" : "Choisir une classe d'abord"}
                    disabled={!classe}
                  />
                  <AutocompleteField
                    label="Auteur"
                    value={auteur}
                    onChange={setAuteur}
                    search={searchAuthors}
                    placeholder="Filtrer par auteur…"
                  />
                  <AutocompleteField
                    label="Éditeur"
                    value={editeur}
                    onChange={setEditeur}
                    search={searchPublishers}
                    placeholder="Filtrer par éditeur…"
                  />
                </div>
              </div>

              <p className="mt-4 text-meta font-semibold text-ink sm:mt-5 sm:text-body" aria-live="polite">
                {state.status === "loading" ? "Recherche…" : countLabel(state.data.count)}
              </p>

              {books.length === 0 ? (
                <p className="mt-6 text-muted">Aucun livre ne correspond à cette recherche.</p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:mt-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {books.map((book) => (
                    <li key={book.id} className="min-w-0">
                      <BookCard book={book} dense />
                    </li>
                  ))}
                </ul>
              )}

              <PageField page={page} pageCount={pageCount} onPage={goToPage} />
            </div>
          ) : null}
        </QueryState>
      </div>
    </div>
  )
}

function PageField({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null

  function jump(raw) {
    const typed = Number(String(raw).trim())
    if (!Number.isInteger(typed) || typed < 1) return
    onPage(Math.min(pageCount, typed))
  }

  const previousDisabled = page <= 1
  const nextDisabled = page >= pageCount

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-body text-ink">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel text-violet disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page précédente"
        disabled={previousDisabled}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <label htmlFor="page-catalogue" className="font-semibold">
        Page
      </label>
      <input
        id="page-catalogue"
        type="text"
        inputMode="numeric"
        key={page}
        defaultValue={String(page)}
        aria-describedby="page-catalogue-total"
        className="w-20 rounded-xl border border-line bg-panel px-3 py-2 text-center"
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          jump(event.currentTarget.value)
        }}
      />
      <span id="page-catalogue-total">sur {pageCount.toLocaleString("fr-FR")}</span>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel text-violet disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page suivante"
        disabled={nextDisabled}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}
