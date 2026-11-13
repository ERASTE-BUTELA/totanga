import { useState } from "react"
import { BadgeCheck, CalendarDays, Clock, KeyRound, Lock, ShieldCheck, UserRound, X } from "lucide-react"
import { Link } from "react-router"
import { useSession } from "../session/SessionContext.jsx"

const fieldClass = "w-full rounded-control border border-line bg-panel px-3"

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?"
}

function memberSince(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function lastConnection(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return `Aujourd'hui à ${time}`
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
  return `${day} à ${time}`
}

export function ProfilePage() {
  const session = useSession()
  const account = session.account
  const [name, setName] = useState(account?.name || "")
  const [notice, setNotice] = useState("")

  function reset() {
    setName(account?.name || "")
    setNotice("")
  }

  function save(event) {
    event.preventDefault()
    if (!name.trim()) {
      setNotice("Indiquez le nom complet.")
      return
    }
    setNotice("L'affichage est mis à jour sur cet écran. Le compte du serveur reste inchangé.")
  }

  if (!account) return <p>Chargement…</p>

  return (
    <form className="grid gap-4" onSubmit={save}>
      {notice ? <p role="status" className="rounded-panel border border-line bg-panel p-4 text-heading">{notice}</p> : null}
      <div className="grid items-start gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <article className="rounded-panel border border-line bg-panel p-5 text-center shadow-card">
          <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-violet text-page text-on-primary">
            {initials(account.name)}
          </span>
          <h2 className="mt-4 text-section text-heading">{account.name}</h2>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-lavender px-3 py-1 font-semibold text-violet">
            <BadgeCheck aria-hidden="true" size={16} />
            {account.role_label}
          </p>
          <p className="mt-4 flex items-center justify-center gap-2 text-heading">
            <UserRound aria-hidden="true" className="text-violet" size={18} />
            {account.username}
          </p>
          <dl className="mt-4 grid gap-3 text-left">
            <div className="flex items-start gap-2">
              <CalendarDays aria-hidden="true" className="mt-1 text-violet" size={18} />
              <div>
                <dt className="text-muted">Membre depuis</dt>
                <dd className="font-semibold text-heading">{memberSince(account.joined)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock aria-hidden="true" className="mt-1 text-violet" size={18} />
              <div>
                <dt className="text-muted">Dernière connexion</dt>
                <dd className="font-semibold text-heading">{lastConnection(account.last_login)}</dd>
              </div>
            </div>
          </dl>
        </article>
        <div className="grid gap-4">
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <UserRound aria-hidden="true" className="text-violet" size={22} />
              Informations personnelles
            </h2>
            <p className="mt-1 text-muted">Mettez à jour l'affichage de votre nom sur cet écran.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Nom complet *</span>
                <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="grid gap-1">
                <span className="font-semibold text-heading">Identifiant</span>
                <input className={`${fieldClass} bg-canvas`} value={account.username} readOnly />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="font-semibold text-heading">Fonction</span>
                <input className={`${fieldClass} bg-canvas`} value={account.role_label || "Sans rôle"} readOnly />
              </label>
            </div>
          </article>
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <ShieldCheck aria-hidden="true" className="text-violet" size={22} />
              Sécurité et accès
            </h2>
            <p className="mt-1 text-muted">Le mot de passe se change sur son écran dédié.</p>
            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3">
                <span className="flex items-center gap-3">
                  <Lock aria-hidden="true" className="text-violet" size={18} />
                  <span>
                    <span className="block font-semibold text-heading">Mot de passe</span>
                    <span className="text-muted">Modifier le mot de passe de ce compte.</span>
                  </span>
                </span>
                <Link to="/compte/mot-de-passe" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet px-4 font-semibold text-violet">
                  <KeyRound aria-hidden="true" size={18} />
                  Changer le mot de passe
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3">
                <span className="flex items-center gap-3">
                  <ShieldCheck aria-hidden="true" className="text-violet" size={18} />
                  <span>
                    <span className="block font-semibold text-heading">Session</span>
                    <span className="text-muted">La session se ferme après 30 minutes d'inactivité.</span>
                  </span>
                </span>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-available-soft px-3 font-semibold text-available">
                  Session en cours
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading" onClick={reset}>
          <X aria-hidden="true" size={18} />
          Annuler
        </button>
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary">
          Enregistrer les modifications
        </button>
      </div>
    </form>
  )
}
