import { useEffect, useId, useState } from "react"
import { Bell, BookOpen, CalendarDays, Check, Database, Globe, ImagePlus, Library, Mail, MapPin, Pencil, Phone, Settings, Shield, X } from "lucide-react"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { setSiteFavicon } from "../lib/favicon.js"
import { mapsEmbedSrc, parseMapsCoords } from "../lib/maps.js"
import { busyPhase } from "../lib/saveAndGo.js"
import { getLibrarySettings, mapLibrarySettings, saveLibrarySettings } from "../api/settings.js"
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

const MAX_IMAGE = 5 * 1024 * 1024
const fieldClass = "w-full rounded-control border border-line bg-panel px-3 disabled:cursor-default disabled:bg-canvas disabled:text-heading"
const DEFAULT_LOGO = "/images/logo.png"

const EMPTY = {
  name: "",
  slogan: "",
  address: "",
  city: "Kinshasa",
  phone: "",
  email: "",
  facebookUrl: "",
  whatsappUrl: "",
  mapsUrl: "",
  latitude: "",
  longitude: "",
  about: "",
  language: "Français",
  theme: "Violet (Totanga)",
  darkMode: false,
  timezone: "(UTC+01:00) Kinshasa",
  dateFormat: "31 déc. 2026",
  timeFormat: "24 heures (14:30)",
  pageSize: "10",
}

