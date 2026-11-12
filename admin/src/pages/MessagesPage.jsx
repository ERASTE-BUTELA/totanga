import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, Inbox, Mail, X } from "lucide-react"
import { listMessages, markAllMessagesRead, markMessageRead } from "../api/content.js"
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

function MessageModal({ row, onClose }) {
  const titleId = useId()
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  if (!row) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(36_24_32_/_0.45)] p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="form-save-card grid w-full max-w-lg gap-4 rounded-panel bg-white p-5 shadow-panel sm:p-6"
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
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <p className="text-muted">Contact : {contactLine(row)}</p>
        <p className="whitespace-pre-wrap text-heading">{row.body}</p>
        <div className="flex justify-end">
          <button type="button" className="inline-flex min-h-11 items-center rounded-control bg-violet px-4 font-semibold text-white" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

/** Liste des messages visiteurs (onglet Alertes), avec lu / non lu. */
export function VisitorMessagesPanel() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState("toutes")
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
    if (filter === "non-lues") return rows.filter((row) => !row.is_read)
    if (filter === "lues") return rows.filter((row) => row.is_read)
    return rows
  }, [rows, filter])

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

  const tabs = [
    { id: "toutes", label: `Toutes (${rows.length})`, icon: Inbox },
    { id: "non-lues", label: `Non lues (${unread})`, icon: Mail },
    { id: "lues", label: `Lues (${rows.length - unread})`, icon: Check },
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
                className={`inline-flex min-h-11 items-center gap-2 rounded-control px-4 font-semibold ${selectedFilter ? "bg-violet text-white" : "bg-lavender text-violet"}`}
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
      {error ? (
        <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-3 text-unavailable">
          {error}
        </p>
      ) : null}
      {visible.length === 0 ? (
        <p className="rounded-control bg-lavender px-4 py-8 text-center text-heading">
          {rows.length === 0 ? "Aucun message pour le moment." : "Aucun message dans ce filtre."}
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((row) => (
            <article
              key={row.id}
              className={`rounded-panel border p-4 shadow-card ${row.is_read ? "border-line bg-white" : "border-violet/40 bg-lavender/40"}`}
            >
              <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => openMessage(row)}>
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-heading">{row.subject || "Message"}</span>
                    {!row.is_read ? (
                      <span className="rounded-full bg-violet px-2 py-0.5 text-meta font-semibold text-white">Non lu</span>
                    ) : null}
                  </span>
                  <span className="text-muted">
                    {row.name} · {formatWhen(row.created_at)}
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
      {selected ? <MessageModal row={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  )
}
