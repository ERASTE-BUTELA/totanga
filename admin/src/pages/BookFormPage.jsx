import { Fragment, useEffect, useId, useRef, useState } from "react"
import { Archive, ArrowLeft, BookOpen, Check, Eye, Layers, Pencil, Plus, Save } from "lucide-react"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import { archiveBook, getBook, listAuthors, listCategories, saveBook } from "../api/catalog.js"
import { bookNotices } from "./texts.js"

const LANGUAGES = [
  ["fr", "Français"],
  ["en", "Anglais"],
  ["it", "Italien"],
  ["ln", "Lingala"],
  ["kg", "Kikongo"],
  ["lua", "Tshiluba"],
  ["sw", "Swahili"],
  ["other", "Autre"],
]
const COPY_STATUSES = ["Disponible", "Emprunté", "Réservé", "En réparation", "Perdu"]
const MAX_IMAGE = 2 * 1024 * 1024

const STATUS_CLASS = {
  Disponible: "bg-available-soft text-available",
  Emprunté: "bg-[#e7eefc] text-[#1d4ed8]",
  Réservé: "bg-[#fde7c7] text-[#9a3412]",
  "En réparation": "bg-lavender text-violet",
  Perdu: "bg-unavailable-soft text-unavailable",
}

const fieldClass = "w-full rounded-control border border-line bg-white px-3"

function starting(book) {
  if (!book) {
    return {
      id: null,
      title: "",
      authors: [],
      category: "",
      year: "",
      publisher: "",
      isbn: "",
      language: "fr",
      pages: "",
      keywords: [],
      summary: "",
      archived: false,
      copies: [],
      cover: "",
    }
  }
  return {
    id: book.id,
    title: book.title,
    authors: book.author_choices || [],
    category: String(book.category_id),
    year: book.year,
    publisher: book.publisher,
    isbn: book.isbn,
    language: book.language,
    pages: book.pages ? String(book.pages) : "",
    keywords: book.keywords || [],
    summary: book.summary,
    archived: book.state === "archived",
    cover: book.cover || "",
    copies: (book.copies || []).map((copy) => ({
      id: copy.id,
      callNumber: copy.call_number,
      inventoryNumber: copy.inventory_number || "",
      fonds: copy.fonds || "",
      secondaryCallNumber: copy.secondary_call_number || "",
      price: copy.price || "",
      section: copy.section || "",
      shelf: copy.shelf || "",
      acquiredOn: copy.acquired_on || "",
      status: copy.status,
      register: copy.register || null,
    })),
  }
}

function mark(title) {
  const source = title.trim() || "Livre"
  return source.replace(/['’]/g, "").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

export function BookFormPage({ mode }) {
  const { bookId } = useParams()
  const [state, setState] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let gone = false
    Promise.all([
      listCategories(),
      mode === "create" ? Promise.resolve({ ok: true, data: null }) : getBook(bookId),
    ]).then(([categories, book]) => {
      if (gone) return
      if (!categories.ok || !book.ok) {
        setError(book.error || categories.error)
        return
      }
      setState({ categories: categories.data, book: book.data })
    })
    return () => {
      gone = true
    }
  }, [mode, bookId])

  if (error) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!state) return <p>Chargement…</p>
  return (
    <BookForm
      key={`${mode}-${bookId || "nouveau"}`}
      initial={starting(state.book)}
      categories={state.categories}
      creating={mode === "create"}
      viewing={mode === "view"}
    />
  )
}

