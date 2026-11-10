import { useId, useState } from "react"
import { Bell, BookOpen, CalendarDays, Check, Database, Globe, ImagePlus, Info, Library, Mail, MapPin, Phone, RotateCcw, Settings, Shield, Wrench } from "lucide-react"
import { RichTextEditor } from "./RichTextEditor.jsx"

const TABS = [
  { id: "general", label: "Général", icon: Settings },
  { id: "library", label: "Bibliothèque", icon: Library },
  { id: "catalog", label: "Catalogue", icon: BookOpen },
  { id: "events", label: "Événements", icon: CalendarDays },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "backup", label: "Sauvegarde", icon: Database },
]

const ABOUT = "<p>La Bibliothèque Totanga informe le public : catalogue, annonces, publications et événements. Les ouvrages se consultent sur place.</p>"
const MAX_IMAGE = 2 * 1024 * 1024
const fieldClass = "w-full rounded-control border border-line bg-white px-3"

const INITIAL = {
  name: "Bibliothèque Totanga",
  slogan: "Centre de lecture, de savoir et de culture",
  address: "12, avenue des Exemples, Kinshasa",
  phone: "+243 800 000 000",
  email: "contact@exemple.totanga.test",
  website: "",
  about: ABOUT,
  language: "Français",
  theme: "Violet (Totanga)",
  darkMode: false,
  timezone: "(UTC+01:00) Kinshasa",
  dateFormat: "31 déc. 2026",
  timeFormat: "24 heures (14:30)",
  pageSize: "10",
  maintenance: false,
}

