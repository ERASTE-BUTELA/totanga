import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Clock, Mail, MapPin, Phone, Send } from "lucide-react"
import { getLibraryInfo, getVisitorMessages, sendVisitorMessage } from "../../api/client.js"
import { ExternalLink } from "../ui/ExternalLink.jsx"
import { formatDate } from "../../lib/format.js"
import { useAsync } from "../../lib/useAsync.js"

const SUBJECTS = [
  { value: "generale", label: "Question générale" },
  { value: "horaires", label: "Horaires et services" },
  { value: "catalogue", label: "Catalogue" },
  { value: "evenement", label: "Événement" },
  { value: "autre", label: "Autre" },
]

const EMPTY_FORM = { name: "", email: "", subject: "", body: "" }

export function HomeContact() {
  const libraryState = useAsync(getLibraryInfo, [])
  const [messages, setMessages] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState("idle")
  const [notice, setNotice] = useState("")
  const [reducedMotion, setReducedMotion] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [paused, setPaused] = useState(false)

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
    try {
      await sendVisitorMessage(form)
      const items = await getVisitorMessages()
      setMessages(items)
      setForm(EMPTY_FORM)
      setStatus("idle")
      setNotice("Votre message a été envoyé.")
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
    <section aria-labelledby="contact-title" className="bg-canvas px-4 pb-10 sm:px-8 lg:px-14">
      <div className="overflow-hidden rounded-panel border border-line bg-white shadow-panel">
        <div className="border-b border-line px-5 py-4 sm:px-8">
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

        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <form onSubmit={onSubmit} className="min-w-0" noValidate>
            <h2 id="contact-title" className="flex items-center gap-2 text-section text-heading">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-bright text-heading" aria-hidden="true">
                <Mail className="h-4 w-4" />
              </span>
              Nous contacter
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" name="name" value={form.name} onChange={update} placeholder="Votre nom" required />
              <Field label="Email" name="email" type="email" value={form.email} onChange={update} placeholder="votre@email.com" required autoComplete="email" />
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
            <p className="mt-3 text-meta text-muted">Votre nom et votre message apparaîtront sur l'accueil. Votre adresse électronique reste réservée à la bibliothèque.</p>
            {notice ? (
              <p className="mt-3 text-body text-heading" role="status">
                {notice}
              </p>
            ) : null}
            <button type="submit" disabled={status === "sending"} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet px-5 text-body font-bold text-white disabled:opacity-60">
              {status === "sending" ? "Envoi…" : "Envoyer le message"}
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <aside aria-labelledby="coordinates-title" className="min-w-0">
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
              <MapCard place={[library.address, library.city].filter(Boolean).join(", ")} />
              </>
            ) : (
              <p className="mt-5 text-body text-muted">Les coordonnées ne sont pas disponibles pour le moment.</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  )
}

function Field({ label, name, type = "text", ...props }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-meta font-bold text-heading">
        {label} <span className="text-violet">*</span>
      </span>
      <input name={name} type={type} maxLength={name === "name" ? 80 : 254} className="w-full rounded-control border border-line bg-white px-3 text-body text-heading" {...props} />
    </label>
  )
}

function MapCard({ place }) {
  if (!place) return null
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
  return (
    <ExternalLink
      href={href}
      label={`Ouvrir ${place} dans Google Maps`}
      className="mt-6 flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl bg-lavender p-4 text-center"
    >
      <MapPin className="h-8 w-8 text-violet" aria-hidden="true" />
      <span className="text-body font-bold text-violet">Voir sur Google Maps</span>
      <span className="text-meta text-heading">{place}</span>
    </ExternalLink>
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
