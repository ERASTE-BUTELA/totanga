import { useEffect, useState } from "react"
import { ArrowLeft, Pencil, Save, Tag } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getCategory, listCategories, saveCategory } from "../api/catalog.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase, saveAndGo } from "../lib/saveAndGo.js"

const fieldClass = "w-full rounded-control border border-line bg-white px-3"

export function CategoryFormPage({ mode = "create" }) {
  const { categoryId } = useParams()
  const navigate = useNavigate()
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
      const currentId = mode === "create" ? null : Number(categoryId)
      setClasses(list.data.filter((item) => !item.parent_id && item.id !== currentId))
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
    if (busy) return
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
    await saveAndGo({
      setPhase,
      navigate,
      to: "/catalogue/categories",
      notice: "La catégorie a été enregistrée.",
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
          <Tag aria-hidden="true" className="text-violet" size={24} />
          Informations de la catégorie
        </h2>
        <p className="mt-2 text-muted">Obligatoire : le nom. Sans classe, c'est une classe. Une sous-classe ne contient pas d'autre sous-classe.</p>
        <label className="mt-4 grid gap-1">
          <span className="font-semibold text-heading">Classe (facultatif)</span>
          <select className={fieldClass} value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={viewing}>
            <option value="">Aucune : c'est une classe</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="mt-4 grid gap-1">
          <span className="font-semibold text-heading">Nom *</span>
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required disabled={viewing} />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="font-semibold text-heading">Description (facultatif)</span>
          <textarea className="min-h-32 w-full rounded-control border border-line px-3 py-2" value={description} onChange={(event) => setDescription(event.target.value)} disabled={viewing} />
        </label>
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/catalogue/categories" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        {viewing ? (
          <Link to={`/catalogue/categories/${categoryId}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
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
