import { useEffect, useState } from "react"
import { ArrowLeft, CalendarDays, Check, Copy, KeyRound, Shield, UserRound, UserRoundCheck, UserRoundX } from "lucide-react"
import { Link, useParams } from "react-router"
import { listStaff, resetStaffPassword } from "../api/staff.js"
import { ConfirmModal } from "../components/ConfirmModal.jsx"
import { canOpen } from "../nav/entries.js"
import { useSession } from "../session/SessionContext.jsx"
import { roleOf } from "./staffRoles.js"

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "?"
}

function joined(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export function UserViewPage() {
  const { userId } = useParams()
  const session = useSession()
  const canReset = canOpen(session.account?.permissions ?? [], "accounts.change_user", session.account?.role)
  const [person, setPerson] = useState(undefined)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    listStaff().then((result) => {
      if (!active) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPerson(result.data.find((item) => String(item.id) === String(userId)) || null)
    })
    return () => {
      active = false
    }
  }, [userId])

  async function confirmReset() {
    if (!person || busy) return
    setBusy(true)
    setError("")
    setNotice("")
    const result = await resetStaffPassword(person.id)
    setBusy(false)
    setConfirmOpen(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPassword(result.data.password)
    setCopied(false)
    setNotice("Nouveau mot de passe généré. Notez-le maintenant : il ne sera plus affiché.")
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (error && person === undefined) {
    return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  }
  if (person === undefined) return <p>Chargement…</p>
  if (!person) {
    return (
      <section className="rounded-panel border border-line bg-panel p-6 shadow-card">
        <p>Ce compte n'existe pas.</p>
        <Link to="/utilisateurs" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">Retour à la liste</Link>
      </section>
    )
  }

  const role = roleOf(person.role)
  const StatusIcon = person.active ? UserRoundCheck : UserRoundX

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        {canReset ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary"
            onClick={() => setConfirmOpen(true)}
          >
            <KeyRound aria-hidden="true" size={18} />
            Réinitialiser le mot de passe
          </button>
        ) : null}
      </div>

      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      {notice ? <p role="status" className="rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <article className="rounded-panel border border-line bg-panel p-5 text-center shadow-card">
          <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-violet text-page text-on-primary">
            {initials(person.name)}
          </span>
          <h1 className="mt-4 text-section text-heading">{person.name}</h1>
          <p className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${role.chip}`}>
            <Shield aria-hidden="true" size={16} />
            {role.label}
          </p>
          <p
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
              person.active ? "bg-available-soft text-available" : "bg-warning-soft text-warning"
            }`}
          >
            <StatusIcon aria-hidden="true" size={16} />
            {person.active ? "Actif" : "Suspendu"}
          </p>
          <p className="mt-4 flex items-center justify-center gap-2 text-heading">
            <UserRound aria-hidden="true" className="text-violet" size={18} />
            {person.username}
          </p>
          <dl className="mt-4 grid gap-3 text-left">
            <div className="flex items-start gap-2">
              <CalendarDays aria-hidden="true" className="mt-1 shrink-0 text-violet" size={18} />
              <div>
                <dt className="text-muted">Membre depuis</dt>
                <dd className="font-semibold text-heading">{joined(person.joined)}</dd>
              </div>
            </div>
          </dl>
        </article>

        <div className="grid gap-4">
          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <UserRound aria-hidden="true" className="text-violet" size={22} />
              Informations du compte
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-control border border-line bg-canvas px-4 py-3">
                <dt className="text-muted">Nom complet</dt>
                <dd className="mt-1 font-semibold text-heading">{person.name}</dd>
              </div>
              <div className="rounded-control border border-line bg-canvas px-4 py-3">
                <dt className="text-muted">Identifiant</dt>
                <dd className="mt-1 font-semibold text-heading">{person.username}</dd>
              </div>
              <div className="rounded-control border border-line bg-canvas px-4 py-3">
                <dt className="text-muted">Rôle</dt>
                <dd className="mt-1">
                  <span className={`inline-flex rounded-full px-3 py-1 font-semibold ${role.chip}`}>{role.label}</span>
                </dd>
              </div>
              <div className="rounded-control border border-line bg-canvas px-4 py-3">
                <dt className="text-muted">Statut</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 font-semibold ${
                      person.active ? "bg-available-soft text-available" : "bg-warning-soft text-warning"
                    }`}
                  >
                    {person.active ? "Actif" : "Suspendu"}
                  </span>
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <Shield aria-hidden="true" className="text-violet" size={22} />
              Permissions du rôle
            </h2>
            <p className="mt-1 text-muted">Droits associés au rôle « {role.label} ».</p>
            <ul className="mt-4 grid gap-3">
              {role.permissions.map((item) => (
                <li key={item} className="flex gap-2 text-heading">
                  <Check aria-hidden="true" className="mt-1 shrink-0 text-available" size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          {canReset ? (
            <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-section text-heading">
                <KeyRound aria-hidden="true" className="text-violet" size={22} />
                Sécurité
              </h2>
              <p className="mt-1 text-muted">Seul un administrateur peut générer un nouveau mot de passe. Il s’affiche une seule fois.</p>
              {password ? (
                <div className="mt-4 rounded-control border border-available bg-available-soft p-4">
                  <p className="font-semibold text-available">Mot de passe généré</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      className="min-h-11 w-full max-w-md rounded-control border border-line bg-panel px-3 font-semibold text-heading"
                      readOnly
                      value={password}
                      autoComplete="off"
                      spellCheck="false"
                      aria-label="Mot de passe généré"
                    />
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-violet"
                      onClick={copyPassword}
                    >
                      <Copy aria-hidden="true" size={18} />
                      {copied ? "Copié" : "Copier"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3">
                  <span>
                    <span className="block font-semibold text-heading">Mot de passe</span>
                    <span className="text-muted">Généré automatiquement, jamais affiché ensuite.</span>
                  </span>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet px-4 font-semibold text-violet"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <KeyRound aria-hidden="true" size={18} />
                    Réinitialiser
                  </button>
                </div>
              )}
            </article>
          ) : null}
        </div>
      </div>

      {confirmOpen ? (
        <ConfirmModal
          title="Réinitialiser le mot de passe"
          message={`Générer un nouveau mot de passe pour « ${person.name} » ? L'ancien ne fonctionnera plus. Le nouveau s'affiche une seule fois.`}
          confirmLabel="Générer"
          busy={busy}
          onClose={() => !busy && setConfirmOpen(false)}
          onConfirm={confirmReset}
        />
      ) : null}
    </section>
  )
}
