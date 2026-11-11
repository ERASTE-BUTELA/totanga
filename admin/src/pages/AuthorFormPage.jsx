import { useEffect, useId, useState } from "react"
import { ArrowLeft, Pencil, Save, UserRound } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getAuthor, saveAuthor } from "../api/catalog.js"

const MAX_IMAGE = 2 * 1024 * 1024
const fieldClass = "w-full rounded-control border border-line bg-white px-3"

export function AuthorFormPage({ mode = "create" }) {
  const { authorId } = useParams()
  const navigate = useNavigate()
  const photoInput = useId()
  const [name, setName] = useState("")
  const [biography, setBiography] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [photoFile, setPhotoFile] = useState(null)
  const [photoError, setPhotoError] = useState("")
  const [problems, setProblems] = useState([])
  const [ready, setReady] = useState(mode === "create")
  const viewing = mode === "view"

  useEffect(() => {
    if (mode === "create") return undefined
    let gone = false
    getAuthor(authorId).then((result) => {
      if (gone) return
      if (!result.ok) {
        setProblems([result.error])
        setReady(true)
        return
      }
      setName(result.data.name)
      setBiography(result.data.biography)
      setPhotoUrl(result.data.photo)
      setReady(true)
    })
    return () => {
      gone = true
    }
  }, [mode, authorId])

  useEffect(() => () => {
    if (photoUrl.startsWith("blob:")) URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  function onPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
      return
    }
    if (file.size > MAX_IMAGE) {
      setPhotoError("L'image ne doit pas dépasser 2 Mo.")
      return
    }
    setPhotoError("")
    setPhotoFile(file)
    setPhotoUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  async function save(event) {
    event.preventDefault()
    if (!name.trim()) {
      setProblems(["Le nom est obligatoire."])
      return
    }
    const body = new FormData()
    body.set("name", name.trim())
    body.set("biography", biography.trim())
    if (photoFile) body.set("photo", photoFile)
    const result = await saveAuthor(mode === "edit" ? authorId : null, body)
    if (!result.ok) {
      setProblems([result.error])
      return
    }
    navigate("/catalogue/auteurs")
  }

  if (!ready) return <p>Chargement…</p>

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
            <UserRound aria-hidden="true" className="text-violet" size={24} />
            Informations de l'auteur
          </h2>
          <p className="mt-2 text-muted">Obligatoire : le nom. La biographie et la photo peuvent rester vides.</p>
          <label className="mt-4 grid gap-1">
            <span className="font-semibold text-heading">Nom *</span>
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={300} required disabled={viewing} />
          </label>
          <label className="mt-3 grid gap-1">
            <span className="font-semibold text-heading">Biographie (facultatif)</span>
            <textarea className="min-h-40 w-full rounded-control border border-line px-3 py-2" value={biography} onChange={(event) => setBiography(event.target.value)} disabled={viewing} />
          </label>
        </article>
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="text-section text-heading">Photo (facultatif)</h2>
          <div className="mt-4">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-40 w-40 rounded-full object-cover" />
            ) : (
              <span className="grid h-40 w-40 place-items-center rounded-full bg-lavender font-semibold text-violet">
                {name.trim() ? name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() : "A"}
              </span>
            )}
          </div>
          {viewing ? null : (
            <>
              <input id={photoInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} />
              <label htmlFor={photoInput} className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-control border border-line px-3 font-semibold text-violet">
                Choisir une photo
              </label>
              <p className="mt-2 text-muted">Formats : JPG, PNG, WebP. Taille max. : 2 Mo.</p>
            </>
          )}
          {photoError ? <p role="alert" className="mt-2 text-unavailable">{photoError}</p> : null}
        </article>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/catalogue/auteurs" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        {viewing ? (
          <Link to={`/catalogue/auteurs/${authorId}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
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