function Switch({ checked, label, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`relative h-8 w-14 shrink-0 rounded-full ${checked ? "bg-violet" : "bg-line"}`} onClick={onClick}>
      <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white ${checked ? "translate-x-6" : ""}`} />
    </button>
  )
}

function readImage(file, setError, setPreview) {
  if (!file) return
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) {
    setError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
    return
  }
  if (file.size > MAX_IMAGE) {
    setError("L'image ne doit pas dépasser 2 Mo.")
    return
  }
  setError("")
  setPreview((current) => {
    if (current.startsWith("blob:")) URL.revokeObjectURL(current)
    return URL.createObjectURL(file)
  })
}

export function SettingsPage() {
  const logoInput = useId()
  const iconInput = useId()
  const [tab, setTab] = useState("general")
  const [form, setForm] = useState(INITIAL)
  const [logo, setLogo] = useState("/images/logo.png")
  const [icon, setIcon] = useState("/images/logo.png")
  const [logoError, setLogoError] = useState("")
  const [iconError, setIconError] = useState("")
  const [notice, setNotice] = useState("")
  const [version, setVersion] = useState(0)

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setNotice("")
  }

  function reset() {
    setForm(INITIAL)
    setLogo("/images/logo.png")
    setIcon("/images/logo.png")
    setLogoError("")
    setIconError("")
    setNotice("")
    setVersion((current) => current + 1)
  }

  function save(event) {
    event.preventDefault()
    if (form.website && !/^https?:\/\//i.test(form.website.trim())) {
      setNotice("Le site web doit commencer par http:// ou https://.")
      return
    }
    if (!form.name.trim()) {
      setNotice("Le nom de la bibliothèque est obligatoire.")
      return
    }
    setNotice("L'affichage est mis à jour sur cet écran. Le site public garde les exemples fictifs.")
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button key={item.id} type="button" className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control px-4 font-semibold ${active ? "bg-violet text-white" : "bg-white text-violet"}`} onClick={() => setTab(item.id)}>
              <Icon aria-hidden="true" size={18} />
              {item.label}
            </button>
          )
        })}
      </div>
      {tab === "general" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="rounded-panel border border-line bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <Settings aria-hidden="true" className="text-violet" size={22} />
              Informations générales
            </h2>
            <p className="mt-1 text-muted">Paramètres de base de la plateforme.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Nom de la bibliothèque *</span>
                <input className={fieldClass} value={form.name} onChange={(event) => set("name", event.target.value)} required />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Slogan</span>
                <input className={fieldClass} value={form.slogan} onChange={(event) => set("slogan", event.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Adresse</span>
                <span className="relative">
                  <MapPin aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input className={`${fieldClass} pl-10`} value={form.address} onChange={(event) => set("address", event.target.value)} />
                </span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Téléphone</span>
                <span className="relative">
                  <Phone aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input className={`${fieldClass} pl-10`} value={form.phone} onChange={(event) => set("phone", event.target.value)} />
                </span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Email de contact</span>
                <span className="relative">
                  <Mail aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input className={`${fieldClass} pl-10`} type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
                </span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Site web (facultatif)</span>
                <span className="relative">
                  <Globe aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input className={`${fieldClass} pl-10`} value={form.website} onChange={(event) => set("website", event.target.value)} placeholder="https://" />
                </span>
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-semibold text-heading">Logo de la bibliothèque</p>
                <img src={logo} alt="Logo de la Bibliothèque Totanga" className="mt-2 h-16 w-auto rounded-control bg-white" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <input id={logoInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readImage(event.target.files?.[0], setLogoError, setLogo)} />
                  <label htmlFor={logoInput} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet">
                    <ImagePlus aria-hidden="true" size={18} />
                    Changer le logo
                  </label>
                  <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable" onClick={() => setLogo("/images/logo.png")}>
                    Supprimer
                  </button>
                </div>
                <p className="mt-2 text-muted">Formats : JPG, PNG, WebP. Taille max. : 2 Mo.</p>
                {logoError ? <p role="alert" className="mt-2 text-unavailable">{logoError}</p> : null}
              </div>
              <div>
                <p className="font-semibold text-heading">Favicon (icône du site)</p>
                <img src={icon} alt="" className="mt-2 h-16 w-16 rounded-control bg-violet-dark object-contain p-2" />
                <div className="mt-3">
                  <input id={iconInput} className="sr-only" type="file" accept="image/png,image/webp" onChange={(event) => readImage(event.target.files?.[0], setIconError, setIcon)} />
                  <label htmlFor={iconInput} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet">
                    <ImagePlus aria-hidden="true" size={18} />
                    Changer
                  </label>
                </div>
                <p className="mt-2 text-muted">Formats : PNG, WebP. Taille max. : 2 Mo.</p>
                {iconError ? <p role="alert" className="mt-2 text-unavailable">{iconError}</p> : null}
              </div>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-heading">À propos de la bibliothèque</p>
              <div className="mt-2">
                <RichTextEditor key={version} label="À propos de la bibliothèque" value={form.about} onChange={(about) => set("about", about)} />
              </div>
            </div>
          </article>
          <div className="grid content-start gap-4">
            <article className="rounded-panel border border-line bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-section text-heading">
                <Globe aria-hidden="true" className="text-violet" size={22} />
                Apparence et langue
              </h2>
              <label className="mt-4 grid gap-1">
                <span className="font-semibold text-heading">Langue par défaut</span>
                <select className={fieldClass} value={form.language} onChange={(event) => set("language", event.target.value)}>
                  <option>Français</option>
                </select>
              </label>
              <label className="mt-3 grid gap-1">
                <span className="font-semibold text-heading">Thème de l'interface</span>
                <select className={fieldClass} value={form.theme} onChange={(event) => set("theme", event.target.value)}>
                  <option>Violet (Totanga)</option>
                </select>
              </label>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="font-semibold text-heading">Mode clair / sombre</p>
                <Switch checked={form.darkMode} label="Mode clair ou sombre" onClick={() => set("darkMode", !form.darkMode)} />
              </div>
            </article>
            <article className="rounded-panel border border-line bg-white p-5 shadow-card">
              <h2 className="text-section text-heading">Paramètres de fonctionnement</h2>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Fuseau horaire</span>
                  <select className={fieldClass} value={form.timezone} onChange={(event) => set("timezone", event.target.value)}>
                    <option>(UTC+01:00) Kinshasa</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Format de date</span>
                  <select className={fieldClass} value={form.dateFormat} onChange={(event) => set("dateFormat", event.target.value)}>
                    <option>31 déc. 2026</option>
                    <option>31/12/2026</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Format d'heure</span>
                  <select className={fieldClass} value={form.timeFormat} onChange={(event) => set("timeFormat", event.target.value)}>
                    <option>24 heures (14:30)</option>
                    <option>12 heures (02:30 PM)</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Nombre d'éléments par page</span>
                  <select className={fieldClass} value={form.pageSize} onChange={(event) => set("pageSize", event.target.value)}>
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </label>
              </div>
            </article>
            <article className="rounded-panel border border-line bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-section text-heading">
                <Wrench aria-hidden="true" className="text-violet" size={22} />
                Maintenance
              </h2>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-heading">Mode maintenance</p>
                  <p className="text-muted">Désactiver temporairement l'accès au site public.</p>
                </div>
                <Switch checked={form.maintenance} label="Mode maintenance" onClick={() => set("maintenance", !form.maintenance)} />
              </div>
              <p className="mt-4 flex gap-2 rounded-control bg-[#e7eefc] p-3 text-[#1d4ed8]">
                <Info aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
                Le site public n'est pas coupé depuis cet écran. Le personnel reste connecté à l'administration.
              </p>
            </article>
          </div>
        </div>
      ) : (
        <article className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="text-section text-heading">{TABS.find((item) => item.id === tab)?.label}</h2>
          <p className="mt-2 text-muted">Ces réglages se préparent. Les informations générales restent dans l'onglet Général.</p>
        </article>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-violet" onClick={reset}>
          <RotateCcw aria-hidden="true" size={18} />
          Réinitialiser
        </button>
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
          <Check aria-hidden="true" size={18} />
          Enregistrer les paramètres
        </button>
      </div>
      {notice ? <p className={notice.startsWith("L'affichage") ? "text-muted" : "text-unavailable"} role={notice.startsWith("L'affichage") ? undefined : "alert"}>{notice}</p> : null}
    </form>
  )
}
