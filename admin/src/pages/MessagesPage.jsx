import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, Inbox, Mail, MessageCircle, Search, Send, X } from "lucide-react"
import { listMessages, markAllMessagesRead, markMessageRead, replyToMessage } from "../api/content.js"
import { setUnreadMessages } from "../lib/alertsStore.js"

function formatWhen(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kinshasa",
  })
}

function dateSearchBits(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return []
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Kinshasa",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date)
  const day = parts.find((part) => part.type === "day")?.value || ""
  const month = parts.find((part) => part.type === "month")?.value || ""
  const year = parts.find((part) => part.type === "year")?.value || ""
  const monthLong = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Kinshasa",
    month: "long",
  }).format(date)
  const monthShort = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Kinshasa",
    month: "short",
  }).format(date)
  return [
    formatWhen(value),
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${year}-${month}-${day}`,
    `${day} ${monthShort} ${year}`,
    `${day} ${monthLong} ${year}`,
    monthLong,
    monthShort,
    year,
  ]
}

function normalizeSearch(value) {
  return String(value || "")
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function messageSearchText(row) {
  const replies = Array.isArray(row?.replies) ? row.replies.map((item) => item.body || "").join(" ") : ""
  return normalizeSearch(
    [
      row?.name,
      row?.email,
      row?.whatsapp,
      row?.subject,
      row?.kind_label,
      row?.body,
      replies,
      ...dateSearchBits(row?.created_at),
      ...(Array.isArray(row?.replies) ? row.replies.flatMap((item) => dateSearchBits(item.created_at)) : []),
    ]
      .filter(Boolean)
      .join(" "),
  )
}

function contactLine(row) {
  if (row.email) {
    return (
      <a href={`mailto:${row.email}`} className="font-semibold text-violet">
        {row.email}
      </a>
    )
  }
  if (row.whatsapp) {
    const digits = String(row.whatsapp).replace(/\D/g, "")
    return (
      <a href={`https://wa.me/${digits}`} className="font-semibold text-violet" target="_blank" rel="noopener noreferrer">
        WhatsApp {row.whatsapp}
      </a>
    )
  }
  return <span className="text-muted">Contact non indiqué</span>
}

