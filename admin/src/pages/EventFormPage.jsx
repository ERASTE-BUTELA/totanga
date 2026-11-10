import { useId, useState } from "react"
import { ArrowLeft, CalendarDays, Check, Eye, ImagePlus, Pencil, Save, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { readEvent, saveEvent } from "./contentStore.js"

const TYPES = ["Atelier", "Conférence", "Salon", "Animation", "Formation", "Club", "Exposition"]
const STATUSES = ["À venir", "En cours", "Passé"]
const MAX_IMAGE = 2 * 1024 * 1024
const fieldClass = "w-full rounded-control border border-line bg-white px-3"

const EMPTY = {
  title: "",
  summary: "",
  type: "Atelier",
  starts: "",
  ends: "",
  startTime: "",
  endTime: "",
  place: "",
  organizer: "",
  registered: "",
  capacity: "",
  status: "À venir",
  image: "",
}

export function EventFormPage({ mode }) {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const imageInput = useId()
  const existing = mode === "create" ? null : readEvent(eventId)
  const viewing = mode === "view"
  const [form, setForm] = useState(existing ? {
    ...existing,
    registered: existing.registered ?? "",
    capacity: existing.capacity ?? "",
  } : EMPTY)
  const [preview, setPreview] = useState("")
  const [imageError, setImageError] = useState("")
  const [problems, setProblems] = useState([])

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

  function numberOrNull(value) {
    if (value === "" || value == null) return null
    return Number(value)
  }

  function save(event) {
    event.preventDefault()
    const next = []
    if (!form.title.trim()) next.push("Le titre est obligatoire.")
    if (!form.starts || !form.ends) next.push("Les dates sont obligatoires.")
    if (form.starts && form.ends && form.ends < form.starts) next.push("La fin ne peut pas précéder le début.")
    if (!form.place.trim()) next.push("Le lieu est obligatoire.")
    if (!form.organizer.trim()) next.push("L'organisateur est obligatoire.")
    setProblems(next)
    if (next.length > 0) return
    saveEvent({
      ...form,
      id: existing?.id,
      order: existing?.order ?? 0,
      title: form.title.trim(),
      summary: form.summary.trim(),
      place: form.place.trim(),
      organizer: form.organizer.trim(),
      registered: numberOrNull(form.registered),
      capacity: numberOrNull(form.capacity),
    })
    navigate("/evenements")
  }

  if (!existing && mode !== "create") {
    return (
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <p>Cet événement n'existe pas.</p>
        <Link to="/evenements" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">Retour à la liste</Link>
      </section>
    )
  }

  return (
    <form className="grid max-w-3xl gap-4" onSubmit={(event) => (viewing ? event.preventDefault() : save(event))}>
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => <p key={problem}>{problem}</p>)}
        </div>
      ) : null}
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <CalendarDays aria-hidden="true" className="text-violet" size={24} />
          Informations de l'événement
        </h2>
        <label className="mt-4 grid gap-1">
          <span className="font-semibold text-heading">Titre *</span>
          <input className={fieldClass} value={form.title} onChange={(event) => set("title", event.target.value)} disabled={viewing} required />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="font-semibold text-heading">Résumé</span>
          <input className={fieldClass} value={form.summary} onChange={(event) => set("summary", event.target.value)} disabled={viewing} />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Type *</span>
            <select className={fieldClass} value={form.type} onChange={(event) => set("type", event.target.value)} disabled={viewing}>
              {TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Statut *</span>
            <select className={fieldClass} value={form.status} onChange={(event) => set("status", event.target.value)} disabled={viewing}>
              {STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Date de début *</span>
            <input className={fieldClass} type="date" value={form.starts} onChange={(event) => set("starts", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Date de fin *</span>
            <input className={fieldClass} type="date" value={form.ends} onChange={(event) => set("ends", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Heure de début</span>
            <input className={fieldClass} type="time" value={form.startTime} onChange={(event) => set("startTime", event.target.value)} disabled={viewing} />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Heure de fin</span>
            <input className={fieldClass} type="time" value={form.endTime} onChange={(event) => set("endTime", event.target.value)} disabled={viewing} />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Lieu *</span>
            <input className={fieldClass} value={form.place} onChange={(event) => set("place", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Organisateur *</span>
            <input className={fieldClass} value={form.organizer} onChange={(event) => set("organizer", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Inscrits</span>
            <input className={fieldClass} type="number" min="0" value={form.registered} onChange={(event) => set("registered", event.target.value)} disabled={viewing} />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Places</span>
            <input className={fieldClass} type="number" min="0" value={form.capacity} onChange={(event) => set("capacity", event.target.value)} disabled={viewing} />
          </label>
        </div>
        <div className="mt-4">
          <p className="font-semibold text-heading">Image</p>
          {preview || form.image ? (
            <img src={preview || form.image} alt="" className="mt-2 h-40 w-full rounded-md object-cover" />
          ) : (
            <div className="mt-2 flex h-40 items-center justify-center rounded-md bg-canvas text-muted">Aucune image</div>
          )}
          {viewing ? null : (
            <div className="mt-3 flex flex-wrap gap-2">
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
          <p className="mt-2 text-muted">Formats : JPG, PNG, WebP. Taille max. : 2 Mo.</p>
          {imageError ? <p role="alert" className="mt-2 text-unavailable">{imageError}</p> : null}
        </div>
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/evenements" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {existing ? (
            <Link to={`/evenements/${existing.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-[#1d4ed8]">
              <Eye aria-hidden="true" size={18} />
              Aperçu
            </Link>
          ) : null}
          {viewing ? (
            <Link to={`/evenements/${existing.id}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
              <Pencil aria-hidden="true" size={18} />
              Modifier
            </Link>
          ) : (
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
              {mode === "create" ? <Check aria-hidden="true" size={18} /> : <Save aria-hidden="true" size={18} />}
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