function BookForm({ initial, categories, creating, viewing }) {
  const coverInput = useId()
  const [title, setTitle] = useState(initial.title)
  const [authors, setAuthors] = useState(initial.authors)
  const [authorQuery, setAuthorQuery] = useState("")
  const [authorHits, setAuthorHits] = useState([])
  const [category, setCategory] = useState(initial.category)
  const [year, setYear] = useState(initial.year)
  const [publisher, setPublisher] = useState(initial.publisher)
  const [isbn, setIsbn] = useState(initial.isbn)
  const [language, setLanguage] = useState(initial.language)
  const [pages, setPages] = useState(initial.pages)
  const [keywords, setKeywords] = useState(initial.keywords)
  const [keyword, setKeyword] = useState("")
  const [summary, setSummary] = useState(initial.summary)
  const [archived, setArchived] = useState(initial.archived)
  const [copies, setCopies] = useState(initial.copies)
  const [adding, setAdding] = useState(false)
  const emptyCopy = { callNumber: "", inventoryNumber: "", fonds: "", secondaryCallNumber: "", price: "", section: "", shelf: "", acquiredOn: "", status: "Disponible" }
  const [draft, setDraft] = useState(emptyCopy)
  const [copyError, setCopyError] = useState("")
  const [editingId, setEditingId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState(location.state?.notice || "")
  const publish = useRef(true)
  const [coverUrl, setCoverUrl] = useState("")
  const [coverFile, setCoverFile] = useState(null)
  const [coverError, setCoverError] = useState("")
  const [problems, setProblems] = useState([])

  useEffect(() => () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl)
  }, [coverUrl])

  useEffect(() => {
    const text = authorQuery.trim()
    if (text.length < 2) {
      setAuthorHits([])
      return undefined
    }
    let gone = false
    const timer = setTimeout(() => {
      listAuthors({ q: text, page: 1, pageSize: 8 }).then((result) => {
        if (gone || !result.ok) return
        const chosen = new Set(authors.map((item) => item.id))
        setAuthorHits((result.data.results || []).filter((item) => !chosen.has(item.id)))
      })
    }, 250)
    return () => {
      gone = true
      clearTimeout(timer)
    }
  }, [authorQuery, authors])

  function addAuthor(person) {
    if (!person || authors.some((item) => item.id === person.id)) return
    setAuthors((current) => [...current, { id: person.id, name: person.name }])
    setAuthorQuery("")
    setAuthorHits([])
  }

  function addKeyword(event) {
    if (event.key !== "Enter") return
    event.preventDefault()
    const value = keyword.trim().slice(0, 200)
    if (value && !keywords.includes(value)) setKeywords((current) => [...current, value])
    setKeyword("")
  }

  function onCover(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      setCoverError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
      return
    }
    if (file.size > MAX_IMAGE) {
      setCoverError("L'image ne doit pas dépasser 2 Mo.")
      return
    }
    setCoverError("")
    setCoverFile(file)
    setCoverUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  function addCopy() {
    const callNumber = draft.callNumber.trim()
    const inventoryNumber = draft.inventoryNumber.trim()
    if (!callNumber) {
      setCopyError("Chaque exemplaire a besoin d'une cote.")
      return
    }
    if (inventoryNumber && copies.some((copy) => copy.inventoryNumber === inventoryNumber)) {
      setCopyError("Ce numéro d'inventaire est déjà utilisé.")
      return
    }
    setCopyError("")
    setCopies((current) => [...current, {
      id: `n${Date.now()}`,
      callNumber,
      inventoryNumber,
      fonds: draft.fonds.trim(),
      secondaryCallNumber: draft.secondaryCallNumber.trim(),
      price: draft.price.trim(),
      section: draft.section.trim(),
      shelf: draft.shelf.trim(),
      acquiredOn: draft.acquiredOn,
      status: draft.status,
      register: null,
    }])
    setDraft(emptyCopy)
    setAdding(false)
  }

  async function save(event) {
    event.preventDefault()
    if (viewing) return
    const next = []
    if (!title.trim()) next.push("Le titre est obligatoire.")
    if (authors.length === 0) next.push("Indiquez au moins un auteur.")
    if (!category) next.push("La catégorie est obligatoire.")
    const yearNumber = Number(year)
    if (year && (!Number.isInteger(yearNumber) || yearNumber < 1000 || yearNumber > 2100)) {
      next.push("L'année de publication doit être comprise entre 1000 et 2100.")
    }
    const pageNumber = Number(pages)
    if (pages && (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 20000)) {
      next.push("Le nombre de pages n'est pas valide.")
    }
    setProblems(next)
    if (next.length > 0) return
    const body = new FormData()
    body.set("title", title.trim())
    body.set("summary", summary.trim())
    body.set("category_id", category)
    body.set("author_ids", JSON.stringify(authors.map((person) => person.id)))
    body.set("year", year)
    body.set("language", language)
    body.set("publisher", publisher.trim())
    body.set("isbn", isbn.trim())
    body.set("pages", pages)
    body.set("keywords", JSON.stringify(keywords))
    body.set("state", publish.current ? "published" : "draft")
    body.set("copies", JSON.stringify(copies.map((copy) => ({
      id: typeof copy.id === "number" ? copy.id : undefined,
      call_number: copy.callNumber,
      inventory_number: copy.inventoryNumber,
      fonds: copy.fonds,
      secondary_call_number: copy.secondaryCallNumber,
      price: copy.price,
      section: copy.section,
      shelf: copy.shelf,
      acquired_on: copy.acquiredOn,
      status: copy.status,
    }))))
    if (coverFile) body.set("cover", coverFile)
    const result = await saveBook(initial.id, body)
    if (!result.ok) {
      setProblems([result.error])
      return
    }
    const message = publish.current ? bookNotices.published : bookNotices.draft
    if (creating) {
      navigate(`/catalogue/livres/${result.data.id}/modifier`, { state: { notice: message } })
      return
    }
    setNotice(message)
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      {notice ? <p role="status" className="rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => <p key={problem}>{problem}</p>)}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <BookOpen aria-hidden="true" className="text-violet" size={24} />
            Informations du livre
          </h2>
          <p className="mt-2 text-muted">Obligatoires : le titre, au moins un auteur et la catégorie. Les autres champs peuvent rester vides.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Titre *</span>
              <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={400} required disabled={viewing} />
            </label>
            <div className="grid gap-1">
              <span className="font-semibold text-heading">Auteurs *</span>
              <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-control border border-line px-2">
                {authors.map((person) => (
                  <span key={person.id} className="inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-1 font-semibold text-violet">
                    {person.name}
                    {viewing ? null : <button type="button" aria-label={`Retirer ${person.name}`} onClick={() => setAuthors(authors.filter((item) => item.id !== person.id))}>×</button>}
                  </span>
                ))}
                {viewing ? null : (
                  <input
                    className="min-w-40 flex-1 border-0 bg-transparent py-2"
                    value={authorQuery}
                    aria-label="Rechercher un auteur"
                    placeholder="Rechercher un auteur"
                    onChange={(event) => setAuthorQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault()
                    }}
                  />
                )}
              </div>
              {authorHits.length > 0 ? (
                <ul className="rounded-control border border-line bg-white">
                  {authorHits.map((person) => (
                    <li key={person.id}>
                      <button type="button" className="w-full px-3 py-2 text-left hover:bg-lavender" onClick={() => addAuthor(person)}>
                        {person.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Catégorie *</span>
              <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)} required disabled={viewing}>
                <option value="">Choisir</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.parent_name ? `${item.parent_name} — ${item.name}` : item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Année de publication (facultatif)</span>
              <input className={fieldClass} inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} maxLength={4} disabled={viewing} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Éditeur (facultatif)</span>
              <input className={fieldClass} value={publisher} onChange={(event) => setPublisher(event.target.value)} maxLength={200} disabled={viewing} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">ISBN (facultatif)</span>
              <input className={fieldClass} value={isbn} onChange={(event) => setIsbn(event.target.value)} maxLength={24} disabled={viewing} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Langue</span>
              <select className={fieldClass} value={language} onChange={(event) => setLanguage(event.target.value)} disabled={viewing}>
                {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Nombre de pages (facultatif)</span>
              <input className={fieldClass} inputMode="numeric" value={pages} onChange={(event) => setPages(event.target.value)} disabled={viewing} />
            </label>
          </div>
          <label className="mt-3 grid gap-1">
            <span className="font-semibold text-heading">Mots-clés (facultatif)</span>
            <span className="flex min-h-11 flex-wrap items-center gap-2 rounded-control border border-line px-2">
              {keywords.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-1 font-semibold text-violet">
                  {item}
                  {viewing ? null : <button type="button" aria-label={`Retirer ${item}`} onClick={() => setKeywords(keywords.filter((word) => word !== item))}>×</button>}
                </span>
              ))}
              {viewing ? null : <input className="min-w-40 flex-1 border-0 bg-transparent py-2" value={keyword} maxLength={200} placeholder="Ajouter un mot-clé" onChange={(event) => setKeyword(event.target.value)} onKeyDown={addKeyword} />}
            </span>
          </label>
          <label className="mt-3 grid gap-1">
            <span className="font-semibold text-heading">Résumé (facultatif)</span>
            <textarea className="min-h-32 w-full rounded-control border border-line px-3 py-2" value={summary} onChange={(event) => setSummary(event.target.value)} disabled={viewing} />
          </label>
        </article>

        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="text-section text-heading">Couverture (facultatif)</h2>
          <div className="mt-4 flex items-start gap-4">
            {coverUrl || initial.cover ? (
              <img src={coverUrl || initial.cover} alt="" className="h-44 w-32 rounded-md object-cover" />
            ) : (
              <span className="grid h-44 w-32 place-items-center rounded-md bg-violet px-2 text-center font-semibold text-white">{mark(title)}</span>
            )}
            <div>
              <input id={coverInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onCover} />
              {viewing ? null : (
                <label htmlFor={coverInput} className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-line px-3 font-semibold text-violet">
                  Changer la couverture
                </label>
              )}
              <p className="mt-2 text-muted">Formats : JPG, PNG, WebP</p>
              <p className="text-muted">Taille max. : 2 Mo</p>
              {coverError ? <p role="alert" className="mt-2 text-unavailable">{coverError}</p> : null}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="font-semibold text-heading">Archivage</p>
              <p className="text-muted">{archived ? "Ce livre est archivé. Il n'apparaît pas sur le site public." : "Un livre archivé reste dans le catalogue et disparaît du site public."}</p>
            </div>
            {initial.id && !viewing ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-4 font-semibold text-heading"
                onClick={async () => {
                  if (!window.confirm(bookNotices.confirmArchive)) return
                  const result = await archiveBook(initial.id, true)
                  if (!result.ok) {
                    setProblems([result.error])
                    return
                  }
                  setArchived(true)
                  setNotice(bookNotices.archived)
                }}
              >
                <Archive aria-hidden="true" size={18} />
                Archiver
              </button>
            ) : null}
          </div>
        </article>
      </div>

      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Layers aria-hidden="true" className="text-violet" size={24} />
            Exemplaires ({copies.length})
          </h2>
          {viewing ? null : (
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet px-3 font-semibold text-violet" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" size={18} />
              Ajouter un exemplaire
            </button>
          )}
        </div>
        {adding ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className={fieldClass} placeholder="Cote *" aria-label="Cote" maxLength={80} value={draft.callNumber} onChange={(event) => setDraft({ ...draft, callNumber: event.target.value })} />
            <input className={fieldClass} placeholder="N. e. (facultatif)" aria-label="Numéro d'inventaire" maxLength={32} value={draft.inventoryNumber} onChange={(event) => setDraft({ ...draft, inventoryNumber: event.target.value })} />
            <input className={fieldClass} placeholder="Fonds (facultatif)" aria-label="Fonds" maxLength={32} value={draft.fonds} onChange={(event) => setDraft({ ...draft, fonds: event.target.value })} />
            <input className={fieldClass} placeholder="Cote secondaire (facultatif)" aria-label="Cote secondaire" maxLength={40} value={draft.secondaryCallNumber} onChange={(event) => setDraft({ ...draft, secondaryCallNumber: event.target.value })} />
            <input className={fieldClass} placeholder="Prix d'acquisition (facultatif)" aria-label="Prix d'acquisition" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
            <input className={fieldClass} placeholder="Rayon (facultatif)" aria-label="Rayon" maxLength={80} value={draft.section} onChange={(event) => setDraft({ ...draft, section: event.target.value })} />
            <input className={fieldClass} placeholder="Étagère (facultatif)" aria-label="Étagère" maxLength={80} value={draft.shelf} onChange={(event) => setDraft({ ...draft, shelf: event.target.value })} />
            <input className={fieldClass} type="date" aria-label="Date d'acquisition" value={draft.acquiredOn} onChange={(event) => setDraft({ ...draft, acquiredOn: event.target.value })} />
            <select className={fieldClass} aria-label="Statut de l'exemplaire" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              {COPY_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button type="button" className="inline-flex min-h-11 items-center rounded-control bg-violet px-4 font-semibold text-white" onClick={addCopy}>Ajouter</button>
            {copyError ? <p role="alert" className="text-unavailable md:col-span-3">{copyError}</p> : null}
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-3 py-3 font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">N. e.</th>
                <th className="px-3 py-3 font-semibold">Cote</th>
                <th className="px-3 py-3 font-semibold">Fonds</th>
                <th className="px-3 py-3 font-semibold">Prix</th>
                <th className="px-3 py-3 font-semibold">Rayon</th>
                <th className="px-3 py-3 font-semibold">Statut</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {copies.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-muted">Aucun exemplaire.</td></tr>
              ) : copies.map((copy, index) => (
                <Fragment key={copy.id}>
                <tr className="border-b border-line">
                  <td className="px-3 py-3">{index + 1}</td>
                  <td className="px-3 py-3">
                    {editingId === copy.id ? (
                      <input className={fieldClass} aria-label="Numéro d'inventaire" maxLength={32} value={copy.inventoryNumber} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, inventoryNumber: event.target.value } : item))} />
                    ) : (copy.inventoryNumber || "—")}
                  </td>
                  <td className="px-3 py-3 font-semibold text-heading">
                    {editingId === copy.id ? (
                      <span className="grid gap-1">
                        <input className={fieldClass} aria-label="Cote" maxLength={80} value={copy.callNumber} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, callNumber: event.target.value } : item))} />
                        <input className={fieldClass} aria-label="Cote secondaire" maxLength={40} value={copy.secondaryCallNumber} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, secondaryCallNumber: event.target.value } : item))} />
                      </span>
                    ) : copy.callNumber}
                    {editingId === copy.id || !copy.secondaryCallNumber ? null : <span className="mt-1 block text-meta font-normal text-muted">Cote secondaire : {copy.secondaryCallNumber}</span>}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === copy.id ? (
                      <input className={fieldClass} aria-label="Fonds" maxLength={32} value={copy.fonds} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, fonds: event.target.value } : item))} />
                    ) : (copy.fonds || "—")}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === copy.id ? (
                      <input className={fieldClass} aria-label="Prix d'acquisition" value={copy.price} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, price: event.target.value } : item))} />
                    ) : (copy.price || "—")}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === copy.id ? (
                      <span className="grid gap-1">
                        <input className={fieldClass} aria-label="Rayon" maxLength={80} value={copy.section} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, section: event.target.value } : item))} />
                        <input className={fieldClass} aria-label="Étagère" maxLength={80} value={copy.shelf} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, shelf: event.target.value } : item))} />
                        <input className={fieldClass} type="date" aria-label="Date d'acquisition" value={copy.acquiredOn} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, acquiredOn: event.target.value } : item))} />
                      </span>
                    ) : (
                      <>
                        {[copy.section, copy.shelf].filter(Boolean).join(" – ") || "—"}
                        {copy.acquiredOn ? <span className="mt-1 block text-meta text-muted">{copy.acquiredOn}</span> : null}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === copy.id ? (
                      <select className={fieldClass} aria-label="Statut" value={copy.status} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, status: event.target.value } : item))}>
                        {COPY_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded-full px-3 py-1 font-semibold ${STATUS_CLASS[copy.status] || ""}`}>{copy.status}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {viewing ? null : (
                      <span className="flex gap-1">
                        <button type="button" aria-label="Modifier l'exemplaire" className="inline-flex h-11 w-11 items-center justify-center rounded-control text-gold" onClick={() => setEditingId(editingId === copy.id ? null : copy.id)}>
                          <Pencil size={18} />
                        </button>
                        <button type="button" aria-label="Retirer l'exemplaire" className="inline-flex h-11 w-11 items-center justify-center rounded-control text-unavailable" onClick={() => setCopies(copies.filter((item) => item.id !== copy.id))}>
                          <Archive size={18} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
                {copy.register ? (
                  <tr className="border-b border-line bg-paper">
                    <td colSpan={8} className="px-3 py-3">
                      <p className="font-semibold text-heading">Ligne du registre d'origine</p>
                      <p className="text-meta text-muted">Ligne {copy.register.source_line} — {copy.register.status}</p>
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        {copy.register.cells.map((cell) => (
                          <div key={cell.name}>
                            <dt className="text-meta text-muted">{cell.name}</dt>
                            <dd className="whitespace-pre-wrap text-body text-ink">{cell.value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/catalogue/livres" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {initial.id ? (
            <Link to={`/catalogue/livres/${initial.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-[#1d4ed8]">
              <Eye aria-hidden="true" size={18} />
              Aperçu
            </Link>
          ) : null}
          {viewing ? (
            <Link to={`/catalogue/livres/${initial.id}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
              <Pencil aria-hidden="true" size={18} />
              Modifier
            </Link>
          ) : (
            <>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet bg-white px-4 font-semibold text-violet" onClick={() => { publish.current = false }}>
                <Save aria-hidden="true" size={18} />
                Enregistrer en brouillon
              </button>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white" onClick={() => { publish.current = true }}>
                <Check aria-hidden="true" size={18} />
                Publier
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
