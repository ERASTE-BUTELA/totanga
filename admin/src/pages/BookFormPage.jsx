import { Fragment, useEffect, useId, useRef, useState } from "react"
import { Archive, ArrowLeft, BookOpen, Check, Eye, Layers, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import { archiveBook, getBook, listAuthors, listCategories, listPublishers, saveBook } from "../api/catalog.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { SearchSelect } from "../components/SearchSelect.jsx"
import { busyPhase, saveAndGo } from "../lib/saveAndGo.js"
import { bookNotices } from "./texts.js"

function searchAuthors(query) {
  return listAuthors({ q: query, page: 1, pageSize: 20 })
}

function searchCategories(query) {
  return listCategories({ q: query, page: 1, pageSize: 20 })
}

function searchPublishers(query) {
  return listPublishers({ q: query, page: 1, pageSize: 50, autocomplete: true })
}

const COPY_STATUSES = ["Disponible", "Emprunté", "Réservé", "En réparation", "Perdu"]
const MAX_IMAGE = 5 * 1024 * 1024

const STATUS_CLASS = {
  Disponible: "bg-available-soft text-available",
  Emprunté: "bg-info-soft text-info",
  Réservé: "bg-warning-soft text-warning",
  "En réparation": "bg-lavender text-violet",
  Perdu: "bg-unavailable-soft text-unavailable",
}

const fieldClass = "w-full rounded-control border border-line bg-panel px-3"
const EMPTY_COPY = {
  callNumber: "",
  inventoryNumber: "",
  fonds: "",
  code1: "",
  code2: "",
  code3: "",
  code4: "",
  dewey: "",
  secondaryCallNumber: "",
  status: "Disponible",
}

function categoryLabel(item) {
  if (!item) return ""
  return item.parent_name ? `${item.parent_name} — ${item.name}` : item.name
}

function registerValue(register, name) {
  if (!register?.cells) return ""
  const cell = register.cells.find((item) => item.name === name)
  return cell?.value || ""
}

function copyFromApi(copy) {
  return {
    id: copy.id,
    callNumber: copy.call_number || "",
    inventoryNumber: copy.inventory_number || "",
    fonds: copy.fonds || "",
    code1: copy.code1 || registerValue(copy.register, "code1"),
    code2: copy.code2 || registerValue(copy.register, "code2"),
    code3: copy.code3 || registerValue(copy.register, "code3"),
    code4: copy.code4 || registerValue(copy.register, "code4"),
    dewey: copy.dewey || registerValue(copy.register, "Dewey"),
    secondaryCallNumber: copy.secondary_call_number || "",
    status: copy.status,
    register: copy.register || null,
  }
}

function starting(book) {
  if (!book) {
    return {
      id: null,
      title: "",
      authors: [],
      category: null,
      year: "",
      publisher: null,
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
    category: book.category_choice || (book.category_id ? { id: book.category_id, name: book.category || "", parent_name: "" } : null),
    year: book.year,
    publisher: book.publisher_choice || null,
    summary: book.summary,
    archived: book.state === "archived",
    cover: book.cover || "",
    copies: (book.copies || []).map(copyFromApi),
  }
}

function mark(title) {
  const source = title.trim() || "Livre"
  return source.replace(/['’]/g, "").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

function previewCallNumber(copy) {
  const left = String(copy.code1 || "").trim()
  const right = String(copy.code2 || "").trim()
  const letters = String(copy.dewey || "").trim().slice(0, 3)
  const base = left && right ? `${left}.${right}` : left || right
  if (base && letters) return `${base} ${letters}`
  return base || letters || copy.callNumber || "—"
}

function previewSecondary(copy) {
  const left = String(copy.code3 || "").trim()
  const right = String(copy.code4 || "").trim()
  if (left && right) return `${left}.${right}`
  return left || right || copy.secondaryCallNumber || ""
}

export function BookFormPage({ mode }) {
  const { bookId } = useParams()
  const [state, setState] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let gone = false
    const load = mode === "create" ? Promise.resolve({ ok: true, data: null }) : getBook(bookId)
    load.then((book) => {
      if (gone) return
      if (!book.ok) {
        setError(book.error)
        return
      }
      setState({ book: book.data })
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
      creating={mode === "create"}
      viewing={mode === "view"}
    />
  )
}

function BookForm({ initial, creating, viewing }) {
  const coverInput = useId()
  const copyModalTitleId = useId()
  const [title, setTitle] = useState(initial.title)
  const [authors, setAuthors] = useState(initial.authors)
  const [category, setCategory] = useState(initial.category)
  const [year, setYear] = useState(initial.year)
  const [publisher, setPublisher] = useState(initial.publisher)
  const [summary, setSummary] = useState(initial.summary)
  const [archived, setArchived] = useState(initial.archived)
  const [copies, setCopies] = useState(initial.copies)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY_COPY)
  const [copyError, setCopyError] = useState("")
  const [editingId, setEditingId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState(location.state?.notice || "")
  const publish = useRef(true)
  const [coverUrl, setCoverUrl] = useState("")
  const [coverFile, setCoverFile] = useState(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [coverError, setCoverError] = useState("")
  const [problems, setProblems] = useState([])
  const [phase, setPhase] = useState(null)
  const busy = busyPhase(phase)
  const shownCover = coverUrl || (!removeCover && initial.cover) || ""

  useEffect(() => () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl)
  }, [coverUrl])

  useEffect(() => {
    if (!adding) return undefined
    function onKeyDown(event) {
      if (event.key === "Escape") closeCopyModal()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [adding])

  function closeCopyModal() {
    setAdding(false)
    setDraft(EMPTY_COPY)
    setCopyError("")
  }

  function openCopyModal() {
    setDraft(EMPTY_COPY)
    setCopyError("")
    setAdding(true)
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
      setCoverError("L'image ne doit pas dépasser 5 Mo.")
      return
    }
    setCoverError("")
    setRemoveCover(false)
    setCoverFile(file)
    setCoverUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  function clearCover() {
    setCoverError("")
    setCoverFile(null)
    setRemoveCover(true)
    setCoverUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return ""
    })
  }

  function validateCodes(copy) {
    const code1 = copy.code1.trim()
    const code2 = copy.code2.trim()
    const dewey = copy.dewey.trim()
    if (!code1 && !code2 && !dewey) {
      return "Indiquez au moins code1, code2 ou Dewey pour former la cote."
    }
    return ""
  }

  function addCopy() {
    const inventoryNumber = draft.inventoryNumber.trim()
    const codesError = validateCodes(draft)
    if (codesError) {
      setCopyError(codesError)
      return
    }
    if (inventoryNumber && copies.some((copy) => copy.inventoryNumber === inventoryNumber)) {
      setCopyError("Ce numéro d'inventaire (N. e.) est déjà utilisé.")
      return
    }
    setCopyError("")
    setCopies((current) => [
      ...current,
      {
        id: `n${Date.now()}`,
        ...EMPTY_COPY,
        inventoryNumber,
        fonds: draft.fonds.trim(),
        code1: draft.code1.trim(),
        code2: draft.code2.trim(),
        code3: draft.code3.trim(),
        code4: draft.code4.trim(),
        dewey: draft.dewey.trim(),
        status: draft.status,
        register: null,
      },
    ])
    setDraft(EMPTY_COPY)
    setAdding(false)
  }

  function updateCopy(id, patch) {
    setCopies((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function save(event) {
    event.preventDefault()
    if (viewing || busy) return
    const next = []
    if (!title.trim()) next.push("Le titre est obligatoire.")
    if (authors.length === 0) next.push("Indiquez au moins un auteur.")
    if (!category) next.push("La catégorie (CLASSE / SOUS-CLASSE) est obligatoire.")
    const yearNumber = Number(year)
    if (year && (!Number.isInteger(yearNumber) || yearNumber < 1000 || yearNumber > 2100)) {
      next.push("La date de publication doit être une année entre 1000 et 2100.")
    }
    for (const copy of copies) {
      const codesError = validateCodes(copy)
      if (codesError) {
        next.push(`Exemplaire ${copy.inventoryNumber || "sans N. e."} : ${codesError}`)
        break
      }
    }
    setProblems(next)
    if (next.length > 0) return
    setPhase("saving")
    const body = new FormData()
    body.set("title", title.trim())
    body.set("summary", summary.trim())
    body.set("category_id", category.id)
    body.set("author_ids", JSON.stringify(authors.map((person) => person.id)))
    body.set("year", year)
    body.set("language", "fr")
    body.set("publisher_id", publisher ? String(publisher.id) : "")
    body.set("isbn", "")
    body.set("pages", "")
    body.set("keywords", JSON.stringify([]))
    body.set("state", publish.current ? "published" : "draft")
    body.set(
      "copies",
      JSON.stringify(
        copies.map((copy) => ({
          id: typeof copy.id === "number" ? copy.id : undefined,
          inventory_number: copy.inventoryNumber,
          fonds: copy.fonds,
          code1: copy.code1,
          code2: copy.code2,
          code3: copy.code3,
          code4: copy.code4,
          dewey: copy.dewey,
          status: copy.status,
        })),
      ),
    )
    if (coverFile) body.set("cover", coverFile)
    if (removeCover && !coverFile) body.set("remove_cover", "true")
    const result = await saveBook(initial.id, body)
    if (!result.ok) {
      setPhase(null)
      setProblems([result.error])
      return
    }
    const message = publish.current ? bookNotices.published : bookNotices.draft
    await saveAndGo({
      setPhase,
      navigate,
      to: "/catalogue/livres",
      notice: message,
    })
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      {phase ? <FormSaveOverlay phase={phase} label={phase === "done" ? (publish.current ? "Publié" : "Enregistré") : undefined} /> : null}
      {notice ? <p role="status" className="rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <BookOpen aria-hidden="true" className="text-violet" size={24} />
            Fiche livre (répertoire)
          </h2>
          <p className="mt-2 text-muted">
            Champs alignés sur le fichier REPERTOIRE : titre, auteur, éditeur, date de publication, classe et résumé.
            Les codes de cotation se saisissent sur chaque exemplaire.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 sm:col-span-2">
              <span className="font-semibold text-heading">Titre *</span>
              <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={400} required disabled={viewing} />
            </label>
            <SearchSelect
              label="Auteur"
              multiple
              values={authors}
              onChange={setAuthors}
              search={searchAuthors}
              labelOf={(item) => item.name}
              placeholder="Choisir un auteur"
              required
              disabled={viewing}
              clearable={false}
            />
            <SearchSelect
              label="Éditeur"
              value={publisher}
              onChange={setPublisher}
              search={searchPublishers}
              labelOf={(item) => item.name}
              placeholder="Rechercher un éditeur…"
              emptyLabel="Aucun éditeur trouvé."
              disabled={viewing}
              clearable={!viewing}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SearchSelect
              label="CLASSE / SOUS-CLASSE"
              value={category}
              onChange={setCategory}
              search={searchCategories}
              labelOf={categoryLabel}
              placeholder="Choisir une catégorie"
              required
              disabled={viewing}
              clearable={!viewing}
            />
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Date publ. (année)</span>
              <input className={fieldClass} inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} maxLength={4} disabled={viewing} placeholder="ex. 2019" />
            </label>
          </div>
          <label className="mt-3 grid gap-1">
            <span className="font-semibold text-heading">Resumé</span>
            <textarea className="min-h-28 w-full rounded-control border border-line px-3 py-2" value={summary} onChange={(event) => setSummary(event.target.value)} disabled={viewing} />
          </label>
        </article>

        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="text-section text-heading">Couverture</h2>
          <div className="mt-4 flex items-start gap-4">
            {shownCover ? (
              <img src={shownCover} alt="" className="h-56 w-40 rounded-md object-cover shadow-card" />
            ) : (
              <span className="grid h-56 w-40 place-items-center rounded-md bg-violet px-2 text-center font-semibold text-on-primary">{mark(title)}</span>
            )}
            <div>
              <input id={coverInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onCover} />
              {viewing ? null : (
                <div className="flex flex-wrap gap-2">
                  <label htmlFor={coverInput} className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-line px-3 font-semibold text-violet">
                    {shownCover ? "Changer" : "Ajouter"}
                  </label>
                  {shownCover ? (
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable" onClick={clearCover}>
                      <Trash2 aria-hidden="true" size={18} />
                      Enlever
                    </button>
                  ) : null}
                </div>
              )}
              <p className="mt-2 text-muted">JPG, PNG, WebP · 5 Mo max.</p>
              {coverError ? <p role="alert" className="mt-2 text-unavailable">{coverError}</p> : null}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="font-semibold text-heading">Archivage</p>
              <p className="text-muted">{archived ? "Archivé : invisible sur le site public." : "Archiver retire le livre du site public."}</p>
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

      <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Layers aria-hidden="true" className="text-violet" size={24} />
            Exemplaires ({copies.length})
          </h2>
          {viewing ? null : (
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet px-3 font-semibold text-violet" onClick={openCopyModal}>
              <Plus aria-hidden="true" size={18} />
              Ajouter un exemplaire
            </button>
          )}
        </div>
        <p className="mt-2 text-muted">
          Comme dans le répertoire : <strong>N. e.</strong>, <strong>F.N.</strong>, <strong>code1–code4</strong> et <strong>Dewey</strong>.
          La cote affichée au public = <strong>code1.code2</strong> + <strong>Dewey</strong> (ex. 302.1 DEF). Cote secondaire = code3.code4.
        </p>

        {adding ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4" role="presentation" onClick={closeCopyModal}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={copyModalTitleId}
              className="grid max-h-[90vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-panel border border-line bg-panel p-5 shadow-panel sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 id={copyModalTitleId} className="flex items-center gap-2 text-section text-heading">
                    <Layers aria-hidden="true" className="text-violet" size={22} />
                    Nouvel exemplaire
                  </h3>
                  <p className="mt-1 text-meta text-muted">La cote publique sera code1.code2 suivi de Dewey (trois lettres).</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-violet"
                  aria-label="Fermer"
                  onClick={closeCopyModal}
                >
                  <X aria-hidden="true" size={20} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">N. e.</span>
                  <input className={fieldClass} maxLength={32} value={draft.inventoryNumber} onChange={(event) => setDraft({ ...draft, inventoryNumber: event.target.value })} autoFocus />
                </label>
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">F.N.</span>
                  <input className={fieldClass} maxLength={32} value={draft.fonds} onChange={(event) => setDraft({ ...draft, fonds: event.target.value })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">code1 *</span>
                  <input className={fieldClass} maxLength={40} value={draft.code1} onChange={(event) => setDraft({ ...draft, code1: event.target.value })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">code2</span>
                  <input className={fieldClass} maxLength={40} value={draft.code2} onChange={(event) => setDraft({ ...draft, code2: event.target.value })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">code3</span>
                  <input className={fieldClass} maxLength={40} value={draft.code3} onChange={(event) => setDraft({ ...draft, code3: event.target.value })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">code4</span>
                  <input className={fieldClass} maxLength={40} value={draft.code4} onChange={(event) => setDraft({ ...draft, code4: event.target.value })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">Dewey</span>
                  <input className={fieldClass} maxLength={40} value={draft.dewey} onChange={(event) => setDraft({ ...draft, dewey: event.target.value })} />
                </label>
                <label className="grid gap-1">
                  <span className="text-meta font-semibold text-heading">Statut</span>
                  <select className={fieldClass} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                    {COPY_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="rounded-control border border-line bg-canvas px-3 py-2 text-meta text-muted">
                Cote prévue : <span className="font-semibold text-heading">{previewCallNumber(draft)}</span>
                {previewSecondary(draft) ? (
                  <>
                    {" "}
                    · secondaire : <span className="font-semibold text-heading">{previewSecondary(draft)}</span>
                  </>
                ) : null}
              </p>

              {copyError ? <p role="alert" className="text-unavailable">{copyError}</p> : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="inline-flex min-h-11 items-center rounded-control border border-line px-4 font-semibold text-heading" onClick={closeCopyModal}>
                  Annuler
                </button>
                <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary" onClick={addCopy}>
                  <Plus aria-hidden="true" size={18} />
                  Ajouter l'exemplaire
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-3 py-3 font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">N. e.</th>
                <th className="px-3 py-3 font-semibold">F.N.</th>
                <th className="px-3 py-3 font-semibold">Codes / Dewey</th>
                <th className="px-3 py-3 font-semibold">Cote</th>
                <th className="px-3 py-3 font-semibold">Statut</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {copies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-muted">
                    Aucun exemplaire.
                  </td>
                </tr>
              ) : (
                copies.map((copy, index) => (
                  <Fragment key={copy.id}>
                    <tr className="border-b border-line">
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3">
                        {editingId === copy.id ? (
                          <input className={fieldClass} maxLength={32} value={copy.inventoryNumber} onChange={(event) => updateCopy(copy.id, { inventoryNumber: event.target.value })} />
                        ) : (
                          copy.inventoryNumber || "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {editingId === copy.id ? (
                          <input className={fieldClass} maxLength={32} value={copy.fonds} onChange={(event) => updateCopy(copy.id, { fonds: event.target.value })} />
                        ) : (
                          copy.fonds || "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {editingId === copy.id ? (
                          <span className="grid gap-1 sm:grid-cols-2">
                            <input className={fieldClass} aria-label="code1" placeholder="code1" maxLength={40} value={copy.code1} onChange={(event) => updateCopy(copy.id, { code1: event.target.value })} />
                            <input className={fieldClass} aria-label="code2" placeholder="code2" maxLength={40} value={copy.code2} onChange={(event) => updateCopy(copy.id, { code2: event.target.value })} />
                            <input className={fieldClass} aria-label="code3" placeholder="code3" maxLength={40} value={copy.code3} onChange={(event) => updateCopy(copy.id, { code3: event.target.value })} />
                            <input className={fieldClass} aria-label="code4" placeholder="code4" maxLength={40} value={copy.code4} onChange={(event) => updateCopy(copy.id, { code4: event.target.value })} />
                            <input className={fieldClass} aria-label="Dewey" placeholder="Dewey" maxLength={40} value={copy.dewey} onChange={(event) => updateCopy(copy.id, { dewey: event.target.value })} />
                          </span>
                        ) : (
                          <span className="text-meta">
                            {[copy.code1, copy.code2, copy.code3, copy.code4].filter(Boolean).join(" · ") || "—"}
                            {copy.dewey ? <span className="mt-1 block text-muted">Dewey : {copy.dewey}</span> : null}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-heading">
                        {previewCallNumber(copy)}
                        {previewSecondary(copy) ? <span className="mt-1 block text-meta font-normal text-muted">Secondaire : {previewSecondary(copy)}</span> : null}
                      </td>
                      <td className="px-3 py-3">
                        {editingId === copy.id ? (
                          <select className={fieldClass} value={copy.status} onChange={(event) => updateCopy(copy.id, { status: event.target.value })}>
                            {COPY_STATUSES.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
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
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/catalogue/livres" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {initial.id ? (
            <Link to={`/catalogue/livres/${initial.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-info">
              <Eye aria-hidden="true" size={18} />
              Aperçu
            </Link>
          ) : null}
          {viewing ? (
            <Link to={`/catalogue/livres/${initial.id}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary">
              <Pencil aria-hidden="true" size={18} />
              Modifier
            </Link>
          ) : (
            <>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet bg-panel px-4 font-semibold text-violet" disabled={busy} onClick={() => { publish.current = false }}>
                <Save aria-hidden="true" size={18} />
                {busy && !publish.current ? "Enregistrement…" : "Enregistrer en brouillon"}
              </button>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary" disabled={busy} onClick={() => { publish.current = true }}>
                <Check aria-hidden="true" size={18} />
                {busy && publish.current ? "Publication…" : "Publier"}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
