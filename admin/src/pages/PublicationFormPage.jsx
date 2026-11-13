import { useEffect, useId, useState } from "react"
import { ArrowLeft, BookOpen, Check, Eye, FileText, ImagePlus, Info, Pencil, Pin, Save, Star, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { getPublication, savePublication } from "../api/content.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase, saveAndGo } from "../lib/saveAndGo.js"
import { RichTextEditor } from "./RichTextEditor.jsx"
import { richTextIsEmpty, sanitizeRichText } from "./richText.js"

const CATEGORIES = ["Culture", "Actualité", "Conseils", "Événement", "Technologie"]
const DEFAULT_AUTHOR = "Équipe Totanga"
const MAX_IMAGE = 5 * 1024 * 1024
const MAX_EXCERPT = 250
const fieldClass = "w-full rounded-control border border-line bg-panel px-3"

const EMPTY = {
  id: null,
  title: "",
  category: "Culture",
  author: DEFAULT_AUTHOR,
  status: "Brouillon",
  featured: false,
  pinned: false,
  publishedAt: "",
  content: "",
  excerpt: "",
  image: "",
}

function Switch({ checked, label, disabled, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`relative h-8 w-14 shrink-0 rounded-full ${checked ? "bg-violet" : "bg-line"}`} onClick={onClick}>
      <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-panel ${checked ? "translate-x-6" : ""}`} />
    </button>
  )
}

function fromApi(item) {
  return {
    id: item.id,
    title: item.title || "",
    category: item.category || "Culture",
    author: item.author || DEFAULT_AUTHOR,
    status: item.status || "Brouillon",
    featured: Boolean(item.featured),
    pinned: Boolean(item.pinned),
    publishedAt: item.publishedAt || "",
    content: item.content || "",
    excerpt: item.excerpt || "",
    image: item.image || "",
  }
}

export function PublicationFormPage({ mode }) {
  const { publicationId } = useParams()
  const navigate = useNavigate()
  const imageInput = useId()
  const viewing = mode === "view"
  const [form, setForm] = useState(EMPTY)
  const [ready, setReady] = useState(mode === "create")
  const [missing, setMissing] = useState(false)
  const [preview, setPreview] = useState("")
  const [file, setFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState("")
  const [phase, setPhase] = useState(null)
  const busy = busyPhase(phase)
  const [problems, setProblems] = useState([])

  useEffect(() => {
    if (mode === "create") return undefined
    let gone = false
    getPublication(publicationId).then((result) => {
      if (gone) return
      if (!result.ok || !result.data) {
        setMissing(true)
        setReady(true)
        return
      }
      setForm(fromApi(result.data))
      setReady(true)
    })
    return () => {
      gone = true
    }
  }, [mode, publicationId])

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

  async function save(event, status) {
    event.preventDefault()
    if (busy) return
    const content = sanitizeRichText(form.content)
    const next = []
    if (!form.title.trim()) next.push("Le titre est obligatoire.")
    if (!form.publishedAt) next.push("La date de publication est obligatoire.")
    if (richTextIsEmpty(content)) next.push("Le contenu est obligatoire.")
    if (!form.excerpt.trim()) next.push("Le résumé est obligatoire.")
    if (form.excerpt.trim().length > MAX_EXCERPT) next.push("Le résumé ne dépasse pas 250 caractères.")
    setProblems(next)
    if (next.length > 0) return
    setPhase("saving")
    const body = new FormData()
    body.set("title", form.title.trim())
    body.set("category", form.category)
    body.set("author", form.author.trim() || DEFAULT_AUTHOR)
    body.set("excerpt", form.excerpt.trim())
    body.set("content", content)
    body.set("published_at", new Date(form.publishedAt).toISOString())
    body.set("state", status === "Brouillon" ? "draft" : "published")
    body.set("featured", form.featured ? "true" : "false")
    body.set("pinned", form.pinned ? "true" : "false")
    if (file) body.set("image", file)
    if (removeImage) body.set("remove_image", "true")
    const result = await savePublication(mode === "create" ? null : publicationId, body)
    if (!result.ok) {
      setPhase(null)
      setProblems([result.error])
      return
    }
    await saveAndGo({
      setPhase,
      navigate,
      to: "/publications",
      notice: status === "Brouillon" ? "La publication est enregistrée en brouillon." : "La publication a été publiée.",
    })
  }

  if (!ready) return <p>Chargement…</p>
  if (missing) {
    return (
      <section className="rounded-panel border border-line bg-panel p-6 shadow-card">
        <p>Cette publication n'existe pas.</p>
        <Link to="/publications" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">Retour à la liste</Link>
      </section>
    )
  }

  const shown = preview || (!removeImage && form.image)

  return (
    <form className="grid gap-4 pb-28" onSubmit={(event) => (viewing ? event.preventDefault() : save(event, "Publié"))}>
      {phase ? <FormSaveOverlay phase={phase} /> : null}
      {problems.length > 0 ? (
        <div role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
          {problems.map((problem) => <p key={problem}>{problem}</p>)}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-4">
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <FileText aria-hidden="true" className="text-violet" size={24} />
              Informations de la publication
            </h2>
            <label className="mt-4 grid gap-1">
              <span className="font-semibold text-heading">Titre *</span>
              <input className={fieldClass} value={form.title} onChange={(event) => set("title", event.target.value)} disabled={viewing} required />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Catégorie *</span>
                <span className="relative">
                  <BookOpen aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <select className={`${fieldClass} pl-10`} value={form.category} onChange={(event) => set("category", event.target.value)} disabled={viewing}>
                    {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Date de publication *</span>
                <input className={fieldClass} type="datetime-local" value={form.publishedAt} onChange={(event) => set("publishedAt", event.target.value)} disabled={viewing} required />
              </label>
            </div>
          </article>
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="text-section text-heading">Contenu de la publication *</h2>
            <div className="mt-3">
              <RichTextEditor value={form.content} onChange={(content) => set("content", content)} disabled={viewing} />
            </div>
            <label className="mt-4 grid gap-1">
              <span className="font-semibold text-heading">Résumé (extrait) *</span>
              <textarea
                className="min-h-24 w-full rounded-control border border-line px-3 py-2"
                maxLength={MAX_EXCERPT}
                value={form.excerpt}
                onChange={(event) => set("excerpt", event.target.value)}
                disabled={viewing}
                required
              />
              <span className="text-right text-muted">{form.excerpt.length} / {MAX_EXCERPT} caractères</span>
            </label>
          </article>
        </div>
        <div className="grid content-start gap-4">
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <ImagePlus aria-hidden="true" className="text-violet" size={22} />
              Image de la publication
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
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable"
                  onClick={() => {
                    setPreview("")
                    setFile(null)
                    setRemoveImage(true)
                    set("image", "")
                  }}
                >
                  <Trash2 aria-hidden="true" size={18} />
                  Supprimer
                </button>
              </div>
            )}
            <p className="mt-3 text-muted">Formats : JPG, PNG, WebP. Taille max. : 5 Mo. Dimension recommandée : 1200 × 630 px.</p>
            {imageError ? <p role="alert" className="mt-2 text-unavailable">{imageError}</p> : null}
          </article>
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="text-section text-heading">Options de publication</h2>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <Star aria-hidden="true" className="mt-1 text-gold" size={18} />
                <div>
                  <p className="font-semibold text-heading">Mettre à la une</p>
                  <p className="text-muted">Afficher cette publication en priorité sur la page d'accueil.</p>
                </div>
              </div>
              <Switch checked={form.featured} label="Mettre à la une" disabled={viewing} onClick={() => set("featured", !form.featured)} />
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <Pin aria-hidden="true" className="mt-1 text-violet" size={18} />
                <div>
                  <p className="font-semibold text-heading">Épingler la publication</p>
                  <p className="text-muted">La garder en haut de la liste.</p>
                </div>
              </div>
              <Switch checked={form.pinned} label="Épingler la publication" disabled={viewing} onClick={() => set("pinned", !form.pinned)} />
            </div>
          </article>
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <Info aria-hidden="true" className="text-violet" size={22} />
              Conseils de rédaction
            </h2>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-muted">
              <li>Choisissez un titre clair et accrocheur.</li>
              <li>Rédigez un résumé concis et pertinent.</li>
              <li>Utilisez une image de bonne qualité et libre de droits.</li>
              <li>Structurez votre contenu (paragraphes, listes, citations).</li>
              <li>La suppression depuis la liste efface définitivement la publication.</li>
            </ul>
          </article>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel px-4 py-3 shadow-card lg:left-[17.5rem]">
        <Link to="/publications" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {form.id ? (
            <Link to={`/publications/${form.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-info">
              <Eye aria-hidden="true" size={18} />
              Aperçu
            </Link>
          ) : null}
          {viewing ? (
            <Link to={`/publications/${form.id}/modifier`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary">
              <Pencil aria-hidden="true" size={18} />
              Modifier
            </Link>
          ) : (
            <>
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet bg-panel px-4 font-semibold text-violet" disabled={busy} onClick={(event) => save(event, "Brouillon")}>
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
