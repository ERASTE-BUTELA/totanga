import { useEffect, useState } from "react"
import { ArrowLeft, Pencil, Save, Tag } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getCategory, saveCategory } from "../api/catalog.js"

const fieldClass = "w-full rounded-control border border-line bg-white px-3"

export function CategoryFormPage({ mode = "create" }) {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [problems, setProblems] = useState([])
  const [ready, setReady] = useState(mode === "create")
  const viewing = mode === "view"

  useEffect(() => {
    if (mode === "create") return undefined
    let gone = false
    getCategory(categoryId).then((result) => {
      if (gone) return
      if (!result.ok) {
        setProblems([result.error])
        setReady(true)
        return
      }
      setName(result.data.name)
      setDescription(result.data.description)
      setReady(true)
    })
    return () => {
      gone = true
    }
  }, [mode, categoryId])

  async function save(event) {
    event.preventDefault()
    if (!name.trim()) {
      setProblems(["Le nom est obligatoire."])
      return
    }
    const result = await saveCategory(mode === "edit" ? categoryId : null, {
      name: name.trim(),
      description: description.trim(),
    })
    if (!result.ok) {
      setProblems([result.error])
      return
    }
    navigate("/catalogue/categories")
  }

  if (!ready) return <p>Chargement…</p>

  return (
    <form className="grid max-w-3xl gap-4" onSubmit={save}>
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
        <label className="mt-4 grid gap-1">
          <span className="font-semibold text-heading">Nom de la catégorie *</span>
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required disabled={viewing} />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="font-semibold text-heading">Description</span>
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
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
            <Save aria-hidden="true" size={18} />
            Enregistrer
          </button>
        )}
      </div>
    </form>
  )
}
