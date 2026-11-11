import { useEffect, useId, useState } from "react"
import { ArrowLeft, CalendarDays, Check, Eye, ImagePlus, Pencil, Plus, Save, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getEvent, saveEvent } from "../api/content.js"
import { contentNotices } from "./texts.js"

const TYPES = [
  ["conference", "Conférence"],
  ["atelier", "Atelier"],
  ["rencontre", "Rencontre littéraire"],
  ["salon", "Salon"],
  ["exposition", "Exposition"],
  ["lecture", "Lecture"],
]
const MAX_IMAGE = 2 * 1024 * 1024
const fieldClass = "min-h-11 w-full rounded-control border border-line bg-white px-3"

function localStamp(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ""
  const pad = (part) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function emptyForm() {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return {
    title: "",
    summary: "",
    eventType: "conference",
    startsAt: localStamp(start.toISOString()),
    endsAt: localStamp(end.toISOString()),
    location: "",
    audience: "",
    capacity: "",
    registrationUrl: "",
    programme: "",
    image: "",
    state: "draft",
    speakers: [],
  }
}

export function EventFormPage({ mode }) {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const imageInput = useId()
  const viewing = mode === "view"
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState("")
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState("")
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(mode !== "create")
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (mode === "create") return undefined
    let alive = true
    getEvent(eventId).then((result) => {
      if (!alive) return
      if (!result.ok) {
        setMissing(true)
        setLoading(false)
        return
      }
      const item = result.data
      setForm({
        title: item.title,
        summary: item.summary,
        eventType: item.event_type,
        startsAt: localStamp(item.starts_at),
        endsAt: localStamp(item.ends_at),
        location: item.location,
        audience: item.audience || "",
        capacity: item.capacity ?? "",
        registrationUrl: item.registration_url || "",
        programme: item.programme || "",
        image: item.image,
        state: item.state,
        speakers: (item.speakers || []).map((speaker) => ({
          position: speaker.position,
          name: speaker.name,
          title: speaker.title || "",
          photo: speaker.photo || "",
          file: null,
        })),
      })
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [eventId, mode])

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

  function addSpeaker() {
    setForm((current) => {
      if (current.speakers.length >= 5) return current
      const used = new Set(current.speakers.map((speaker) => speaker.position))
      const position = [1, 2, 3, 4, 5].find((value) => !used.has(value))
      return { ...current, speakers: [...current.speakers, { position, name: "", title: "", photo: "", file: null }] }
    })
  }

  function updateSpeaker(position, patch) {
    setForm((current) => ({
      ...current,
      speakers: current.speakers.map((speaker) => (speaker.position === position ? { ...speaker, ...patch } : speaker)),
    }))
  }

  function removeSpeaker(position) {
    setForm((current) => ({ ...current, speakers: current.speakers.filter((speaker) => speaker.position !== position) }))
  }

  async function save(event, state) {
    event.preventDefault()
    const next = []
    if (!form.title.trim()) next.push("Le titre est obligatoire.")
    if (!form.summary.trim()) next.push("Le résumé est obligatoire.")
    if (!form.location.trim()) next.push("Le lieu est obligatoire.")
    if (!form.startsAt || !form.endsAt) next.push("Les dates sont obligatoires.")
    if (form.startsAt && form.endsAt && form.endsAt <= form.startsAt) next.push("La fin doit être après le début.")
    if (form.speakers.some((speaker) => !speaker.name.trim())) next.push("Chaque intervenant a un nom.")
    setProblems(next)
    if (next.length > 0) return
    const body = new FormData()
    body.set("title", form.title.trim())
    body.set("summary", form.summary.trim())
    body.set("event_type", form.eventType)
    body.set("starts_at", new Date(form.startsAt).toISOString())
    body.set("ends_at", new Date(form.endsAt).toISOString())
    body.set("location", form.location.trim())
    body.set("audience", form.audience.trim())
    body.set("capacity", String(form.capacity ?? ""))
    body.set("registration_url", form.registrationUrl.trim())
    body.set("programme", form.programme)
    body.set("state", form.state === "archived" ? "archived" : state)
    body.set("speakers", JSON.stringify(form.speakers.map((speaker) => ({
      name: speaker.name.trim(),
      title: speaker.title.trim(),
      position: speaker.position,
    }))))
    if (file) body.set("image", file)
    if (removeImage) body.set("remove_image", "true")
    for (const speaker of form.speakers) {
      if (speaker.file) body.set(`speaker_photo_${speaker.position}`, speaker.file)
    }
    const result = await saveEvent(mode === "create" ? null : eventId, body)
    if (!result.ok) {
      setProblems([result.error])
      return
    }
    navigate("/evenements")
  }

  if (loading) return <p>Chargement…</p>
  if (missing) {
    return (
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <p>Cet événement n'existe pas.</p>
        <Link to="/evenements" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">Retour à la liste</Link>
      </section>
    )
  }

  const shown = preview || (!removeImage && form.image)

  return (
    <form className="grid gap-4" onSubmit={(event) => (viewing ? event.preventDefault() : save(event, "published"))}>
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => <p key={problem}>{problem}</p>)}
        </div>
      ) : null}
      {form.state === "archived" ? <p className="rounded-panel border border-line bg-canvas p-4">{contentNotices.archivedStays}</p> : null}
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <CalendarDays aria-hidden="true" className="text-violet" size={24} />
          Informations de l'événement
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 sm:col-span-2">
            <span className="font-semibold text-heading">Titre *</span>
            <input className={fieldClass} value={form.title} onChange={(event) => set("title", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Type *</span>
            <select className={fieldClass} value={form.eventType} onChange={(event) => set("eventType", event.target.value)} disabled={viewing}>
              {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Lieu *</span>
            <input className={fieldClass} value={form.location} onChange={(event) => set("location", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Début *</span>
            <input className={fieldClass} type="datetime-local" value={form.startsAt} onChange={(event) => set("startsAt", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Fin *</span>
            <input className={fieldClass} type="datetime-local" value={form.endsAt} onChange={(event) => set("endsAt", event.target.value)} disabled={viewing} required />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Public</span>
            <input className={fieldClass} value={form.audience} onChange={(event) => set("audience", event.target.value)} disabled={viewing} />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Places</span>
            <input className={fieldClass} inputMode="numeric" value={form.capacity} onChange={(event) => set("capacity", event.target.value)} disabled={viewing} />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="font-semibold text-heading">Lien d'inscription</span>
            <input className={fieldClass} value={form.registrationUrl} onChange={(event) => set("registrationUrl", event.target.value)} disabled={viewing} placeholder="https://" />
          </label>
        </div>
        <p className="mt-2 text-muted">Les heures sont celles de Kinshasa. Seul un lien http ou https est conservé. À venir, en cours et passé se calculent tout seuls.</p>
        <label className="mt-4 grid gap-1">
          <span className="font-semibold text-heading">Résumé *</span>
          <textarea className="min-h-28 w-full rounded-control border border-line px-3 py-2" value={form.summary} onChange={(event) => set("summary", event.target.value)} disabled={viewing} required />
        </label>
        <label className="mt-4 grid gap-1">
          <span className="font-semibold text-heading">Programme</span>
          <textarea className="min-h-28 w-full rounded-control border border-line px-3 py-2" value={form.programme} onChange={(event) => set("programme", event.target.value)} disabled={viewing} placeholder="Un point par ligne" />
        </label>
      </article>
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-section text-heading">Intervenants</h2>
          {viewing || form.speakers.length >= 5 ? null : (
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet px-3 font-semibold text-violet" onClick={addSpeaker}>
              <Plus aria-hidden="true" size={18} />
              Ajouter
            </button>
          )}
        </div>
        <p className="mt-2 text-muted">De zéro à cinq personnes. La photo est facultative (JPG, PNG ou WebP, 2 Mo).</p>
        {form.speakers.length === 0 ? <p className="mt-4 text-muted">Aucun intervenant.</p> : null}
        <ul className="mt-4 grid gap-4">
          {form.speakers.map((speaker) => (
            <li key={speaker.position} className="grid gap-3 rounded-control border border-line p-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Nom *</span>
                <input className={fieldClass} value={speaker.name} disabled={viewing} onChange={(event) => updateSpeaker(speaker.position, { name: event.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Fonction</span>
                <input className={fieldClass} value={speaker.title} disabled={viewing} onChange={(event) => updateSpeaker(speaker.position, { title: event.target.value })} />
              </label>
              {viewing ? null : (
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <input className="max-w-full" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => updateSpeaker(speaker.position, { file: event.target.files?.[0] || null })} />
                  <button type="button" className="inline-flex min-h-11 items-center gap-2 font-semibold text-unavailable" onClick={() => removeSpeaker(speaker.position)}>
                    <Trash2 aria-hidden="true" size={18} />
                    Retirer
                  </button>
                </div>
              )}
              {speaker.photo ? <img src={speaker.photo} alt="" className="h-16 w-16 rounded-md object-cover" /> : null}
            </li>
          ))}
        </ul>
      </article>
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <ImagePlus aria-hidden="true" className="text-violet" size={22} />
          Image
        </h2>
        {shown ? <img src={shown} alt="" className="mt-4 h-40 w-full max-w-sm rounded-md object-cover" /> : <p className="mt-4 text-muted">Aucune image</p>}
        {viewing ? null : (
          <div className="mt-4 flex flex-wrap gap-2">
            <input id={imageInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} />
            <label htmlFor={imageInput} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet">Changer l'image</label>
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable" onClick={() => { setPreview(""); setFile(null); setRemoveImage(true) }}>Retirer</button>
          </div>
        )}
        {imageError ? <p role="alert" className="mt-2 text-unavailable">{imageError}</p> : null}
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/evenements" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {mode !== "create" ? (
            <Link to={viewing ? `/evenements/${eventId}/modifier` : `/evenements/${eventId}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-[#1d4ed8]">
              {viewing ? <Pencil aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
              {viewing ? "Modifier" : "Aperçu"}
            </Link>
          ) : null}
          {viewing ? null : (
            <>
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet bg-white px-4 font-semibold text-violet" onClick={(event) => save(event, "draft")}>
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
