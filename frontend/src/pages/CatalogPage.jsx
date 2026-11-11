import { RotateCcw, Search } from "lucide-react"
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

export default function CatalogPage() {
  usePageTitle("Catalogue")
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: "loading", data: null, error: "" })
  const criteria = {
    q: searchParams.get("q") || "",
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
    const dispo = String(data.get("dispo") || "")
    const anneeMin = String(data.get("anneeMin") || "").trim()
    const anneeMax = String(data.get("anneeMax") || "").trim()
    const tri = String(data.get("tri") || "")
    if (q) params.set("q", q)
    if (dispo) params.set("dispo", dispo)
    if (anneeMin) params.set("anneeMin", anneeMin)
    if (anneeMax) params.set("anneeMax", anneeMax)
    if (tri) params.set("tri", tri)
    setSearchParams(params)
  }

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
        <QueryState status={state.data ? "ready" : state.status} error={state.error}>
          {state.data ? (
            <form key={searchParams.toString()} onSubmit={onSubmit} className="mt-6">
              <div className="flex min-w-0 flex-nowrap items-center gap-2">
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
                <select
                  name="dispo"
                  aria-label="Disponibilité"
                  defaultValue={criteria.availability}
                  className="w-32 shrink-0 rounded-xl border border-line bg-white px-2 text-body text-ink"
                >
                  <option value="">Disponibilité</option>
                  <option value="disponible">Disponible</option>
                  <option value="indisponible">Indisponible</option>
                </select>
                <input
                  name="anneeMin"
                  aria-label="Année de début"
                  inputMode="numeric"
                  defaultValue={criteria.yearMin}
                  placeholder="De"
                  className="w-16 shrink-0 rounded-xl border border-line bg-white px-2 text-body text-ink"
                />
                <input
                  name="anneeMax"
                  aria-label="Année de fin"
                  inputMode="numeric"
                  defaultValue={criteria.yearMax}
                  placeholder="À"
                  className="w-16 shrink-0 rounded-xl border border-line bg-white px-2 text-body text-ink"
                />
                <select
                  name="tri"
                  aria-label="Trier par"
                  defaultValue={criteria.sort}
                  className="w-32 shrink-0 rounded-xl border border-line bg-white px-2 text-body text-ink"
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                >
                  <option value="">Pertinence</option>
                  <option value="titre">Titre</option>
                  <option value="annee">Année</option>
                </select>
                <button type="submit" className="shrink-0 rounded-xl bg-violet px-4 font-semibold text-white">
                  Rechercher
                </button>
                <button
                  type="button"
                  aria-label="Réinitialiser"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-line bg-white px-3 text-ink"
                  onClick={() => setSearchParams(new URLSearchParams())}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <p className="mt-5 text-body font-semibold text-ink" aria-live="polite">
                {state.status === "loading" ? "Chargement…" : countLabel(state.data.count)}
              </p>

              {visible.length === 0 ? (
                <p className="mt-6 text-muted">Aucun livre ne correspond à cette recherche.</p>
              ) : (
                <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {visible.map((book) => (
                    <li key={book.id}>
                      <BookCard book={book} dense />
                    </li>
                  ))}
                </ul>
              )}

              <PageField page={page} pageCount={pageCount} onPage={goToPage} />
            </form>
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

  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-body text-ink">
      <label htmlFor="page-catalogue" className="font-semibold">
        Page
      </label>
      <input
        id="page-catalogue"
        type="text"
        inputMode="numeric"
        defaultValue={String(page)}
        aria-describedby="page-catalogue-total"
        className="w-24 rounded-xl border border-line bg-white px-3 py-2 text-center"
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          jump(event.currentTarget.value)
        }}
      />
      <span id="page-catalogue-total">sur {pageCount.toLocaleString("fr-FR")}</span>
    </div>
  )
}
