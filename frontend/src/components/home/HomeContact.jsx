import { useEffect, useId, useRef, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  PenLine,
  Phone,
  Send,
  UserRound,
  X,
} from "lucide-react"
import { AVIS_BODY_MAX, getLibraryInfo, getVisitorMessages, sendVisitorMessage } from "../../api/client.js"
import { SendOverlay } from "../ui/SendOverlay.jsx"
import { formatDate } from "../../lib/format.js"
import { mapsEmbedSrc } from "../../lib/maps.js"
import { useAsync } from "../../lib/useAsync.js"

const SUBJECTS = [
  { value: "generale", label: "Question générale" },
  { value: "horaires", label: "Horaires et services" },
  { value: "catalogue", label: "Catalogue" },
  { value: "evenement", label: "Événement" },
  { value: "autre", label: "Autre" },
]

const EMPTY_CONTACT = { name: "", contactVia: "email", email: "", whatsapp: "", subject: "", body: "" }
const EMPTY_AVIS = { name: "", body: "" }

export function HomeContact() {
  const libraryState = useAsync(getLibraryInfo, [])
  const [avis, setAvis] = useState([])
  const [form, setForm] = useState(EMPTY_CONTACT)
  const [avisForm, setAvisForm] = useState(EMPTY_AVIS)
  const [status, setStatus] = useState("idle")
  const [avisStatus, setAvisStatus] = useState("idle")
  const [notice, setNotice] = useState("")
  const [avisNotice, setAvisNotice] = useState("")
  const [avisOpen, setAvisOpen] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const doneTimerRef = useRef(0)
  const avisDoneTimerRef = useRef(0)
  const avisTitleId = useId()

  useEffect(() => {
    let active = true
    getVisitorMessages()
      .then((items) => {
        if (active) setAvis(items)
      })
      .catch(() => {
        if (active) setAvis([])
      })
    return () => {
      active = false
      window.clearTimeout(doneTimerRef.current)
      window.clearTimeout(avisDoneTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setMessageIndex(0)
  }, [avis.length])

  useEffect(() => {
    if (avis.length < 2 || reducedMotion || paused || avisOpen) return undefined
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % avis.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [avis.length, reducedMotion, paused, avisOpen])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReducedMotion(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (!avisOpen) return undefined
    function onKeyDown(event) {
      if (event.key === "Escape" && avisStatus === "idle") setAvisOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [avisOpen, avisStatus])

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function updateAvis(event) {
    const { name, value } = event.target
    setAvisForm((current) => ({ ...current, [name]: value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setStatus("sending")
    setNotice("")
    const payload = {
      kind: "contact",
      name: form.name,
      subject: form.subject,
      body: form.body,
      email: form.contactVia === "email" ? form.email.trim() : "",
      whatsapp: form.contactVia === "whatsapp" ? form.whatsapp.trim() : "",
    }
    if (!payload.email && !payload.whatsapp) {
      setStatus("idle")
      setNotice("Indiquez une adresse électronique ou un numéro WhatsApp.")
      return
    }
    try {
      await sendVisitorMessage(payload)
      setForm(EMPTY_CONTACT)
      setStatus("done")
      setNotice("Votre message a été envoyé à la bibliothèque.")
      window.clearTimeout(doneTimerRef.current)
      doneTimerRef.current = window.setTimeout(() => setStatus("idle"), 1400)
    } catch (error) {
      setStatus("idle")
      setNotice(error?.message || "Le message n'a pas pu être envoyé.")
    }
  }

  async function onSubmitAvis(event) {
    event.preventDefault()
    setAvisStatus("sending")
    setAvisNotice("")
    try {
      await sendVisitorMessage({
        kind: "avis",
        name: avisForm.name,
        body: avisForm.body,
      })
      const items = await getVisitorMessages()
      setAvis(items)
      setMessageIndex(0)
      setAvisForm(EMPTY_AVIS)
      setAvisStatus("done")
      setAvisNotice("Merci ! Votre avis apparaît maintenant ci-dessous.")
      window.clearTimeout(avisDoneTimerRef.current)
      avisDoneTimerRef.current = window.setTimeout(() => {
        setAvisStatus("idle")
        setAvisOpen(false)
        setAvisNotice("")
      }, 1200)
    } catch (error) {
      setAvisStatus("idle")
      setAvisNotice(error?.message || "L'avis n'a pas pu être envoyé.")
    }
  }

  const library = libraryState.data
  const current = avis[messageIndex] || avis[0] || null
  const avisLength = avisForm.body.length

  function showAvis(step) {
    setMessageIndex((currentIndex) => (currentIndex + step + avis.length) % avis.length)
  }

  return (
    <section aria-labelledby="contact-title" className="space-y-6 bg-canvas px-4 pb-10 sm:px-8 lg:px-14">
      {status === "sending" || status === "done" ? <SendOverlay phase={status === "done" ? "done" : "sending"} /> : null}
      {avisStatus === "sending" || avisStatus === "done" ? (
        <SendOverlay phase={avisStatus === "done" ? "done" : "sending"} />
      ) : null}

      <div className="overflow-hidden rounded-panel border border-line bg-panel p-5 shadow-panel sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full bg-gold-bright" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="avis-title" className="text-section text-heading">
                Avis des lecteurs
              </h2>
              <p className="mt-1 max-w-2xl text-meta text-muted">
                Ce que notre communauté dit de la Bibliothèque Totanga.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-violet px-4 text-meta font-semibold text-on-primary"
              onClick={() => {
                setAvisNotice("")
                setAvisOpen(true)
              }}
            >
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Écrire
            </button>
            {avis.length > 1 ? (
              <div className="flex items-center gap-2" role="group" aria-label="Parcourir les avis">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-violet shadow-card hover:bg-lavender"
                  onClick={() => showAvis(-1)}
                  aria-label="Avis précédent"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-1.5 px-1">
                  {avis.map((item, index) => (
                    <button
                      key={item.id ?? index}
                      type="button"
                      className={`h-2.5 w-2.5 rounded-full ${index === messageIndex ? "bg-violet" : "bg-line"}`}
                      aria-label={`Avis ${index + 1} sur ${avis.length}`}
                      aria-current={index === messageIndex ? "true" : undefined}
                      onClick={() => setMessageIndex(index)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel text-violet shadow-card hover:bg-lavender"
                  onClick={() => showAvis(1)}
                  aria-label="Avis suivant"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {current ? (
          <div className="mt-5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <article
              key={current.id}
              aria-live="polite"
              className="relative overflow-hidden rounded-panel border border-line bg-lavender p-4 sm:p-5"
            >
              <span
                className="pointer-events-none absolute top-2 right-4 select-none text-[4.5rem] leading-none font-serif text-violet/15"
                aria-hidden="true"
              >
                ”
              </span>
              <div className="relative flex items-stretch gap-4 sm:gap-5">
                <div className="flex shrink-0 items-start border-r border-line pr-4 sm:pr-5">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-panel text-violet shadow-card sm:h-14 sm:w-14">
                    <UserRound className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 pr-6 sm:pr-10">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-panel px-3 py-1 text-badge font-semibold text-violet shadow-card">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {current.subject || "Avis sur la bibliothèque"}
                  </p>
                  <p className="mt-3 text-article text-heading">{current.body}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5 text-violet" aria-hidden="true" />
                      {current.name}
                    </span>
                    {current.createdAt ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-violet" aria-hidden="true" />
                          {formatDate(current.createdAt)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </article>
            {avis.length > 1 ? (
              <p className="mx-auto mt-4 w-fit rounded-full bg-lavender px-3 py-1 text-meta font-semibold text-muted">
                {messageIndex + 1} / {avis.length}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-body text-muted">
            Aucun avis pour le moment. Soyez le premier à écrire ce que la bibliothèque représente pour vous.
          </p>
        )}
      </div>

      {avisOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4"
          role="presentation"
          onClick={() => {
            if (avisStatus === "idle") setAvisOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={avisTitleId}
            className="w-full max-w-lg rounded-panel border border-line bg-panel p-5 shadow-panel sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id={avisTitleId} className="text-section text-heading">
                  Écrire un avis
                </h3>
                <p className="mt-1 text-meta text-muted">
                  Partagez ce que vous pensez de la Bibliothèque Totanga. Votre avis s’affiche automatiquement sur l’accueil.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-heading"
                aria-label="Fermer"
                disabled={avisStatus !== "idle"}
                onClick={() => setAvisOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form className="mt-5 grid gap-4" onSubmit={onSubmitAvis}>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-meta font-bold text-heading">
                  Votre nom <span className="text-violet">*</span>
                </span>
                <input
                  name="name"
                  value={avisForm.name}
                  onChange={updateAvis}
                  required
                  maxLength={80}
                  placeholder="Votre prénom ou nom"
                  className="w-full rounded-control border border-line bg-panel px-3 text-body text-heading outline-none focus-visible:ring-2 focus-visible:ring-violet"
                />
              </label>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-meta font-bold text-heading">
                  Votre avis <span className="text-violet">*</span>
                </span>
                <textarea
                  name="body"
                  value={avisForm.body}
                  onChange={updateAvis}
                  required
                  rows={5}
                  maxLength={AVIS_BODY_MAX}
                  minLength={10}
                  placeholder="Écrivez quelques mots sur la bibliothèque…"
                  className="min-h-28 w-full rounded-control border border-line bg-panel px-3 py-2 text-body text-heading outline-none focus-visible:ring-2 focus-visible:ring-violet"
                />
                <span className={`mt-1 block text-right text-meta ${avisLength >= AVIS_BODY_MAX ? "text-unavailable" : "text-muted"}`}>
                  {avisLength} / {AVIS_BODY_MAX}
                </span>
              </label>
              {avisNotice ? (
                <p className="text-body text-heading" role="status">
                  {avisNotice}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-control border border-line bg-panel px-4 font-semibold text-heading"
                  disabled={avisStatus !== "idle"}
                  onClick={() => setAvisOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={avisStatus !== "idle"}
                  className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary disabled:opacity-60"
                >
                  Publier l’avis
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <form
          onSubmit={onSubmit}
          className="min-w-0 rounded-panel border border-line bg-panel p-5 shadow-panel sm:p-8"
          noValidate
        >
          <h2 id="contact-title" className="flex items-center gap-2 text-section text-heading">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-bright text-heading" aria-hidden="true">
              <Mail className="h-4 w-4" />
            </span>
            Nous contacter
          </h2>
          <fieldset className="mt-5">
            <legend className="mb-2 block text-meta font-bold text-heading">
              Par quel moyen voulez-vous être répondu ? <span className="text-violet">*</span>
            </legend>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-body text-heading">
                <input type="radio" name="contactVia" value="email" checked={form.contactVia === "email"} onChange={update} />
                Par email
              </label>
              <label className="inline-flex items-center gap-2 text-body text-heading">
                <input type="radio" name="contactVia" value="whatsapp" checked={form.contactVia === "whatsapp"} onChange={update} />
                Par WhatsApp
              </label>
            </div>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" name="name" value={form.name} onChange={update} placeholder="Votre nom" required />
            {form.contactVia === "email" ? (
              <Field label="Email" name="email" type="email" value={form.email} onChange={update} placeholder="votre@email.com" required autoComplete="email" />
            ) : (
              <Field label="Numéro WhatsApp" name="whatsapp" type="tel" value={form.whatsapp} onChange={update} placeholder="+243 800 000 000" required autoComplete="tel" />
            )}
            <label className="block min-w-0 sm:col-span-2">
              <span className="mb-1.5 block text-meta font-bold text-heading">
                Sujet <span className="text-violet">*</span>
              </span>
              <select name="subject" value={form.subject} onChange={update} required className="w-full rounded-control border border-line bg-panel px-3 text-body text-heading">
                <option value="">Sélectionnez un sujet</option>
                {SUBJECTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="mb-1.5 block text-meta font-bold text-heading">
                Message <span className="text-violet">*</span>
              </span>
              <textarea
                name="body"
                value={form.body}
                onChange={update}
                required
                rows={4}
                maxLength={1000}
                placeholder="Écrivez votre message…"
                className="min-h-28 w-full rounded-control border border-line bg-panel px-3 py-2 text-body text-heading"
              />
              <span className="mt-1 block text-right text-meta text-muted">{form.body.length} / 1000</span>
            </label>
          </div>
          <p className="mt-3 text-meta text-muted">
            Ce message est réservé à la bibliothèque. Il n’apparaît pas dans les avis publics. Votre email ou WhatsApp reste confidentiel.
          </p>
          {notice ? (
            <p className="mt-3 text-body text-heading" role="status">
              {notice}
            </p>
          ) : null}
          <button type="submit" disabled={status === "sending" || status === "done"} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet px-5 text-body font-bold text-on-primary disabled:opacity-60">
            {status === "sending" ? "Envoi…" : "Envoyer le message"}
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        <aside
          aria-labelledby="coordinates-title"
          className="min-w-0 rounded-panel border border-line bg-panel p-5 shadow-panel sm:p-8"
        >
          <h2 id="coordinates-title" className="text-section text-heading">
            Nos coordonnées
          </h2>
          {library ? (
            <>
              <ul className="mt-5 space-y-4">
                <Coordinate icon={MapPin} href={null}>
                  {[library.address, library.city].filter(Boolean).join(", ")}
                </Coordinate>
                <Coordinate icon={Phone} href={phoneHref(library.phone)}>
                  {library.phone}
                </Coordinate>
                <Coordinate icon={Mail} href={mailHref(library.email)}>
                  {library.email}
                </Coordinate>
                {library.hoursSummary ? (
                  <Coordinate icon={Clock} href={null}>
                    {library.hoursSummary}
                  </Coordinate>
                ) : null}
              </ul>
              <MapCard library={library} />
            </>
          ) : (
            <p className="mt-5 text-body text-muted">Les coordonnées ne sont pas disponibles pour le moment.</p>
          )}
        </aside>
      </div>
    </section>
  )
}

function Field({ label, name, type = "text", className = "", ...props }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-meta font-bold text-heading">
        {label} <span className="text-violet">*</span>
      </span>
      <input name={name} type={type} maxLength={name === "name" ? 80 : name === "whatsapp" ? 40 : 254} className="w-full rounded-control border border-line bg-panel px-3 text-body text-heading" {...props} />
    </label>
  )
}

function MapCard({ library }) {
  const place = [library.address, library.city].filter(Boolean).join(", ")
  const src = mapsEmbedSrc({
    mapsUrl: library.mapsUrl,
    latitude: library.latitude,
    longitude: library.longitude,
    query: library.mapsUrl || place,
  })
  if (!src) return null
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line">
      <iframe
        title="Localisation de la Bibliothèque Totanga"
        src={src}
        className="h-96 w-full bg-lavender"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  )
}

function Coordinate({ icon: Icon, href, children }) {
  const content = (
    <>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lavender text-violet">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-body text-heading">{children}</span>
    </>
  )
  if (!href) return <li className="flex items-start gap-3">{content}</li>
  return (
    <li>
      <a href={href} className="flex items-start gap-3 hover:text-violet">
        {content}
      </a>
    </li>
  )
}

function phoneHref(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "")
  if (!/^\+?[0-9]{8,15}$/.test(compact)) return null
  return `tel:${compact}`
}

function mailHref(email) {
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email || "")) return null
  return `mailto:${email}`
}
