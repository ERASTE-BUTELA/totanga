import { useEffect, useState } from "react"
import { ArrowLeft, Building2, Pencil, Save } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getPublisher, savePublisher } from "../api/catalog.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase, saveAndGo } from "../lib/saveAndGo.js"

const fieldClass = "w-full rounded-control border border-line bg-white px-3"

export function PublisherFormPage({ mode = "create" }) {
  const { publisherId } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [problems, setProblems] = useState([])
  const [ready, setReady] = useState(mode === "create")
  const [phase, setPhase] = useState(null)
  const viewing = mode === "view"
  const busy = busyPhase(phase)

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
    if (busy) return
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
    await saveAndGo({
      setPhase,
      navigate,
      to: "/catalogue/editeurs",
      notice: "L'éditeur a été enregistré.",
    })
  }

  if (!ready) return <p>Chargement…</p>

  return (
    <form className="grid max-w-3xl gap-4" onSubmit={save}>
      {phase ? <FormSaveOverlay phase={phase} /> : null}
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => <p key={problem}>{problem}</p>)}
        </div>
      ) : null}
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <Building2 aria-hidden="true" className="text-violet" size={24} />
          Informations de l'éditeur
        </h2>
        <p className="mt-2 text-muted">Obligatoire : le nom. Les notes peuvent rester vides.</p>
        <label className="mt-4 grid gap-1">
          <span className="font-semibold text-heading">Nom *</span>
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required disabled={viewing} />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="font-semibold text-heading">Notes (facultatif)</span>
          <textarea className="min-h-32 w-full rounded-control border border-line px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={viewing} />
        </label>
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/catalogue/editeurs" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        {viewing ? (
          <Link to={`/catalogue/editeurs/${publisherId}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
            <Pencil aria-hidden="true" size={18} />
            Modifier
          </Link>
        ) : (
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white" disabled={busy}>
            <Save aria-hidden="true" size={18} />
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
      </div>
    </form>
  )
}
