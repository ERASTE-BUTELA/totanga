import { useEffect, useId, useRef, useState } from "react"
import { Navigate } from "react-router"
import { Building2, Save, X } from "lucide-react"
import { getPublisher, savePublisher } from "../api/catalog.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase } from "../lib/saveAndGo.js"

const fieldClass = "w-full rounded-control border border-line bg-white px-3"

/** Formulaire éditeur (modal). mode: create | edit | view */
export function PublisherFormModal({ mode = "create", publisherId = null, onClose, onSaved }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [problems, setProblems] = useState([])
  const [ready, setReady] = useState(mode === "create")
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
    if (mode === "create") return undefined
    let gone = false
    getPublisher(publisherId).then((result) => {
      if (gone) return
      if (!result.ok) {
        setProblems([result.error])
        setReady(true)
        return
      }
      setName(result.data.name)
      setNotes(result.data.notes || "")
      setReady(true)
    })
    return () => {
      gone = true
    }
  }, [mode, publisherId])

  async function save(event) {
    event.preventDefault()
    if (busy || viewing) return
    if (!name.trim()) {
      setProblems(["Le nom est obligatoire."])
      return
    }
    setPhase("saving")
    const result = await savePublisher(mode === "edit" ? publisherId : null, {
      name: name.trim(),
      notes: notes.trim(),
    })
    if (!result.ok) {
      setPhase(null)
      setProblems([result.error])
      return
    }
    setPhase("done")
    await new Promise((resolve) => window.setTimeout(resolve, 750))
    onSaved?.("L'éditeur a été enregistré.")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(36_24_32_/_0.45)] p-4" role="presentation" onClick={() => !busy && onClose()}>
      {phase ? <FormSaveOverlay phase={phase} /> : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="form-save-card grid w-full max-w-lg gap-4 rounded-panel bg-white p-5 shadow-panel sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-section text-heading">
            <Building2 aria-hidden="true" className="text-violet" size={22} />
            {mode === "create" ? "Nouvel éditeur" : mode === "edit" ? "Modifier l'éditeur" : "Voir l'éditeur"}
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
            <p className="text-muted">Obligatoire : le nom. Les notes peuvent rester vides.</p>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Nom *</span>
              <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required disabled={viewing || busy} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Notes (facultatif)</span>
              <textarea className="min-h-28 w-full rounded-control border border-line px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={viewing || busy} />
            </label>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button type="button" className="inline-flex min-h-11 items-center rounded-control border border-line px-4 font-semibold text-heading" disabled={busy} onClick={onClose}>
                {viewing ? "Fermer" : "Annuler"}
              </button>
              {viewing ? null : (
                <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white" disabled={busy}>
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
export function PublisherFormPage() {
  return <Navigate to="/catalogue/editeurs" replace />
}
