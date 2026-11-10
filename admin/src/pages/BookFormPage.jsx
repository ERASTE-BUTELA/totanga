import { useEffect, useId, useRef, useState } from "react"
import { Archive, ArrowLeft, BookOpen, Check, Eye, Layers, Pencil, Plus, Save } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getBook, listAuthors, listCategories, saveBook } from "../api/catalog.js"

const LANGUAGES = [
  ["fr", "Français"],
  ["en", "Anglais"],
  ["ln", "Lingala"],
  ["kg", "Kikongo"],
  ["lua", "Tshiluba"],
  ["sw", "Swahili"],
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
    authors: book.author_ids,
    category: String(book.category_id),
    year: book.year,
    publisher: book.publisher,
    isbn: book.isbn,
    language: book.language,
    pages: book.pages ? String(book.pages) : "",
    keywords: book.keywords || [],
    summary: book.summary,
    archived: book.archived,
    cover: book.cover || "",
    copies: (book.copies || []).map((copy) => ({
      id: copy.id,
      callNumber: copy.call_number,
      place: copy.place,
      status: copy.status,
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
      listAuthors(),
      listCategories(),
      mode === "create" ? Promise.resolve({ ok: true, data: null }) : getBook(bookId),
    ]).then(([people, categories, book]) => {
      if (gone) return
      if (!people.ok || !categories.ok || !book.ok) {
        setError(book.error || people.error || categories.error)
        return
      }
      setState({ people: people.data, categories: categories.data, book: book.data })
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
      people={state.people}
      categories={state.categories}
      creating={mode === "create"}
      viewing={mode === "view"}
    />
  )
}

function BookForm({ initial, people, categories, creating, viewing }) {
  const coverInput = useId()
  const [title, setTitle] = useState(initial.title)
  const [authors, setAuthors] = useState(initial.authors)
  const [authorPick, setAuthorPick] = useState("")
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
  const [draft, setDraft] = useState({ callNumber: "", place: "", status: "Disponible" })
  const [editingId, setEditingId] = useState(null)
  const navigate = useNavigate()
  const publish = useRef(true)
  const [coverUrl, setCoverUrl] = useState("")
  const [coverFile, setCoverFile] = useState(null)
  const [coverReady, setCoverReady] = useState(Boolean(initial.cover))
  const [coverError, setCoverError] = useState("")
  const [problems, setProblems] = useState([])

  useEffect(() => () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl)
  }, [coverUrl])

  function addAuthor(id) {
    const number = Number(id)
    if (number && !authors.includes(number)) setAuthors((current) => [...current, number])
    setAuthorPick("")
  }

  function addKeyword(event) {
    if (event.key !== "Enter") return
    event.preventDefault()
    const value = keyword.trim()
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
    setCoverReady(true)
    setCoverUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  function addCopy() {
    const callNumber = draft.callNumber.trim()
    if (!callNumber || !draft.place.trim()) return
    if (copies.some((copy) => copy.callNumber === callNumber)) return
    setCopies((current) => [...current, { id: `n${Date.now()}`, callNumber, place: draft.place.trim(), status: draft.status }])
    setDraft({ callNumber: "", place: "", status: "Disponible" })
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
    if (!year || yearNumber < 1000 || yearNumber > 2100) next.push("L'année de publication doit être comprise entre 1000 et 2100.")
    if (!language) next.push("La langue est obligatoire.")
    if (!summary.trim()) next.push("Le résumé est obligatoire.")
    if (creating && !coverFile) next.push("La couverture est obligatoire.")
    setProblems(next)
    if (next.length > 0) return
    const body = new FormData()
    body.set("title", title.trim())
    body.set("summary", summary.trim())
    body.set("category_id", category)
    body.set("author_ids", JSON.stringify(authors))
    body.set("year", year)
    body.set("language", language)
    body.set("publisher", publisher.trim())
    body.set("isbn", isbn.trim())
    body.set("pages", pages)
    body.set("keywords", JSON.stringify(keywords))
    body.set("published", publish.current ? "true" : "false")
    body.set("archived", archived ? "true" : "false")
    body.set("copies", JSON.stringify(copies.map((copy) => ({
      call_number: copy.callNumber,
      place: copy.place,
      status: copy.status,
    }))))
    if (coverFile) body.set("cover", coverFile)
    const result = await saveBook(initial.id, body)
    if (!result.ok) {
      setProblems([result.error])
      return
    }
    navigate("/catalogue/livres")
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Titre *</span>
              <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required disabled={viewing} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Auteurs *</span>
              <span className="flex min-h-11 flex-wrap items-center gap-2 rounded-control border border-line px-2">
                {authors.map((id) => {
                  const person = people.find((item) => item.id === id)
                  const name = person ? person.name : "Auteur"
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-1 font-semibold text-violet">
                      {name}
                      {viewing ? null : <button type="button" aria-label={`Retirer ${name}`} onClick={() => setAuthors(authors.filter((item) => item !== id))}>×</button>}
                    </span>
                  )
                })}
                {viewing ? null : (
                  <select className="min-w-8 flex-1 border-0 bg-transparent" value={authorPick} aria-label="Ajouter un auteur" onChange={(event) => addAuthor(event.target.value)}>
                    <option value="">Ajouter</option>
                    {people.filter((person) => !authors.includes(person.id)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select>
                )}
              </span>
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Catégorie *</span>
              <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)} required disabled={viewing}>
                <option value="">Choisir</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Année de publication *</span>
              <input className={fieldClass} inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} required disabled={viewing} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Éditeur</span>
              <input className={fieldClass} value={publisher} onChange={(event) => setPublisher(event.target.value)} disabled={viewing} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">ISBN</span>
              <input className={fieldClass} value={isbn} onChange={(event) => setIsbn(event.target.value)} disabled={viewing} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Langue *</span>
              <select className={fieldClass} value={language} onChange={(event) => setLanguage(event.target.value)} required disabled={viewing}>
                {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Nombre de pages</span>
              <input className={fieldClass} inputMode="numeric" value={pages} onChange={(event) => setPages(event.target.value)} disabled={viewing} />
            </label>
          </div>
          <label className="mt-3 grid gap-1">
            <span className="font-semibold text-heading">Mots-clés</span>
            <span className="flex min-h-11 flex-wrap items-center gap-2 rounded-control border border-line px-2">
              {keywords.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-1 font-semibold text-violet">
                  {item}
                  <button type="button" aria-label={`Retirer ${item}`} onClick={() => setKeywords(keywords.filter((word) => word !== item))}>×</button>
                </span>
              ))}
              {viewing ? null : <input className="min-w-40 flex-1 border-0 bg-transparent py-2" value={keyword} placeholder="Ajouter un mot-clé" onChange={(event) => setKeyword(event.target.value)} onKeyDown={addKeyword} />}
            </span>
          </label>
          <label className="mt-3 grid gap-1">
            <span className="font-semibold text-heading">Résumé *</span>
            <textarea className="min-h-32 w-full rounded-control border border-line px-3 py-2" value={summary} onChange={(event) => setSummary(event.target.value)} required disabled={viewing} />
          </label>
        </article>

        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="text-section text-heading">Couverture du livre</h2>
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
          <div className="mt-6 flex items-start justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="font-semibold text-heading">Livre archivé</p>
              <p className="text-muted">Le livre reste dans le catalogue, mais n'est plus mis en avant.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={archived}
              aria-label="Livre archivé"
              className={`relative h-8 w-14 shrink-0 rounded-full ${archived ? "bg-violet" : "bg-line"}`}
              disabled={viewing}
              onClick={() => setArchived((current) => !current)}
            >
              <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white ${archived ? "translate-x-6" : ""}`} />
            </button>
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
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_1fr_auto]">
            <input className={fieldClass} placeholder="Cote" aria-label="Cote" value={draft.callNumber} onChange={(event) => setDraft({ ...draft, callNumber: event.target.value })} />
            <input className={fieldClass} placeholder="Emplacement" aria-label="Emplacement" value={draft.place} onChange={(event) => setDraft({ ...draft, place: event.target.value })} />
            <select className={fieldClass} aria-label="Statut de l'exemplaire" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              {COPY_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button type="button" className="inline-flex min-h-11 items-center rounded-control bg-violet px-4 font-semibold text-white" onClick={addCopy}>Ajouter</button>
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-3 py-3 font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">Cote</th>
                <th className="px-3 py-3 font-semibold">Emplacement</th>
                <th className="px-3 py-3 font-semibold">Statut</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {copies.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-muted">Aucun exemplaire.</td></tr>
              ) : copies.map((copy, index) => (
                <tr key={copy.id} className="border-b border-line">
                  <td className="px-3 py-3">{index + 1}</td>
                  <td className="px-3 py-3 font-semibold text-heading">
                    {editingId === copy.id ? (
                      <input className={fieldClass} aria-label="Cote" value={copy.callNumber} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, callNumber: event.target.value } : item))} />
                    ) : copy.callNumber}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === copy.id ? (
                      <input className={fieldClass} aria-label="Emplacement" value={copy.place} onChange={(event) => setCopies(copies.map((item) => item.id === copy.id ? { ...item, place: event.target.value } : item))} />
                    ) : copy.place}
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
