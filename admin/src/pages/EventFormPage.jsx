import { useEffect, useId, useRef, useState } from "react"
import { ArrowLeft, CalendarDays, Check, Eye, ImagePlus, Pencil, Save } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getEvent, saveEvent } from "../api/content.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase, saveAndGo } from "../lib/saveAndGo.js"
import { contentNotices } from "./texts.js"

const TYPES = [
  ["conference", "Conférence"],
  ["atelier", "Atelier"],
  ["rencontre", "Rencontre littéraire"],
  ["salon", "Salon"],
  ["exposition", "Exposition"],
  ["lecture", "Lecture"],
]
const MAX_IMAGE = 5 * 1024 * 1024
const fieldClass = "min-h-11 w-full rounded-control border border-line bg-panel px-3"

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
    registrationUrl: "",
    image: "",
    state: "draft",
    speakers: [],
    audience: "",
    capacity: "",
    programme: "",
  }
}

export function EventFormPage({ mode }) {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const imageInput = useId()
  const viewing = mode === "view"
  const publishIntent = useRef(false)
  const [form, setForm] = useState(emptyForm)
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
        registrationUrl: item.registration_url || "",
        image: item.image,
        state: item.state,
        audience: item.audience || "",
        capacity: item.capacity ?? "",
        programme: item.programme || "",
        speakers: (item.speakers || []).map((speaker) => ({
          position: speaker.position,
          name: speaker.name,
          title: speaker.title || "",
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
      setImageError("L'image ne doit pas dépasser 5 Mo.")
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
    const next = []
    if (!form.title.trim()) next.push("Le titre est obligatoire.")
    if (!form.summary.trim()) next.push("Le résumé est obligatoire.")
    if (!form.location.trim()) next.push("Le lieu est obligatoire.")
    if (!form.startsAt || !form.endsAt) next.push("Les dates sont obligatoires.")
    if (form.startsAt && form.endsAt && form.endsAt <= form.startsAt) next.push("La fin doit être après le début.")
    setProblems(next)
    if (next.length > 0) return
    setPhase("saving")
    const body = new FormData()
    body.set("title", form.title.trim())
    body.set("summary", form.summary.trim())
    body.set("event_type", form.eventType)
    body.set("starts_at", new Date(form.startsAt).toISOString())
    body.set("ends_at", new Date(form.endsAt).toISOString())
    body.set("location", form.location.trim())
    body.set("audience", form.audience || "")
    body.set("capacity", String(form.capacity ?? ""))
    body.set("registration_url", form.registrationUrl.trim())
    body.set("programme", form.programme || "")
    body.set(
      "speakers",
      JSON.stringify(
        (form.speakers || []).map((speaker) => ({
          name: speaker.name,
          title: speaker.title || "",
          position: speaker.position,
        })),
      ),
    )
    body.set("state", form.state === "archived" ? "archived" : state)
    if (file) body.set("image", file)
    if (removeImage) body.set("remove_image", "true")
    const result = await saveEvent(mode === "create" ? null : eventId, body)
    if (!result.ok) {
      setPhase(null)
      setProblems([result.error])
      return
    }
    await saveAndGo({
      setPhase,
      navigate,
      to: "/evenements",
      notice: state === "draft" ? "L'événement est enregistré en brouillon." : "L'événement a été publié.",
    })
  }

  if (loading) return <p>Chargement…</p>
  if (missing) {
    return (
      <section className="rounded-panel border border-line bg-panel p-6 shadow-card">
        <p>Cet événement n'existe pas.</p>
        <Link to="/evenements" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">
          Retour à la liste
        </Link>
      </section>
    )
  }

  const shown = preview || (!removeImage && form.image)
  const overlayLabel =
    phase === "done"
      ? publishIntent.current
        ? "Événement publié"
        : "Brouillon enregistré"
      : publishIntent.current
        ? "Publication…"
        : "Enregistrement…"

  return (
    <form className="grid gap-4" onSubmit={(event) => (viewing ? event.preventDefault() : save(event, "published"))}>
      {phase ? <FormSaveOverlay phase={phase} label={overlayLabel} /> : null}
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      ) : null}
      {form.state === "archived" ? <p className="rounded-panel border border-line bg-canvas p-4">{contentNotices.archivedStays}</p> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
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
                {TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
            <label className="grid gap-1 sm:col-span-2">
              <span className="font-semibold text-heading">Lien d'inscription</span>
              <input className={fieldClass} value={form.registrationUrl} onChange={(event) => set("registrationUrl", event.target.value)} disabled={viewing} placeholder="https://" />
            </label>
          </div>
          <p className="mt-2 text-muted">Les heures sont celles de Kinshasa. À venir, en cours et passé se calculent automatiquement.</p>
          <label className="mt-4 grid gap-1">
            <span className="font-semibold text-heading">Résumé *</span>
            <textarea className="min-h-28 w-full rounded-control border border-line px-3 py-2" value={form.summary} onChange={(event) => set("summary", event.target.value)} disabled={viewing} required />
          </label>
        </article>
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <ImagePlus aria-hidden="true" className="text-violet" size={22} />
            Image
          </h2>
          {shown ? (
            <img src={shown} alt="" className="mt-4 h-40 w-full rounded-md object-cover" />
          ) : (
            <p className="mt-4 rounded-md bg-canvas px-3 py-10 text-center text-muted">Aucune image</p>
          )}
          {viewing ? null : (
            <div className="mt-4 flex flex-wrap gap-2">
              <input id={imageInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} />
              <label htmlFor={imageInput} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet">
                Changer l'image
              </label>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable"
                onClick={() => {
                  setPreview("")
                  setFile(null)
                  setRemoveImage(true)
                }}
              >
                Retirer
              </button>
            </div>
          )}
          <p className="mt-3 text-muted">Formats : JPG, PNG, WebP. 5 Mo maximum.</p>
          {imageError ? (
            <p role="alert" className="mt-2 text-unavailable">
              {imageError}
            </p>
          ) : null}
        </article>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/evenements" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {mode !== "create" ? (
            <Link
              to={viewing ? `/evenements/${eventId}/modifier` : `/evenements/${eventId}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-info"
            >
              {viewing ? <Pencil aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
              {viewing ? "Modifier" : "Aperçu"}
            </Link>
          ) : null}
          {viewing ? null : (
            <>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet bg-panel px-4 font-semibold text-violet"
                disabled={busy}
                onClick={(event) => save(event, "draft")}
              >
                <Save aria-hidden="true" size={18} />
                {busy ? "Enregistrement…" : "Enregistrer en brouillon"}
              </button>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary" disabled={busy}>
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