function Switch({ checked, label, onClick, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`relative h-8 w-14 shrink-0 rounded-full disabled:cursor-default disabled:opacity-70 ${checked ? "bg-violet" : "bg-line"}`}
      onClick={onClick}
    >
      <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-panel ${checked ? "translate-x-6" : ""}`} />
    </button>
  )
}

function readImage(file, setError, setPreview, setFile) {
  if (!file) return
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) {
    setError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
    return
  }
  if (file.size > MAX_IMAGE) {
    setError("L'image ne doit pas dépasser 5 Mo.")
    return
  }
  setError("")
  setFile(file)
  setPreview((current) => {
    if (current.startsWith("blob:")) URL.revokeObjectURL(current)
    return URL.createObjectURL(file)
  })
}

function applyMapped(mapped, setters) {
  const { setForm, setLogo, setLogoFile, setClearLogo, setLogoError, setVersion } = setters
  setForm({
    name: mapped.name,
    slogan: mapped.slogan,
    address: mapped.address,
    city: mapped.city,
    phone: mapped.phone,
    email: mapped.email,
    facebookUrl: mapped.facebookUrl,
    whatsappUrl: mapped.whatsappUrl,
    mapsUrl: mapped.mapsUrl,
    latitude: mapped.latitude,
    longitude: mapped.longitude,
    about: mapped.about,
    language: mapped.language,
    theme: mapped.theme,
    darkMode: mapped.darkMode,
    timezone: mapped.timezone,
    dateFormat: mapped.dateFormat,
    timeFormat: mapped.timeFormat,
    pageSize: mapped.pageSize,
  })
  setLogo(mapped.logo)
  setLogoFile(null)
  setClearLogo(false)
  setLogoError("")
  setVersion((current) => current + 1)
}

export function SettingsPage() {
  const logoInput = useId()
  const [tab, setTab] = useState("general")
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [logo, setLogo] = useState(DEFAULT_LOGO)
  const [logoFile, setLogoFile] = useState(null)
  const [clearLogo, setClearLogo] = useState(false)
  const [logoError, setLogoError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState(null)
  const [version, setVersion] = useState(0)
  const [mapOpen, setMapOpen] = useState(false)
  const busy = busyPhase(phase)
  const locked = !editing || busy
  const mapsQuery =
    form.mapsUrl.trim() || [form.address, form.city].filter(Boolean).join(", ")
  const embedSrc = mapsEmbedSrc({
    mapsUrl: form.mapsUrl,
    latitude: form.latitude,
    longitude: form.longitude,
    query: mapsQuery,
  })

  const setters = {
    setForm,
    setLogo,
    setLogoFile,
    setClearLogo,
    setLogoError,
    setVersion,
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    getLibrarySettings().then((result) => {
      if (!active) return
      if (!result.ok) {
        setNotice(result.error)
        setLoading(false)
        return
      }
      applyMapped(mapLibrarySettings(result.data), setters)
      setNotice("")
      setLoading(false)
    })
    return () => {
      active = false
    }
    // Chargement initial uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(key, value) {
    if (locked) return
    setForm((current) => ({ ...current, [key]: value }))
    setNotice("")
  }

  async function cancelEdit() {
    setNotice("")
    setLoading(true)
    const result = await getLibrarySettings()
    if (!result.ok) {
      setNotice(result.error)
      setLoading(false)
      return
    }
    applyMapped(mapLibrarySettings(result.data), setters)
    setEditing(false)
    setLoading(false)
  }

  async function save(event) {
    event.preventDefault()
    if (!editing || busy) return
    if (form.facebookUrl && !/^https?:\/\//i.test(form.facebookUrl.trim())) {
      setNotice("Le lien Facebook doit commencer par http:// ou https://.")
      return
    }
    if (/^https?:/i.test(form.mapsUrl.trim()) && !/^https?:\/\//i.test(form.mapsUrl.trim())) {
      setNotice("Le lien Google Maps doit commencer par http:// ou https://.")
      return
    }
    if (!form.name.trim()) {
      setNotice("Le nom de la bibliothèque est obligatoire.")
      return
    }
    if (!form.email.trim()) {
      setNotice("L'adresse électronique de contact est obligatoire.")
      return
    }
    setPhase("saving")
    setNotice("")
    const body = new FormData()
    body.set("name", form.name.trim())
    body.set("slogan", form.slogan.trim())
    body.set("address", form.address.trim())
    body.set("city", form.city.trim() || "Kinshasa")
    body.set("phone", form.phone.trim())
    body.set("email", form.email.trim())
    body.set("facebook_url", form.facebookUrl.trim())
    body.set("whatsapp_url", form.whatsappUrl.trim())
    body.set("maps_url", form.mapsUrl.trim())
    body.set("latitude", form.latitude)
    body.set("longitude", form.longitude)
    body.set("about", form.about)
    body.set("language", form.language)
    body.set("theme", form.theme)
    body.set("dark_mode", form.darkMode ? "true" : "false")
    body.set("timezone", form.timezone)
    body.set("date_format", form.dateFormat)
    body.set("time_format", form.timeFormat)
    body.set("page_size", form.pageSize)
    if (clearLogo) body.set("clear_logo", "true")
    if (logoFile) body.set("logo", logoFile)
    const result = await saveLibrarySettings(body)
    if (!result.ok) {
      setPhase(null)
      setNotice(result.error)
      return
    }
    const mapped = mapLibrarySettings(result.data)
    applyMapped(mapped, setters)
    setSiteFavicon(mapped.logo)
    setPhase("done")
    await new Promise((resolve) => {
      window.setTimeout(resolve, 750)
    })
    setPhase(null)
    setEditing(false)
    setNotice("Les paramètres généraux ont été enregistrés.")
  }

  if (loading) {
    return <p className="text-muted">Chargement des paramètres…</p>
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      {phase ? <FormSaveOverlay phase={phase} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button key={item.id} type="button" className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control px-4 font-semibold ${active ? "bg-violet text-on-primary" : "bg-panel text-violet"}`} onClick={() => setTab(item.id)}>
                <Icon aria-hidden="true" size={18} />
                {item.label}
              </button>
            )
          })}
        </div>
        {tab === "general" && !editing ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary"
            onClick={() => {
              setNotice("")
              setEditing(true)
            }}
          >
            <Pencil aria-hidden="true" size={18} />
            Modifier
          </button>
        ) : null}
      </div>
      {tab === "general" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <Settings aria-hidden="true" className="text-violet" size={22} />
              Informations générales
            </h2>
            <p className="mt-1 text-muted">Paramètres de base de la plateforme.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Nom de la bibliothèque *</span>
                <input className={fieldClass} value={form.name} onChange={(event) => set("name", event.target.value)} required disabled={locked} />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Slogan</span>
                <input className={fieldClass} value={form.slogan} onChange={(event) => set("slogan", event.target.value)} disabled={locked} />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Adresse</span>
                <span className="relative">
                  <MapPin aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input className={`${fieldClass} pl-10`} value={form.address} onChange={(event) => set("address", event.target.value)} disabled={locked} />
                </span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Téléphone</span>
                <span className="relative">
                  <Phone aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input className={`${fieldClass} pl-10`} value={form.phone} onChange={(event) => set("phone", event.target.value)} disabled={locked} />
                </span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Email de contact</span>
                <span className="relative">
                  <Mail aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input className={`${fieldClass} pl-10`} type="email" value={form.email} onChange={(event) => set("email", event.target.value)} disabled={locked} />
                </span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Facebook (facultatif)</span>
                <input className={fieldClass} value={form.facebookUrl} onChange={(event) => set("facebookUrl", event.target.value)} placeholder="https://facebook.com/…" disabled={locked} />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">WhatsApp (facultatif)</span>
                <input className={fieldClass} value={form.whatsappUrl} onChange={(event) => set("whatsappUrl", event.target.value)} placeholder="+243800000000 ou https://wa.me/…" disabled={locked} />
              </label>
              <div className="grid gap-2 sm:col-span-2">
                <span className="font-semibold text-heading">Localisation Google Maps (facultatif)</span>
                <span className="relative">
                  <MapPin aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-violet" />
                  <input
                    className={`${fieldClass} pl-10`}
                    value={form.mapsUrl}
                    onChange={(event) => {
                      const value = event.target.value
                      set("mapsUrl", value)
                      const coords = parseMapsCoords(value)
                      if (coords) {
                        setForm((current) => ({
                          ...current,
                          mapsUrl: value,
                          latitude: String(coords.latitude),
                          longitude: String(coords.longitude),
                        }))
                      }
                    }}
                    onFocus={() => {
                      if (editing) setMapOpen(true)
                    }}
                    placeholder="Adresse ou lien Google Maps (ex. Kinshasa ou https://maps.google.com/…)"
                    disabled={locked}
                  />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-3 font-semibold text-violet disabled:opacity-60"
                    disabled={!mapsQuery && !(form.latitude && form.longitude)}
                    onClick={() => {
                      const coords = parseMapsCoords(form.mapsUrl)
                      if (coords) {
                        setForm((current) => ({
                          ...current,
                          latitude: String(coords.latitude),
                          longitude: String(coords.longitude),
                        }))
                      }
                      setMapOpen(true)
                    }}
                  >
                    <MapPin aria-hidden="true" size={18} />
                    Afficher la carte
                  </button>
                  {form.latitude && form.longitude ? (
                    <span className="text-muted">
                      Coordonnées : {form.latitude}, {form.longitude}
                    </span>
                  ) : (
                    <span className="text-muted">
                      Saisissez une adresse pour l'aperçu, ou collez un lien Google Maps pour récupérer les coordonnées.
                    </span>
                  )}
                </div>
                {mapOpen ? (
                  embedSrc ? (
                    <iframe
                      title="Aperçu Google Maps de la bibliothèque"
                      src={embedSrc}
                      className="mt-1 h-80 w-full rounded-control border border-line"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  ) : (
                    <p className="mt-1 rounded-control border border-line bg-canvas p-4 text-muted">
                      Indiquez une adresse ou un lien Google Maps pour afficher la carte.
                    </p>
                  )
                ) : null}
              </div>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-heading">Logo de la bibliothèque</p>
              <p className="text-muted">Ce logo sert aussi d'icône du site (favicon).</p>
              <img src={logo} alt="Logo de la Bibliothèque Totanga" className="theme-logo mt-2 h-16 w-auto rounded-control bg-panel" />
              {editing ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input id={logoInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => {
                    setClearLogo(false)
                    readImage(event.target.files?.[0], setLogoError, setLogo, setLogoFile)
                    event.target.value = ""
                  }} />
                  <label htmlFor={logoInput} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet">
                    <ImagePlus aria-hidden="true" size={18} />
                    Changer le logo
                  </label>
                  <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable" disabled={busy} onClick={() => {
                    setClearLogo(true)
                    setLogoFile(null)
                    setLogo(DEFAULT_LOGO)
                    setLogoError("")
                  }}>
                    Supprimer
                  </button>
                </div>
              ) : null}
              {editing ? <p className="mt-2 text-muted">Formats : JPG, PNG, WebP. Taille max. : 5 Mo.</p> : null}
              {logoError ? <p role="alert" className="mt-2 text-unavailable">{logoError}</p> : null}
            </div>
            <div className="mt-4">
              <p className="font-semibold text-heading">À propos de la bibliothèque</p>
              <div className="mt-2">
                <RichTextEditor key={`${version}-${editing ? "edit" : "view"}`} label="À propos de la bibliothèque" value={form.about} onChange={(about) => set("about", about)} disabled={locked} />
              </div>
            </div>
          </article>
          <div className="grid content-start gap-4">
            <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-section text-heading">
                <Globe aria-hidden="true" className="text-violet" size={22} />
                Apparence et langue
              </h2>
              <label className="mt-4 grid gap-1">
                <span className="font-semibold text-heading">Langue par défaut</span>
                <select className={fieldClass} value={form.language} onChange={(event) => set("language", event.target.value)} disabled={locked}>
                  <option>Français</option>
                </select>
              </label>
              <label className="mt-3 grid gap-1">
                <span className="font-semibold text-heading">Thème de l'interface</span>
                <select className={fieldClass} value={form.theme} onChange={(event) => set("theme", event.target.value)} disabled={locked}>
                  <option>Violet (Totanga)</option>
                </select>
              </label>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="font-semibold text-heading">Mode clair / sombre</p>
                <Switch checked={form.darkMode} label="Mode clair ou sombre" disabled={locked} onClick={() => set("darkMode", !form.darkMode)} />
              </div>
            </article>
            <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
              <h2 className="text-section text-heading">Paramètres de fonctionnement</h2>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Fuseau horaire</span>
                  <select className={fieldClass} value={form.timezone} onChange={(event) => set("timezone", event.target.value)} disabled={locked}>
                    <option>(UTC+01:00) Kinshasa</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Format de date</span>
                  <select className={fieldClass} value={form.dateFormat} onChange={(event) => set("dateFormat", event.target.value)} disabled={locked}>
                    <option>31 déc. 2026</option>
                    <option>31/12/2026</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Format d'heure</span>
                  <select className={fieldClass} value={form.timeFormat} onChange={(event) => set("timeFormat", event.target.value)} disabled={locked}>
                    <option>24 heures (14:30)</option>
                    <option>12 heures (02:30 PM)</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="font-semibold text-heading">Nombre d'éléments par page</span>
                  <select className={fieldClass} value={form.pageSize} onChange={(event) => set("pageSize", event.target.value)} disabled={locked}>
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </label>
              </div>
            </article>
          </div>
        </div>
      ) : (
        <article className="rounded-panel border border-line bg-panel p-6 shadow-card">
          <h2 className="text-section text-heading">{TABS.find((item) => item.id === tab)?.label}</h2>
          <p className="mt-2 text-muted">Ces réglages se préparent. Les informations générales restent dans l'onglet Général.</p>
        </article>
      )}
      {tab === "general" && editing ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading" onClick={cancelEdit} disabled={busy}>
            <X aria-hidden="true" size={18} />
            Annuler
          </button>
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary disabled:opacity-60" disabled={busy}>
            <Check aria-hidden="true" size={18} />
            Enregistrer les paramètres
          </button>
        </div>
      ) : null}
      {notice ? <p className={notice.includes("enregistr") ? "text-muted" : "text-unavailable"} role={notice.includes("enregistr") ? undefined : "alert"}>{notice}</p> : null}
    </form>
  )
}
