import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Clock, Mail, MapPin, Phone, Send } from "lucide-react"
import { getLibraryInfo, getVisitorMessages, sendVisitorMessage } from "../../api/client.js"
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

const EMPTY_FORM = { name: "", contactVia: "email", email: "", whatsapp: "", subject: "", body: "" }

export function HomeContact() {
  const libraryState = useAsync(getLibraryInfo, [])
  const [messages, setMessages] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState("idle")
  const [notice, setNotice] = useState("")
  const [reducedMotion, setReducedMotion] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const doneTimerRef = useRef(0)

  useEffect(() => {
    let active = true
    getVisitorMessages()
      .then((items) => {
        if (active) setMessages(items)
      })
      .catch(() => {
        if (active) setMessages([])
      })
    return () => {
      active = false
      window.clearTimeout(doneTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setMessageIndex(0)
  }, [messages.length])

  useEffect(() => {
    if (messages.length < 2 || reducedMotion || paused) return undefined
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [messages.length, reducedMotion, paused])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReducedMotion(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setStatus("sending")
    setNotice("")
    const payload = {
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
      const items = await getVisitorMessages()
      setMessages(items)
      setForm(EMPTY_FORM)
      setStatus("done")
      setNotice("Votre message a été envoyé.")
      window.clearTimeout(doneTimerRef.current)
      doneTimerRef.current = window.setTimeout(() => setStatus("idle"), 1400)
    } catch (error) {
      setStatus("idle")
      setNotice(error?.message || "Le message n'a pas pu être envoyé.")
    }
  }

  const library = libraryState.data
  const currentMessage = messages[messageIndex] || messages[0] || null

  function showMessage(step) {
    setMessageIndex((current) => (current + step + messages.length) % messages.length)
  }

  return (
    <section aria-labelledby="contact-title" className="space-y-6 bg-canvas px-4 pb-10 sm:px-8 lg:px-14">
      {status === "sending" || status === "done" ? <SendOverlay phase={status === "done" ? "done" : "sending"} /> : null}
      <div className="overflow-hidden rounded-panel border border-line bg-white p-5 shadow-panel sm:p-8">
        <h2 id="messages-title" className="text-section text-heading">
          Messages des lecteurs
        </h2>
        {currentMessage ? (
          <div className="mt-4" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <article key={currentMessage.id} aria-live="polite" className="rounded-card border border-line bg-lavender p-5">
              <p className="text-meta font-bold text-violet">{currentMessage.subject}</p>
              <p className="mt-2 text-article text-heading">{currentMessage.body}</p>
              <p className="mt-3 text-meta text-muted">
                {currentMessage.name}
                {currentMessage.createdAt ? ` · ${formatDate(currentMessage.createdAt)}` : ""}
              </p>
            </article>
            {messages.length > 1 ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 font-semibold text-violet" onClick={() => showMessage(-1)} aria-label="Message précédent">
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Précédent
                </button>
                <p className="text-meta text-muted">
                  {messageIndex + 1} / {messages.length}
                </p>
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 font-semibold text-violet" onClick={() => showMessage(1)} aria-label="Message suivant">
                  Suivant
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-body text-muted">Aucun message pour le moment. Le premier apparaîtra ici.</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <form
          onSubmit={onSubmit}
          className="min-w-0 rounded-panel border border-line bg-white p-5 shadow-panel sm:p-8"
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
              <select name="subject" value={form.subject} onChange={update} required className="w-full rounded-control border border-line bg-white px-3 text-body text-heading">
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
                className="min-h-28 w-full rounded-control border border-line bg-white px-3 py-2 text-body text-heading"
              />
            </label>
          </div>
          <p className="mt-3 text-meta text-muted">Votre nom et votre message apparaîtront sur l'accueil. Votre email ou WhatsApp reste réservé à la bibliothèque.</p>
          {notice ? (
            <p className="mt-3 text-body text-heading" role="status">
              {notice}
            </p>
          ) : null}
          <button type="submit" disabled={status === "sending" || status === "done"} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet px-5 text-body font-bold text-white disabled:opacity-60">
            {status === "sending" ? "Envoi…" : "Envoyer le message"}
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        <aside
          aria-labelledby="coordinates-title"
          className="min-w-0 rounded-panel border border-line bg-white p-5 shadow-panel sm:p-8"
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
      <input name={name} type={type} maxLength={name === "name" ? 80 : name === "whatsapp" ? 40 : 254} className="w-full rounded-control border border-line bg-white px-3 text-body text-heading" {...props} />
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
