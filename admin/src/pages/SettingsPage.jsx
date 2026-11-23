import { useEffect, useId, useState } from "react"
import { Bell, BookOpen, CalendarDays, Check, Database, ImagePlus, Library, Mail, MapPin, Pencil, Phone, Settings, Shield, Trash2, X } from "lucide-react"
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
const CAROUSEL_MAX = 6
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
  youtubeUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  hoursText: "",
  mapsUrl: "",
  latitude: "",
  longitude: "",
  about: "",
  functioning: "",
  language: "Français",
  theme: "Violet (Totanga)",
  darkMode: false,
  timezone: "(UTC+01:00) Kinshasa",
  dateFormat: "31 déc. 2026",
  timeFormat: "24 heures (14:30)",
  pageSize: "10",
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
  const {
    setForm,
    setLogo,
    setLogoFile,
    setClearLogo,
    setLogoError,
    setHero,
    setHeroFile,
    setClearHero,
    setHeroError,
    setCarousel,
    setCarouselError,
    setVersion,
  } = setters
  setForm({
    name: mapped.name,
    slogan: mapped.slogan,
    address: mapped.address,
    city: mapped.city,
    phone: mapped.phone,
    email: mapped.email,
    facebookUrl: mapped.facebookUrl,
    whatsappUrl: mapped.whatsappUrl,
    youtubeUrl: mapped.youtubeUrl,
    instagramUrl: mapped.instagramUrl,
    tiktokUrl: mapped.tiktokUrl,
    hoursText: mapped.hoursText,
    mapsUrl: mapped.mapsUrl,
    latitude: mapped.latitude,
    longitude: mapped.longitude,
    about: mapped.about,
    functioning: mapped.functioning,
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
  setHero(mapped.heroImage)
  setHeroFile(null)
  setClearHero(false)
  setHeroError("")
  setCarousel(
    (mapped.carouselImages || []).map((item) => ({
      key: `saved-${item.id}`,
      id: item.id,
      url: item.url,
      file: null,
    })),
  )
  setCarouselError("")
  setVersion((current) => current + 1)
}

export function SettingsPage() {
  const logoInput = useId()
  const heroInput = useId()
  const carouselInput = useId()
  const [tab, setTab] = useState("general")
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [logo, setLogo] = useState(DEFAULT_LOGO)
  const [logoFile, setLogoFile] = useState(null)
  const [clearLogo, setClearLogo] = useState(false)
  const [logoError, setLogoError] = useState("")
  const [hero, setHero] = useState("")
  const [heroFile, setHeroFile] = useState(null)
  const [clearHero, setClearHero] = useState(false)
  const [heroError, setHeroError] = useState("")
  const [carousel, setCarousel] = useState([])
  const [carouselError, setCarouselError] = useState("")
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
    setHero,
    setHeroFile,
    setClearHero,
    setHeroError,
    setCarousel,
    setCarouselError,
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
    for (const [value, label] of [
      [form.facebookUrl, "Facebook"],
      [form.youtubeUrl, "YouTube"],
      [form.instagramUrl, "Instagram"],
      [form.tiktokUrl, "TikTok"],
    ]) {
      if (value && !/^https?:\/\//i.test(value.trim())) {
        setNotice(`Le lien ${label} doit commencer par http:// ou https://.`)
        return
      }
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
    body.set("youtube_url", form.youtubeUrl.trim())
    body.set("instagram_url", form.instagramUrl.trim())
    body.set("tiktok_url", form.tiktokUrl.trim())
    body.set("hours_text", form.hoursText.trim())
    body.set("maps_url", form.mapsUrl.trim())
    body.set("latitude", form.latitude)
    body.set("longitude", form.longitude)
    body.set("about", form.about)
    body.set("functioning", form.functioning)
    body.set("language", form.language)
    body.set("theme", form.theme)
    body.set("dark_mode", form.darkMode ? "true" : "false")
    body.set("timezone", form.timezone)
    body.set("date_format", form.dateFormat)
    body.set("time_format", form.timeFormat)
    body.set("page_size", form.pageSize)
    if (clearLogo) body.set("clear_logo", "true")
    if (logoFile) body.set("logo", logoFile)
    if (clearHero) body.set("clear_hero_image", "true")
    if (heroFile) body.set("hero_image", heroFile)
    body.set(
      "carousel_keep",
      carousel.filter((item) => item.id).map((item) => String(item.id)).join(","),
    )
    carousel.forEach((item) => {
      if (item.file) body.append("carousel_images", item.file)
    })
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
        <div className="grid items-start gap-4">
          <article className="rounded-panel border border-line bg-panel p-4 shadow-card sm:p-5">
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
                <span className="font-semibold text-heading">Slogan (bandeau d'accueil)</span>
                <input
                  className={fieldClass}
                  value={form.slogan}
                  onChange={(event) => set("slogan", event.target.value)}
                  maxLength={255}
                  placeholder="Un espace de savoir, de culture et de découverte à Kinshasa."
                  disabled={locked}
                />
                <span className="text-muted">Texte affiché sous le nom, sur la page d'accueil publique.</span>
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
              <label className="grid gap-1">
                <span className="font-semibold text-heading">YouTube (facultatif)</span>
                <input className={fieldClass} value={form.youtubeUrl} onChange={(event) => set("youtubeUrl", event.target.value)} placeholder="https://youtube.com/…" disabled={locked} />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Instagram (facultatif)</span>
                <input className={fieldClass} value={form.instagramUrl} onChange={(event) => set("instagramUrl", event.target.value)} placeholder="https://instagram.com/…" disabled={locked} />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">TikTok (facultatif)</span>
                <input className={fieldClass} value={form.tiktokUrl} onChange={(event) => set("tiktokUrl", event.target.value)} placeholder="https://tiktok.com/…" disabled={locked} />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="font-semibold text-heading">Horaires d’ouverture (facultatif)</span>
                <input
                  className={fieldClass}
                  value={form.hoursText}
                  onChange={(event) => set("hoursText", event.target.value)}
                  placeholder="ex. Lundi à vendredi 8 h – 17 h"
                  maxLength={300}
                  disabled={locked}
                />
                <span className="text-muted">Texte libre affiché tel quel sur la page À propos.</span>
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
                  <input id={logoInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => {
                    setClearLogo(false)
                    readImage(event.target.files?.[0], setLogoError, setLogo, setLogoFile)
                    event.target.value = ""
                  }} />
                  <label htmlFor={logoInput} className={`inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
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
            <div className="mt-4 grid items-start gap-6 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="font-semibold text-heading">Image du bandeau d'accueil</p>
                <p className="text-muted">Photo pleine largeur affichée en haut de la page d'accueil publique.</p>
                {hero ? (
                  <img
                    src={hero}
                    alt=""
                    className="mt-2 aspect-[21/9] w-full rounded-control border border-line object-cover"
                    data-theme-keep=""
                  />
                ) : (
                  <p className="mt-2 grid aspect-[21/9] w-full place-items-center rounded-control border border-dashed border-line bg-canvas px-4 text-center text-meta text-muted">
                    Image par défaut du site public
                  </p>
                )}
                {editing ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      id={heroInput}
                      className="hidden"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={(event) => {
                        setClearHero(false)
                        readImage(event.target.files?.[0], setHeroError, setHero, setHeroFile)
                        event.target.value = ""
                      }}
                    />
                    <label
                      htmlFor={heroInput}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                    >
                      <ImagePlus aria-hidden="true" size={18} />
                      Changer l'image
                    </label>
                    {hero || heroFile ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-unavailable px-3 font-semibold text-unavailable"
                        disabled={busy}
                        onClick={() => {
                          setClearHero(true)
                          setHeroFile(null)
                          setHero("")
                          setHeroError("")
                        }}
                      >
                        Revenir à l'image par défaut
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {editing ? <p className="mt-2 text-muted">Formats : JPG, PNG, WebP. Taille max. : 5 Mo. Préférez une image large (environ 1600×700).</p> : null}
                {heroError ? <p role="alert" className="mt-2 text-unavailable">{heroError}</p> : null}
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-heading">Photos du carrousel (À propos)</p>
                <p className="text-muted">
                  Jusqu&apos;à {CAROUSEL_MAX} photos. Sans photo enregistrée, le site affiche les images par défaut.
                </p>
                {carousel.length === 0 ? (
                  <p className="mt-2 rounded-control border border-dashed border-line bg-canvas px-4 py-8 text-center text-meta text-muted">
                    Aucune photo du carrousel pour le moment.
                  </p>
                ) : (
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {carousel.map((item) => (
                      <li key={item.key} className="overflow-hidden rounded-control border border-line bg-canvas">
                        <img src={item.url} alt="" className="h-28 w-full object-cover" />
                        {editing ? (
                          <div className="p-2">
                            <button
                              type="button"
                              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-control border border-unavailable px-2 font-semibold text-unavailable"
                              disabled={busy}
                              onClick={() => {
                                if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url)
                                setCarousel((current) => current.filter((row) => row.key !== item.key))
                              }}
                            >
                              <Trash2 aria-hidden="true" size={16} />
                              Retirer
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {editing ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      id={carouselInput}
                      className="hidden"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy || carousel.length >= CAROUSEL_MAX}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ""
                        if (!file) return
                        const allowed = ["image/jpeg", "image/png", "image/webp"]
                        if (!allowed.includes(file.type)) {
                          setCarouselError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
                          return
                        }
                        if (file.size > MAX_IMAGE) {
                          setCarouselError("L'image ne doit pas dépasser 5 Mo.")
                          return
                        }
                        setCarouselError("")
                        setCarousel((current) => {
                          if (current.length >= CAROUSEL_MAX) return current
                          return [
                            ...current,
                            {
                              key: `new-${Date.now()}-${current.length}`,
                              id: null,
                              url: URL.createObjectURL(file),
                              file,
                            },
                          ]
                        })
                      }}
                    />
                    <label
                      htmlFor={carouselInput}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet ${
                        busy || carousel.length >= CAROUSEL_MAX ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <ImagePlus aria-hidden="true" size={18} />
                      Ajouter une photo
                    </label>
                    <p className="text-muted">
                      {carousel.length}/{CAROUSEL_MAX}
                    </p>
                  </div>
                ) : null}
                {carouselError ? <p role="alert" className="mt-2 text-unavailable">{carouselError}</p> : null}
              </div>
            </div>
          </article>

          <div className="grid items-stretch gap-4 xl:grid-cols-2">
            <article className="flex min-h-0 flex-col rounded-panel border border-line bg-panel p-4 shadow-card sm:p-5">
              <h2 className="text-section text-heading">Histoire de la bibliothèque</h2>
              <p className="mt-1 text-muted">Texte affiché dans la colonne « Histoire » de la page À propos.</p>
              <div className="mt-3 max-h-[28rem] min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <RichTextEditor
                  key={`about-${version}-${editing ? "edit" : "view"}`}
                  label="Histoire de la bibliothèque"
                  value={form.about}
                  onChange={(about) => set("about", about)}
                  disabled={locked}
                />
              </div>
            </article>
            <article className="flex min-h-0 flex-col rounded-panel border border-line bg-panel p-4 shadow-card sm:p-5">
              <h2 className="text-section text-heading">Structure et fonctionnement</h2>
              <p className="mt-1 text-muted">Texte affiché dans la section « Fonctionnement » de la page À propos.</p>
              <div className="mt-3 max-h-[28rem] min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <RichTextEditor
                  key={`functioning-${version}-${editing ? "edit" : "view"}`}
                  label="Structure et fonctionnement"
                  value={form.functioning}
                  onChange={(functioning) => set("functioning", functioning)}
                  disabled={locked}
                />
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
        <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-panel px-4 py-3 shadow-card sm:px-6 lg:left-[17.5rem]">
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
      {tab === "general" && editing ? <div className="h-20" aria-hidden="true" /> : null}
      {notice ? <p className={notice.includes("enregistr") ? "text-muted" : "text-unavailable"} role={notice.includes("enregistr") ? undefined : "alert"}>{notice}</p> : null}
    </form>
  )
}
