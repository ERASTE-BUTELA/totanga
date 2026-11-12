import { useEffect, useId, useRef, useState } from "react"
import { ArrowLeft, Check, Eye, ImagePlus, Info, Megaphone, Pencil, Save, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getAnnouncement, saveAnnouncement } from "../api/content.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase, saveAndGo } from "../lib/saveAndGo.js"
import { contentNotices } from "./texts.js"

const CATEGORIES = [
  ["informations", "Informations générales"],
  ["acquisitions", "Nouvelles acquisitions"],
  ["horaires", "Horaires et services"],
  ["maintenance", "Maintenance et travaux"],
]
const MAX_IMAGE = 2 * 1024 * 1024
const fieldClass = "min-h-11 w-full rounded-control border border-line bg-white px-3"

function localStamp(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ""
  const pad = (part) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const EMPTY = {
  title: "",
  category: "informations",
  important: false,
  publishedAt: localStamp(),
  displayUntil: "",
  body: "",
  image: "",
  state: "draft",
}

export function AnnouncementFormPage({ mode }) {
  const { announcementId } = useParams()
  const navigate = useNavigate()
  const imageInput = useId()
  const viewing = mode === "view"
  const publishIntent = useRef(false)
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState("")
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState("")
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(mode !== "create")
  const [missing, setMissing] = useState(false)
  const [phase, setPhase] = useState(null)
  const busy = busyPhase(phase)

  useEffect(() => {
    if (mode === "create") return undefined
    let alive = true
    getAnnouncement(announcementId).then((result) => {
      if (!alive) return
      if (!result.ok) {
        setMissing(true)
        setLoading(false)
        return
      }
      const item = result.data
      setForm({
        title: item.title,
        category: item.category,
        important: item.important,
        publishedAt: localStamp(item.published_at),
        displayUntil: item.display_until || "",
        body: item.body,
        image: item.image,
        state: item.state,
      })
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [announcementId, mode])

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function onImage(event) {
    const next = event.target.files?.[0]
    event.target.value = ""
    if (!next) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setImageError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
      return
    }
    if (next.size > MAX_IMAGE) {
      setImageError("L'image ne doit pas dépasser 2 Mo.")
      return
    }
    setImageError("")
    setFile(next)
    setRemoveImage(false)
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current)
      return URL.createObjectURL(next)
    })
  }

  async function save(event, state) {
    event.preventDefault()
    if (busy) return
    publishIntent.current = state === "published"
    const publishedAt = mode === "create" || !form.publishedAt ? localStamp() : form.publishedAt
    const next = []
    if (!form.title.trim()) next.push("Le titre est obligatoire.")
    if (!form.body.trim()) next.push("Le texte est obligatoire.")
    if (form.displayUntil && publishedAt && form.displayUntil < publishedAt.slice(0, 10)) {
      next.push("La fin d'affichage ne peut pas précéder le jour de publication.")
    }
    setProblems(next)
    if (next.length > 0) return
    setPhase("saving")
    const body = new FormData()
    body.set("title", form.title.trim())
    body.set("body", form.body.trim())
    body.set("category", form.category)
    body.set("important", form.important ? "true" : "false")
    body.set("published_at", new Date(publishedAt).toISOString())
    body.set("effective_on", "")
    body.set("display_until", form.displayUntil)
    body.set("state", form.state === "archived" ? "archived" : state)
    if (file) body.set("image", file)
    if (removeImage) body.set("remove_image", "true")
    const result = await saveAnnouncement(mode === "create" ? null : announcementId, body)
    if (!result.ok) {
      setPhase(null)
      setProblems([result.error])
      return
    }
    await saveAndGo({
      setPhase,
      navigate,
      to: "/annonces",
      notice: state === "draft" ? "L'annonce est enregistrée en brouillon." : "L'annonce a été publiée.",
    })
  }

  const overlayLabel =
    phase === "done"
      ? publishIntent.current
        ? "Annonce publiée"
        : "Brouillon enregistré"
      : publishIntent.current
        ? "Publication…"
        : "Enregistrement…"

  if (loading) return <p>Chargement…</p>
  if (missing) {
    return (
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <p>Cette annonce n'existe pas.</p>
        <Link to="/annonces" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">Retour à la liste</Link>
      </section>
    )
  }

  const shown = preview || (!removeImage && form.image)

  return (
    <form className="grid gap-4" onSubmit={(event) => (viewing ? event.preventDefault() : save(event, "published"))}>
      {phase ? <FormSaveOverlay phase={phase} label={overlayLabel} /> : null}
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => <p key={problem}>{problem}</p>)}
        </div>
      ) : null}
      {form.state === "archived" ? (
        <p className="rounded-panel border border-line bg-canvas p-4">{contentNotices.archivedStays}</p>
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
              <span className="font-semibold text-heading">Catégorie *</span>
              <select className={fieldClass} value={form.category} onChange={(event) => set("category", event.target.value)} disabled={viewing}>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Fin d'affichage</span>
              <input className={fieldClass} type="date" value={form.displayUntil} onChange={(event) => set("displayUntil", event.target.value)} disabled={viewing} />
            </label>
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={form.important} onChange={(event) => set("important", event.target.checked)} disabled={viewing} />
            <span className="font-semibold text-heading">Important</span>
          </label>
          <p className="mt-2 text-muted">La date de publication est enregistrée automatiquement. La fin d'affichage, si elle est indiquée, est le dernier jour visible.</p>
          <label className="mt-4 grid gap-1">
            <span className="font-semibold text-heading">Texte *</span>
            <textarea className="min-h-56 w-full rounded-control border border-line px-3 py-2" value={form.body} onChange={(event) => set("body", event.target.value)} disabled={viewing} required />
          </label>
        </article>
        <div className="grid content-start gap-4">
          <article className="rounded-panel border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <ImagePlus aria-hidden="true" className="text-violet" size={22} />
              Image de l'annonce
            </h2>
            {shown ? (
              <img src={shown} alt="" className="mt-4 h-40 w-full rounded-md object-cover" />
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
                <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable" onClick={() => { setPreview(""); setFile(null); setRemoveImage(true) }}>
                  <Trash2 aria-hidden="true" size={18} />
                  Retirer
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
              <li>Cochez Important seulement si l'annonce doit passer devant les autres.</li>
              <li>La fin d'affichage est facultative.</li>
              <li>Une annonce ne se supprime pas : elle s'archive.</li>
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
          {mode !== "create" ? (
            <Link to={viewing ? `/annonces/${announcementId}/modifier` : `/annonces/${announcementId}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-[#1d4ed8]">
              {viewing ? <Pencil aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
              {viewing ? "Modifier" : "Aperçu"}
            </Link>
          ) : null}
          {viewing ? null : (
            <>
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet bg-white px-4 font-semibold text-violet" disabled={busy} onClick={(event) => save(event, "draft")}>
                <Save aria-hidden="true" size={18} />
                {busy ? "Enregistrement…" : "Enregistrer en brouillon"}
              </button>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white" disabled={busy}>
                <Check aria-hidden="true" size={18} />
                {busy ? "Publication…" : "Publier"}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
