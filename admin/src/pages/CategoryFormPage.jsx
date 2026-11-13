import { useEffect, useId, useRef, useState } from "react"
import { Navigate } from "react-router"
import { Save, Tag, X } from "lucide-react"
import { getCategory, listCategories, saveCategory } from "../api/catalog.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase } from "../lib/saveAndGo.js"

const fieldClass = "w-full rounded-control border border-line bg-panel px-3"

/** Formulaire catégorie (modal). mode: create | edit | view */
export function CategoryFormModal({ mode = "create", categoryId = null, onClose, onSaved }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [parentId, setParentId] = useState("")
  const [classes, setClasses] = useState([])
  const [problems, setProblems] = useState([])
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState(null)
  const viewing = mode === "view"
  const busy = busyPhase(phase)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event) {
      if (event.key === "Escape" && !busy) onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, busy])

  useEffect(() => {
    let gone = false
    Promise.all([
      listCategories(),
      mode === "create" ? Promise.resolve({ ok: true, data: null }) : getCategory(categoryId),
    ]).then(([list, result]) => {
      if (gone) return
      if (!list.ok || !result.ok) {
        setProblems([list.error || result.error])
        setReady(true)
        return
      }
      const rows = Array.isArray(list.data) ? list.data : list.data?.results || []
      const currentId = mode === "create" ? null : Number(categoryId)
      setClasses(rows.filter((item) => !item.parent_id && item.id !== currentId))
      if (result.data) {
        setName(result.data.name)
        setDescription(result.data.description || "")
        setParentId(result.data.parent_id ? String(result.data.parent_id) : "")
      }
      setReady(true)
    })
    return () => {
      gone = true
    }
  }, [mode, categoryId])

  async function save(event) {
    event.preventDefault()
    if (busy || viewing) return
    if (!name.trim()) {
      setProblems(["Le nom est obligatoire."])
      return
    }
    setPhase("saving")
    const result = await saveCategory(mode === "edit" ? categoryId : null, {
      name: name.trim(),
      description: description.trim(),
      parent_id: parentId || null,
    })
    if (!result.ok) {
      setPhase(null)
      setProblems([result.error])
      return
    }
    setPhase("done")
    await new Promise((resolve) => window.setTimeout(resolve, 750))
    onSaved?.("La catégorie a été enregistrée.")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4" role="presentation" onClick={() => !busy && onClose()}>
      {phase ? <FormSaveOverlay phase={phase} /> : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="form-save-card grid w-full max-w-lg gap-4 rounded-panel bg-panel p-5 shadow-panel sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-section text-heading">
            <Tag aria-hidden="true" className="text-violet" size={22} />
            {mode === "create" ? "Nouvelle catégorie" : mode === "edit" ? "Modifier la catégorie" : "Voir la catégorie"}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-violet"
            aria-label="Fermer"
            disabled={busy}
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {!ready ? (
          <p>Chargement…</p>
        ) : (
          <form className="grid gap-3" onSubmit={save}>
            {problems.length > 0 ? (
              <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-3 text-unavailable">
                {problems.map((problem) => (
                  <p key={problem}>{problem}</p>
                ))}
              </div>
            ) : null}
            <p className="text-muted">Obligatoire : le nom. Sans classe, c'est une classe.</p>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Classe (facultatif)</span>
              <select className={fieldClass} value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={viewing || busy}>
                <option value="">Aucune : c'est une classe</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Nom *</span>
              <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required disabled={viewing || busy} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Description (facultatif)</span>
              <textarea className="min-h-28 w-full rounded-control border border-line px-3 py-2" value={description} onChange={(event) => setDescription(event.target.value)} disabled={viewing || busy} />
            </label>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button type="button" className="inline-flex min-h-11 items-center rounded-control border border-line px-4 font-semibold text-heading" disabled={busy} onClick={onClose}>
                {viewing ? "Fermer" : "Annuler"}
              </button>
              {viewing ? null : (
                <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary" disabled={busy}>
                  <Save aria-hidden="true" size={18} />
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/** Anciennes routes de formulaire : retour à la liste. */
export function CategoryFormPage() {
  return <Navigate to="/catalogue/categories" replace />
}
