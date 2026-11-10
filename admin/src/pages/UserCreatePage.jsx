import { useState } from "react"
import { ArrowLeft, Check, Copy, KeyRound, Save, UserRound } from "lucide-react"
import { Link } from "react-router"
import { createStaff } from "../api/staff.js"
import { STAFF_ROLES } from "./staffRoles.js"

const fieldClass = "w-full rounded-control border border-line bg-white px-3"
const ROLES = STAFF_ROLES.filter((role) => role.code !== "depannage")

export function UserCreatePage() {
  const [username, setUsername] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [role, setRole] = useState("bibliothecaire")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  async function save(event) {
    event.preventDefault()
    if (pending) return
    setError("")
    setPending(true)
    const result = await createStaff({
      username: username.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role,
    })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setCreated(result.data)
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(created.password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (created) {
    return (
      <section className="grid gap-4">
        <article className="rounded-panel border border-line bg-white p-5 shadow-card" aria-live="polite">
          <h2 className="flex items-center gap-2 text-section text-heading">
            <Check aria-hidden="true" className="text-available" size={24} />
            Compte créé
          </h2>
          <p className="mt-3 text-heading">
            {created.name} peut se connecter avec l'identifiant <strong>{created.username}</strong>.
          </p>
          <p className="mt-2 text-heading">
            Notez le mot de passe maintenant. Il n'est pas écrit dans le journal et ne sera plus affiché.
          </p>
          <label className="mt-4 grid gap-1">
            <span className="font-semibold text-heading">Mot de passe généré</span>
            <span className="flex flex-wrap gap-2">
              <input
                className={`${fieldClass} max-w-xl font-semibold`}
                readOnly
                value={created.password}
                autoComplete="off"
                spellCheck="false"
                aria-label="Mot de passe généré"
              />
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-violet"
                onClick={copyPassword}
              >
                <Copy aria-hidden="true" size={18} />
                {copied ? "Copié" : "Copier"}
              </button>
            </span>
          </label>
        </article>
        <div>
          <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
            <ArrowLeft aria-hidden="true" size={18} />
            Retour à la liste
          </Link>
        </div>
      </section>
    )
  }

  return (
    <form className="grid gap-4" onSubmit={save} autoComplete="off">
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      <article className="rounded-panel border border-line bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <UserRound aria-hidden="true" className="text-violet" size={24} />
          Nouveau compte du personnel
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Prénom *</span>
            <input className={fieldClass} value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoComplete="off" />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Nom *</span>
            <input className={fieldClass} value={lastName} onChange={(event) => setLastName(event.target.value)} required autoComplete="off" />
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Identifiant *</span>
            <input className={fieldClass} value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="off" spellCheck="false" />
            <span className="text-muted">Lettres, chiffres et les signes . @ + - _. Il sert à se connecter.</span>
          </label>
          <label className="grid gap-1">
            <span className="font-semibold text-heading">Rôle *</span>
            <select className={fieldClass} value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLES.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 flex items-start gap-2 text-heading">
          <KeyRound aria-hidden="true" className="mt-1 shrink-0 text-violet" size={18} />
          <span>Le mot de passe est généré automatiquement. Il s'affiche une seule fois après l'enregistrement.</span>
        </p>
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white" disabled={pending}>
          <Save aria-hidden="true" size={18} />
          {pending ? "Enregistrement…" : "Créer le compte"}
        </button>
      </div>
    </form>
  )
}
