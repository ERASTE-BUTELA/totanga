import { useId, useState } from "react"
import { ArrowLeft, Check, Eye, ImagePlus, Info, Megaphone, Pencil, Save, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { readAnnouncement, saveAnnouncement } from "./contentStore.js"

const TYPES = ["Horaires", "Nouveauté", "Important", "Information", "Règlement", "Appel à contribution", "Événement", "Sondage"]
const CATEGORIES = ["Vie de la bibliothèque", "Catalogue", "Information générale", "Services", "Accès et services", "Partenariat", "Animation culturelle", "Amélioration des services", "Services numériques", "Événements externes"]
const STATUSES = ["Publié", "Brouillon", "Archivé"]
const MAX_IMAGE = 2 * 1024 * 1024
const fieldClass = "w-full rounded-control border border-line bg-white px-3"

const EMPTY = {
  title: "",
  type: "Horaires",
  category: "Vie de la bibliothèque",
  starts: "",
  ends: "",
  pinned: false,
  status: "Brouillon",
  content: "",
}

export function AnnouncementFormPage({ mode }) {
  const { announcementId } = useParams()
  const navigate = useNavigate()
  const imageInput = useId()
  const existing = mode === "create" ? null : readAnnouncement(announcementId)
  const viewing = mode === "view"
  const [form, setForm] = useState(existing || EMPTY)
  const [preview, setPreview] = useState("")
  const [imageError, setImageError] = useState("")
  const [problems, setProblems] = useState(existing || mode === "create" ? [] : ["Cette annonce n'existe pas."])

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function onImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
      return
    }
    if (file.size > MAX_IMAGE) {
      setImageError("L'image ne doit pas dépasser 2 Mo.")
      return
    }
    setImageError("")
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  function save(event, status) {
    event.preventDefault()
    const next = []
    if (!form.title.trim()) next.push("Le titre est obligatoire.")
    if (!form.starts || !form.ends) next.push("Les dates d'affichage sont obligatoires.")
    if (form.starts && form.ends && form.ends < form.starts) next.push("La fin d'affichage ne peut pas précéder le début.")
    if (!form.content.trim()) next.push("Le contenu est obligatoire.")
    setProblems(next)
    if (next.length > 0) return
    const id = saveAnnouncement({ ...form, id: existing?.id, status, title: form.title.trim(), content: form.content.trim() })
    navigate("/annonces")
    return id
  }

  if (!existing && mode !== "create") {
    return (
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <p>Cette annonce n'existe pas.</p>
        <Link to="/annonces" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">Retour à la liste</Link>
      </section>
    )
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => (viewing ? event.preventDefault() : save(event, "Publié"))}>
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => <p key={problem}>{problem}</p>)}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Megaphone aria-hidden="true" className="text-violet" size={24} />
            Informations de l'annonce
          </h2>
          <label className="mt-4 grid gap-1">
            <span className="font-semibold text-heading">Titre *</span>
            <input className={fieldClass} value={form.title} onChange={(event) => set("title", event.target.value)} disabled={viewing} required />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Type *</span>
              <select className={fieldClass} value={form.type} onChange={(event) => set("type", event.target.value)} disabled={viewing}>
                {TYPES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Catégorie *</span>
              <select className={fieldClass} value={form.category} onChange={(event) => set("category", event.target.value)} disabled={viewing}>
                {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Date de début d'affichage *</span>
              <input className={fieldClass} type="date" value={form.starts} onChange={(event) => set("starts", event.target.value)} disabled={viewing} required />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Date de fin d'affichage *</span>
              <input className={fieldClass} type="date" value={form.ends} onChange={(event) => set("ends", event.target.value)} disabled={viewing} required />
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">Épingler cette annonce</p>
                <p className="text-muted">L'annonce sera mise en évidence en haut de la liste.</p>
              </div>
              <button type="button" role="switch" aria-checked={form.pinned} aria-label="Épingler cette annonce" disabled={viewing} className={`relative h-8 w-14 shrink-0 rounded-full ${form.pinned ? "bg-violet" : "bg-line"}`} onClick={() => set("pinned", !form.pinned)}>
                <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white ${form.pinned ? "translate-x-6" : ""}`} />
              </button>
            </div>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Statut *</span>
              <select className={fieldClass} value={form.status} onChange={(event) => set("status", event.target.value)} disabled={viewing}>
                {STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-4 grid gap-1">
            <span className="font-semibold text-heading">Contenu de l'annonce *</span>
            <textarea className="min-h-56 w-full rounded-control border border-line px-3 py-2" value={form.content} onChange={(event) => set("content", event.target.value)} disabled={viewing} required />
          </label>
        </article>
        <div className="grid content-start gap-4">
          <article className="rounded-panel border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <ImagePlus aria-hidden="true" className="text-violet" size={22} />
              Image de l'annonce
            </h2>
            {preview || form.image ? (
              <img src={preview || form.image} alt="" className="mt-4 h-40 w-full rounded-md object-cover" />
            ) : (
              <div className="mt-4 flex h-40 items-center justify-center rounded-md bg-canvas text-muted">Aucune image</div>
            )}
            {viewing ? null : (
              <div className="mt-4 flex flex-wrap gap-2">
                <input id={imageInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} />
                <label htmlFor={imageInput} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet">
                  <ImagePlus aria-hidden="true" size={18} />
                  Changer l'image
                </label>
                <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable" onClick={() => { setPreview(""); set("image", "") }}>
                  <Trash2 aria-hidden="true" size={18} />
                  Supprimer
                </button>
              </div>
            )}
            <p className="mt-3 text-muted">Formats : JPG, PNG, WebP. Taille max. : 2 Mo.</p>
            {imageError ? <p role="alert" className="mt-2 text-unavailable">{imageError}</p> : null}
          </article>
          <article className="rounded-panel border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <Info aria-hidden="true" className="text-violet" size={22} />
              Conseils
            </h2>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-muted">
              <li>Choisissez un titre clair et concis.</li>
              <li>Utilisez une image en lien avec l'annonce.</li>
              <li>Définissez une période d'affichage cohérente.</li>
              <li>Épinglez l'annonce si elle est prioritaire.</li>
            </ul>
          </article>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/annonces" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {existing ? (
            <Link to={`/annonces/${existing.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-[#1d4ed8]">
              <Eye aria-hidden="true" size={18} />
              Aperçu
            </Link>
          ) : null}
          {viewing ? (
            <Link to={`/annonces/${existing.id}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
              <Pencil aria-hidden="true" size={18} />
              Modifier
            </Link>
          ) : (
            <>
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet bg-white px-4 font-semibold text-violet" onClick={(event) => save(event, "Brouillon")}>
                <Save aria-hidden="true" size={18} />
                Enregistrer en brouillon
              </button>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
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
