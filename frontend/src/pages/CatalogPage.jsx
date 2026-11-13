import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { getCatalog } from "../api/client.js"
import { BookCard } from "../components/cards/BookCard.jsx"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
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

function buildParams({ q, dispo, anneeMin, anneeMax, tri, categorie }) {
  const params = new URLSearchParams()
  const query = String(q || "").trim()
  if (query) params.set("q", query)
  if (dispo) params.set("dispo", dispo)
  if (anneeMin) params.set("anneeMin", anneeMin)
  if (anneeMax) params.set("anneeMax", anneeMax)
  if (tri) params.set("tri", tri)
  if (categorie) params.set("categorie", categorie)
  return params
}

function sameFilters(a, b) {
  for (const key of ["q", "dispo", "anneeMin", "anneeMax", "tri", "categorie"]) {
    if ((a.get(key) || "") !== (b.get(key) || "")) return false
  }
  return true
}

export default function CatalogPage() {
  usePageTitle("Catalogue")
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: "loading", data: null, error: "" })
  const [q, setQ] = useState(() => searchParams.get("q") || "")
  const [dispo, setDispo] = useState(() => searchParams.get("dispo") || "")
  const [anneeMin, setAnneeMin] = useState(() => searchParams.get("anneeMin") || "")
  const [anneeMax, setAnneeMax] = useState(() => searchParams.get("anneeMax") || "")
  const [tri, setTri] = useState(() => searchParams.get("tri") || "")

  useEffect(() => {
    setQ(searchParams.get("q") || "")
    setDispo(searchParams.get("dispo") || "")
    setAnneeMin(searchParams.get("anneeMin") || "")
    setAnneeMax(searchParams.get("anneeMax") || "")
    setTri(searchParams.get("tri") || "")
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = buildParams({
          q,
          dispo,
          anneeMin: anneeMin.trim(),
          anneeMax: anneeMax.trim(),
          tri,
          categorie: current.get("categorie") || "",
        })
        if (sameFilters(current, next)) return current
        return next
      }, { replace: true })
    }, 220)
    return () => window.clearTimeout(timer)
  }, [q, dispo, anneeMin, anneeMax, tri, setSearchParams])

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

  const books = state.data?.books || []
  const pageCount = state.data?.pages || 1
  const page = Math.min(pageNumber(searchParams.get("page")), pageCount)
  const visible = books

  function goToPage(next) {
    const params = new URLSearchParams(searchParams)
    if (next <= 1) params.delete("page")
    else params.set("page", String(next))
    setSearchParams(params)
  }

  function reset() {
    setQ("")
    setDispo("")
    setAnneeMin("")
    setAnneeMax("")
    setTri("")
    setSearchParams(new URLSearchParams())
  }

  return (
    <div className="bg-canvas">
      <header className="relative overflow-hidden bg-violet text-on-primary">
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
        <QueryState status={state.data ? "ready" : state.status} error={state.error}>
          {state.data ? (
            <div className="mt-6">
              <div className="flex min-w-0 flex-nowrap items-center gap-2" role="search">
                <label htmlFor="recherche-catalogue" className="sr-only">
                  Rechercher un livre
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id="recherche-catalogue"
                    type="search"
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Rechercher un livre (titre, auteur, mot-clé...)"
                    className="w-full rounded-full border border-line bg-panel py-3 pl-12 pr-4"
                    autoComplete="off"
                  />
                </div>
                <select
                  aria-label="Disponibilité"
                  value={dispo}
                  onChange={(event) => setDispo(event.target.value)}
                  className="w-32 shrink-0 rounded-xl border border-line bg-panel px-2 text-body text-ink"
                >
                  <option value="">Disponibilité</option>
                  <option value="disponible">Disponible</option>
                  <option value="indisponible">Indisponible</option>
                </select>
                <input
                  aria-label="Année de début"
                  inputMode="numeric"
                  value={anneeMin}
                  onChange={(event) => setAnneeMin(event.target.value)}
                  placeholder="De"
                  className="w-16 shrink-0 rounded-xl border border-line bg-panel px-2 text-body text-ink"
                />
                <input
                  aria-label="Année de fin"
                  inputMode="numeric"
                  value={anneeMax}
                  onChange={(event) => setAnneeMax(event.target.value)}
                  placeholder="À"
                  className="w-16 shrink-0 rounded-xl border border-line bg-panel px-2 text-body text-ink"
                />
                <select
                  aria-label="Trier par"
                  value={tri}
                  onChange={(event) => setTri(event.target.value)}
                  className="w-32 shrink-0 rounded-xl border border-line bg-panel px-2 text-body text-ink"
                >
                  <option value="">Pertinence</option>
                  <option value="titre">Titre</option>
                  <option value="annee">Année</option>
                </select>
                <button
                  type="button"
                  aria-label="Réinitialiser"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-line bg-panel px-3 text-ink"
                  onClick={reset}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <p className="mt-5 text-body font-semibold text-ink" aria-live="polite">
                {state.status === "loading" ? "Recherche…" : countLabel(state.data.count)}
              </p>

              {visible.length === 0 ? (
                <p className="mt-6 text-muted">Aucun livre ne correspond à cette recherche.</p>
              ) : (
                <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                  {visible.map((book) => (
                    <li key={book.id}>
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