function MessageModal({ row, thread, onClose, onReplied, onSelectRelated }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyChannel, setReplyChannel] = useState(row?.email ? "email" : "whatsapp")
  const [reply, setReply] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const canEmail = Boolean(row?.email)
  const canWhatsapp = Boolean(row?.whatsapp)
  const canReply = canEmail || canWhatsapp
  const replies = Array.isArray(row?.replies) ? row.replies : []
  const related = (thread || []).filter((item) => item.id !== row?.id)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event) {
      if (event.key === "Escape" && !busy) onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [busy, onClose])

  useEffect(() => {
    setReplyOpen(false)
    setReply("")
    setError("")
    setNotice("")
    setReplyChannel(row?.email ? "email" : "whatsapp")
  }, [row?.id, row?.email])

  if (!row) return null

  async function sendReply(event) {
    event.preventDefault()
    if (!canReply || busy) return
    const channel = replyChannel === "whatsapp" && canWhatsapp ? "whatsapp" : "email"
    if (channel === "email" && !canEmail) {
      setError("Ce message n'a pas d'adresse électronique.")
      return
    }
    if (channel === "whatsapp" && !canWhatsapp) {
      setError("Ce message n'a pas de numéro WhatsApp.")
      return
    }
    const body = reply.trim()
    if (!body) {
      setError("Indiquez une réponse.")
      return
    }
    if (body.length > 2000) {
      setError("La réponse est limitée à 2 000 caractères.")
      return
    }
    setBusy(true)
    setError("")
    setNotice("")
    const result = await replyToMessage(row.id, body, channel)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(channel === "email" ? "Réponse envoyée par courriel et enregistrée." : "Réponse WhatsApp enregistrée dans l'historique.")
    setReply("")
    setReplyOpen(false)
    onReplied?.(result.data)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4" role="presentation" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="form-save-card grid max-h-[90vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-panel bg-panel p-5 shadow-panel sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className="text-section text-heading">
              {row.subject || "Message"}
            </h3>
            <p className="mt-1 text-muted">
              {row.name} · {formatWhen(row.created_at)}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-violet"
            aria-label="Fermer"
            disabled={busy}
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="rounded-control border border-line bg-canvas px-3 py-2 text-heading">
          <p className="text-meta font-semibold text-muted">Contact conservé</p>
          <p className="mt-1">{contactLine(row)}</p>
          {row.email && row.whatsapp ? <p className="mt-1 text-muted">WhatsApp {row.whatsapp}</p> : null}
        </div>

        <section className="grid gap-3" aria-label="Discussion">
          <p className="font-semibold text-heading">Discussion</p>
          <article className="rounded-control border border-line bg-lavender/30 px-3 py-3">
            <p className="text-meta font-semibold text-violet">Visiteur · {row.name}</p>
            <p className="mt-1 whitespace-pre-wrap text-heading">{row.body}</p>
            <p className="mt-2 text-muted">{formatWhen(row.created_at)}</p>
          </article>
          {replies.map((item) => (
            <article key={item.id} className="rounded-control border border-violet/30 bg-panel px-3 py-3">
              <p className="text-meta font-semibold text-violet">
                Bibliothèque
                {item.actor_name ? ` · ${item.actor_name}` : ""}
                {item.channel_label ? ` · ${item.channel_label}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-heading">{item.body}</p>
              <p className="mt-2 text-muted">{formatWhen(item.created_at)}</p>
            </article>
          ))}
        </section>

        {related.length > 0 ? (
          <section className="grid gap-2" aria-label="Autres messages du même contact">
            <p className="font-semibold text-heading">Autres messages de ce contact</p>
            {related.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-control border border-line bg-canvas px-3 py-2 text-left"
                onClick={() => onSelectRelated?.(item)}
              >
                <span className="font-semibold text-heading">{item.subject || "Message"}</span>
                <span className="mt-1 block text-muted">
                  {formatWhen(item.created_at)}
                  {item.reply_count ? ` · ${item.reply_count} réponse${item.reply_count > 1 ? "s" : ""}` : ""}
                </span>
              </button>
            ))}
          </section>
        ) : null}

        {error ? <p role="alert" className="rounded-control border border-unavailable bg-unavailable-soft px-3 py-2 text-unavailable">{error}</p> : null}
        {notice ? <p role="status" className="rounded-control border border-available bg-available-soft px-3 py-2 text-available">{notice}</p> : null}

        {canReply && replyOpen ? (
          <form className="grid gap-3 rounded-control border border-line bg-canvas p-4" onSubmit={sendReply}>
            {canEmail && canWhatsapp ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`inline-flex min-h-10 items-center gap-2 rounded-control px-3 font-semibold ${replyChannel === "email" ? "bg-violet text-on-primary" : "border border-line bg-panel text-violet"}`}
                  onClick={() => setReplyChannel("email")}
                >
                  <Mail aria-hidden="true" size={16} />
                  Courriel
                </button>
                <button
                  type="button"
                  className={`inline-flex min-h-10 items-center gap-2 rounded-control px-3 font-semibold ${replyChannel === "whatsapp" ? "bg-violet text-on-primary" : "border border-line bg-panel text-violet"}`}
                  onClick={() => setReplyChannel("whatsapp")}
                >
                  <MessageCircle aria-hidden="true" size={16} />
                  WhatsApp
                </button>
              </div>
            ) : null}
            <label className="grid gap-1">
              <span className="font-semibold text-heading">
                {replyChannel === "whatsapp" && canWhatsapp
                  ? `Réponse WhatsApp à ${row.whatsapp}`
                  : `Réponse e-mail à ${row.email}`}
              </span>
              <textarea
                className="min-h-32 w-full rounded-control border border-line bg-panel px-3 py-2 text-heading"
                value={reply}
                maxLength={2000}
                required
                disabled={busy}
                placeholder={
                  replyChannel === "whatsapp" && canWhatsapp
                    ? "Texte de la réponse WhatsApp (enregistré dans l'historique)…"
                    : "Écrivez votre réponse…"
                }
                onChange={(event) => setReply(event.target.value)}
              />
              <span className="text-muted">{reply.trim().length}/2000</span>
            </label>
            {replyChannel === "whatsapp" && canWhatsapp ? (
              <p className="text-muted">
                Ouvrez WhatsApp via le lien du contact, envoyez le message, puis enregistrez-le ici pour garder l'historique.
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-control border border-line bg-panel px-4 font-semibold text-heading"
                disabled={busy}
                onClick={() => {
                  setReplyOpen(false)
                  setError("")
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary disabled:opacity-60"
                disabled={busy || !reply.trim()}
              >
                <Send aria-hidden="true" size={18} />
                {busy ? "Envoi…" : replyChannel === "whatsapp" && canWhatsapp ? "Enregistrer" : "Envoyer"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canReply && !replyOpen ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet px-4 font-semibold text-violet"
              onClick={() => {
                setReplyOpen(true)
                setNotice("")
                setError("")
              }}
            >
              {canEmail ? <Mail aria-hidden="true" size={18} /> : <MessageCircle aria-hidden="true" size={18} />}
              {canEmail ? "Répondre" : "Enregistrer une réponse WhatsApp"}
            </button>
          ) : null}
          {!canReply ? <p className="mr-auto text-muted">Aucun moyen de réponse enregistré.</p> : null}
          <button type="button" className="inline-flex min-h-11 items-center rounded-control bg-violet px-4 font-semibold text-on-primary" disabled={busy} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

/** Liste des messages visiteurs (onglet Alertes), avec lu / non lu et historique. */
export function VisitorMessagesPanel() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("toutes")
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)

  function applyPayload(data) {
    const list = Array.isArray(data?.results) ? data.results : []
    setRows(list)
    setUnreadMessages(Number(data?.unread_count) || list.filter((row) => !row.is_read).length)
  }

  useEffect(() => {
    let active = true
    listMessages().then((result) => {
      if (!active) return
      if (!result.ok) {
        setError(result.error)
        setRows([])
        setUnreadMessages(0)
        return
      }
      setError("")
      applyPayload(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  const unread = useMemo(() => (rows || []).filter((row) => !row.is_read).length, [rows])
  const visible = useMemo(() => {
    if (!rows) return []
    const words = normalizeSearch(query)
      .split(/[\s,;]+/)
      .filter(Boolean)
    return rows.filter((row) => {
      if (filter === "non-lues" && row.is_read) return false
      if (filter === "lues" && !row.is_read) return false
      if (filter === "repondues" && !(Number(row.reply_count) > 0)) return false
      if (words.length === 0) return true
      const haystack = messageSearchText(row)
      return words.every((word) => haystack.includes(word))
    })
  }, [rows, filter, query])

  const selectedThread = useMemo(() => {
    if (!selected || !rows) return []
    const key = selected.contact_key
    if (!key) return [selected]
    return rows
      .filter((row) => row.contact_key === key)
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [rows, selected])

  async function openMessage(row) {
    setSelected(row)
    if (row.is_read || busy) return
    setBusy(true)
    const result = await markMessageRead(row.id)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setRows((current) =>
      (current || []).map((item) => (item.id === row.id ? { ...item, is_read: true } : item)),
    )
    setSelected((current) => (current?.id === row.id ? { ...current, is_read: true } : current))
    const remaining = Number(result.data?.unread_count)
    setUnreadMessages(Number.isFinite(remaining) ? remaining : Math.max(0, unread - 1))
  }

  function onReplied(data) {
    const updated = data?.message
    setRows((current) =>
      (current || []).map((item) => {
        if (updated && item.id === updated.id) return { ...item, ...updated, is_read: true }
        if (item.id === selected?.id) return { ...item, is_read: true }
        return item
      }),
    )
    setSelected((current) => {
      if (!current) return current
      if (updated && current.id === updated.id) return { ...current, ...updated, is_read: true }
      return { ...current, is_read: true }
    })
    const remaining = Number(data?.unread_count)
    if (Number.isFinite(remaining)) setUnreadMessages(remaining)
  }

  async function markAll() {
    if (busy || unread === 0) return
    setBusy(true)
    const result = await markAllMessagesRead()
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setRows((current) => (current || []).map((item) => ({ ...item, is_read: true })))
    setSelected((current) => (current ? { ...current, is_read: true } : current))
    setUnreadMessages(0)
  }

  if (error && !rows) {
    return (
      <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">
        {error}
      </p>
    )
  }
  if (!rows) return <p>Chargement…</p>

  const repliedCount = rows.filter((row) => Number(row.reply_count) > 0).length
  const tabs = [
    { id: "toutes", label: `Toutes (${rows.length})`, icon: Inbox },
    { id: "non-lues", label: `Non lues (${unread})`, icon: Mail },
    { id: "lues", label: `Lues (${rows.length - unread})`, icon: Check },
    { id: "repondues", label: `Répondues (${repliedCount})`, icon: MessageCircle },
  ]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const selectedFilter = filter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selectedFilter}
                className={`inline-flex min-h-11 items-center gap-2 rounded-control px-4 font-semibold ${selectedFilter ? "bg-violet text-on-primary" : "bg-lavender text-violet"}`}
                onClick={() => setFilter(tab.id)}
              >
                <Icon aria-hidden="true" size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 font-semibold text-violet disabled:opacity-60"
          onClick={markAll}
          disabled={busy || unread === 0}
        >
          <Check aria-hidden="true" size={18} />
          Marquer tout comme lu
        </button>
      </div>
      <label className="relative min-w-0">
        <span className="sr-only">Rechercher un message</span>
        <Search aria-hidden="true" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par nom, e-mail ou date (ex. 21/11/2026)…"
          className="w-full rounded-control border border-line bg-panel py-2.5 pr-3 pl-10"
        />
      </label>
      {error ? (
        <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-3 text-unavailable">
          {error}
        </p>
      ) : null}
      {visible.length === 0 ? (
        <p className="rounded-control bg-lavender px-4 py-8 text-center text-heading">
          {rows.length === 0
            ? "Aucun message pour le moment."
            : query.trim()
              ? "Aucun message ne correspond à cette recherche."
              : "Aucun message dans ce filtre."}
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((row) => (
            <article
              key={row.id}
              className={`rounded-panel border p-4 shadow-card ${row.is_read ? "border-line bg-panel" : "border-violet/40 bg-lavender/40"}`}
            >
              <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => openMessage(row)}>
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-heading">{row.subject || "Message"}</span>
                    {row.kind_label ? (
                      <span className="rounded-full bg-lavender px-2 py-0.5 text-meta font-semibold text-violet">{row.kind_label}</span>
                    ) : null}
                    {!row.is_read ? (
                      <span className="rounded-full bg-violet px-2 py-0.5 text-meta font-semibold text-on-primary">Non lu</span>
                    ) : null}
                    {Number(row.reply_count) > 0 ? (
                      <span className="rounded-full bg-available-soft px-2 py-0.5 text-meta font-semibold text-available">
                        {row.reply_count} réponse{Number(row.reply_count) > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-muted">
                    {row.name}
                    {row.email ? ` · ${row.email}` : row.whatsapp ? ` · WhatsApp ${row.whatsapp}` : ""}
                    {" · "}
                    {formatWhen(row.created_at)}
                  </span>
                </span>
                <span className="font-semibold text-violet">Lire</span>
              </button>
            </article>
          ))}
        </div>
      )}
      <p className="text-muted">
        {visible.length} affichée{visible.length > 1 ? "s" : ""}
        {unread > 0 ? ` · ${unread} non lue${unread > 1 ? "s" : ""}` : ""}
      </p>
      {selected ? (
        <MessageModal
          row={selected}
          thread={selectedThread}
          onClose={() => setSelected(null)}
          onReplied={onReplied}
          onSelectRelated={(item) => openMessage(item)}
        />
      ) : null}
    </div>
  )
}
