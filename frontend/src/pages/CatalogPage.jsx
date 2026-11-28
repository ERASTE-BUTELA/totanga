import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import {
  getCatalog,
  searchCatalogAuthors,
  searchCatalogCategories,
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

function categoryParam(classe, sousClasse) {
  if (sousClasse?.slug) return { slug: sousClasse.slug, id: sousClasse.id }
  if (sousClasse?.id) return { slug: "", id: sousClasse.id }
  if (classe?.slug) return { slug: classe.slug, id: classe.id }
  if (classe?.id) return { slug: "", id: classe.id }
  return null
}

function writeFilterParams(params, { q, classe, sousClasse, auteur }) {
  const query = String(q || "").trim()
  if (query) params.set("q", query)
  else params.delete("q")

  const category = categoryParam(classe, sousClasse)
  if (category?.slug) params.set("categorie", category.slug)
  else if (category?.id) params.set("categorie", String(category.id))
  else params.delete("categorie")

  if (auteur?.id != null && auteur.id !== "") params.set("auteur", String(auteur.id))
  else if (auteur?.label) params.set("auteur", auteur.label)
  else params.delete("auteur")

  params.delete("editeur")
  return params
}

export default function CatalogPage() {
  usePageTitle("Catalogue")
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: "loading", data: null, error: "" })
  const [q, setQ] = useState(() => searchParams.get("q") || "")
  const [classe, setClasse] = useState(null)
  const [sousClasse, setSousClasse] = useState(null)
  const [auteur, setAuteur] = useState(null)
  const hydratedKey = useRef("")
  const skipQSync = useRef(false)

  const page = pageNumber(searchParams.get("page"))

  useEffect(() => {
    const categoryKey = searchParams.get("categorie") || ""
    const authorId = searchParams.get("auteur") || ""
    const key = `${categoryKey}|${authorId}`
    if (hydratedKey.current === key) return undefined
    hydratedKey.current = key

    let active = true
    async function hydrate() {
      const tasks = [
        categoryKey
          ? searchCatalogCategories("", "", categoryKey).then((rows) => ({ type: "categorie", rows }))
          : Promise.resolve({ type: "categorie", rows: [] }),
        authorId
          ? searchCatalogAuthors("", authorId).then((rows) => ({ type: "auteur", rows }))
          : Promise.resolve({ type: "auteur", rows: [] }),
      ]
      const results = await Promise.all(tasks)
      if (!active) return

      const categoryHit = results.find((item) => item.type === "categorie")?.rows?.[0] || null
      const authorHit = results.find((item) => item.type === "auteur")?.rows?.[0] || null
      setAuteur(authorHit)

      if (!categoryHit) {
        setClasse(null)
        setSousClasse(null)
        return
      }

      if (categoryHit.is_class || !categoryHit.parent_id) {
        setClasse(categoryHit)
        setSousClasse(null)
        return
      }

      setSousClasse({
        ...categoryHit,
        label: categoryHit.label?.includes(" — ")
          ? categoryHit.label.split(" — ").slice(1).join(" — ")
          : categoryHit.label,
      })
      const parents = await searchCatalogCategories("", "", String(categoryHit.parent_id))
      if (!active) return
      setClasse(parents[0] || null)
    }
    hydrate().catch(() => {})
    return () => {
      active = false
    }
  }, [searchParams])

  useEffect(() => {
    const urlQ = searchParams.get("q") || ""
    if (q === urlQ) return undefined
    const timer = window.setTimeout(() => {
      skipQSync.current = true
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          const trimmed = String(q || "").trim()
          if (trimmed) params.set("q", trimmed)
          else params.delete("q")
          params.delete("page")
          params.delete("editeur")
          return params
        },
        { replace: true },
      )
    }, 220)
    return () => window.clearTimeout(timer)
  }, [q, searchParams, setSearchParams])

  useEffect(() => {
    if (skipQSync.current) {
      skipQSync.current = false
      return
    }
    const next = searchParams.get("q") || ""
    setQ((current) => (current === next ? current : next))
  }, [searchParams])

  useEffect(() => {
    let active = true
    setState((current) => ({ status: "loading", data: current.data, error: "" }))
    getCatalog(searchParams.toString())
      .then((data) => {
        if (active) setState({ status: "ready", data, error: "" })
      })
      .catch(() => {
        if (active) {
          setState({ status: "error", data: null, error: "Le catalogue n'a pas pu être chargé. Réessayez." })
        }
      })
    return () => {
      active = false
    }
  }, [searchParams])

  const searchClasses = useCallback((query) => searchCatalogCategories(query), [])

  const searchSubclasses = useCallback(
    async (query) => {
      if (!classe?.id) return []
      const rows = await searchCatalogCategories(query, classe.id)
      return rows.map((item) => ({
        ...item,
        label: item.label?.includes(" — ") ? item.label.split(" — ").slice(1).join(" — ") : item.label,
      }))
    },
    [classe?.id],
  )

  const searchAuthors = useCallback((query) => searchCatalogAuthors(query), [])

  function applyFilters({
    nextClasse = classe,
    nextSousClasse = sousClasse,
    nextAuteur = auteur,
  }) {
    let resolvedClasse = nextClasse
    let resolvedSous = nextSousClasse

    // Changer de classe → on efface la sous-classe.
    if (nextClasse?.id !== classe?.id) {
      resolvedSous = null
    }
    // Choisir une sous-classe hors de la classe courante → on aligne la classe.
    if (resolvedSous?.parent_id && resolvedClasse?.id && String(resolvedSous.parent_id) !== String(resolvedClasse.id)) {
      resolvedClasse = null
    }

    setClasse(resolvedClasse)
    setSousClasse(resolvedSous)
    setAuteur(nextAuteur)
    hydratedKey.current = [
      resolvedSous?.slug || resolvedSous?.id || resolvedClasse?.slug || resolvedClasse?.id || "",
      nextAuteur?.id || "",
    ].join("|")
    setQ("")
    setSearchParams(() =>
      writeFilterParams(new URLSearchParams(), {
        q: "",
        classe: resolvedClasse,
        sousClasse: resolvedSous,
        auteur: nextAuteur,
      }),
    )
  }

  function goToPage(next) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (next > 1) params.set("page", String(next))
      else params.delete("page")
      return params
    })
  }

  function reset() {
    setQ("")
    setClasse(null)
    setSousClasse(null)
    setAuteur(null)
    hydratedKey.current = ""
    setSearchParams(new URLSearchParams())
  }

  const books = state.data?.books || []
  const pageCount = state.data?.pages || 1
  const currentPage = Math.min(page, pageCount)

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
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-2" role="search">
                <div className="flex min-w-0 items-end gap-2 xl:min-w-[16rem] xl:flex-1">
                  <label htmlFor="recherche-catalogue" className="sr-only">
                    Rechercher un livre
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <span className="mb-1 block text-meta font-semibold text-ink xl:invisible xl:h-5">Recherche</span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted sm:left-4" aria-hidden="true" />
                      <input
                        id="recherche-catalogue"
                        type="search"
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                        placeholder="Recherche par auteur, titre, éditeur, n° d'enregistrement, Dewey…"
                        className="h-11 w-full rounded-full border border-line bg-panel py-2.5 pl-11 pr-4 text-body text-ink sm:pl-12"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Réinitialiser la recherche"
                    className="mb-0 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-ink"
                    onClick={reset}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[14rem_14rem_14rem] sm:gap-3 xl:shrink-0 xl:gap-2">
                  <AutocompleteField
                    label="Classe"
                    value={classe}
                    onChange={(next) => applyFilters({ nextClasse: next, nextSousClasse: null })}
                    search={searchClasses}
                    placeholder="Classe…"
                  />
                  <AutocompleteField
                    label="Sous-classe"
                    value={sousClasse}
                    onChange={(next) => applyFilters({ nextSousClasse: next })}
                    search={searchSubclasses}
                    placeholder={classe ? "Sous-classe…" : "Classe d'abord"}
                    disabled={!classe}
                  />
                  <AutocompleteField
                    label="Auteur"
                    value={auteur}
                    onChange={(next) => applyFilters({ nextAuteur: next })}
                    search={searchAuthors}
                    placeholder="Auteur…"
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

              <PageField page={currentPage} pageCount={pageCount} onPage={goToPage} />
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
