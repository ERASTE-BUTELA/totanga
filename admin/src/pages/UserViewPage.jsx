import { useEffect, useState } from "react"
import { ArrowLeft, Copy, KeyRound } from "lucide-react"
import { Link, useParams } from "react-router"
import { listStaff, resetStaffPassword } from "../api/staff.js"
import { ConfirmModal } from "../components/ConfirmModal.jsx"
import { canOpen } from "../nav/entries.js"
import { useSession } from "../session/SessionContext.jsx"
import { roleOf } from "./staffRoles.js"

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
  const rows = [
    ["Nom", person.name],
    ["Identifiant", person.username],
    ["Rôle", role.label],
    ["Statut", person.active ? "Actif" : "Suspendu"],
  ]

  return (
    <article className="grid max-w-xl gap-4 rounded-panel border border-line bg-panel p-5 shadow-card">
      <h2 className="text-section text-heading">{person.name}</h2>
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-3 text-unavailable">{error}</p> : null}
      {notice ? <p role="status" className="rounded-panel border border-available bg-available-soft p-3 text-available">{notice}</p> : null}
      <dl className="grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1">
            <dt className="font-semibold text-heading">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {password ? (
        <div className="rounded-panel border border-line bg-canvas p-4">
          <p className="font-semibold text-heading">Mot de passe généré</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              className="w-full max-w-sm rounded-control border border-line bg-panel px-3 font-semibold"
              readOnly
              value={password}
              autoComplete="off"
              spellCheck="false"
              aria-label="Mot de passe généré"
            />
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-violet" onClick={copyPassword}>
              <Copy aria-hidden="true" size={18} />
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 font-semibold text-violet">
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
    </article>
  )
}
