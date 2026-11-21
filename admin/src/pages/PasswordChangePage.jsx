import { useState } from "react"
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Save } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { changeOwnPassword } from "../api/session.js"
import { LOGIN_PATH } from "../lib/paths.js"
import { useSession } from "../session/SessionContext.jsx"

const fieldClass = "w-full rounded-control border border-line bg-panel px-3 pr-12"

function PasswordField({ id, label, value, onChange, autoComplete, visible, onToggle }) {
  return (
    <label className="grid gap-1">
      <span className="font-semibold text-heading">{label}</span>
      <span className="relative">
        <input
          id={id}
          className={fieldClass}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="absolute top-1/2 right-2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-violet"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          onClick={onToggle}
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </span>
    </label>
  )
}

export function PasswordChangePage() {
  const session = useSession()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function save(event) {
    event.preventDefault()
    if (pending) return
    setError("")
    if (newPassword !== confirmPassword) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.")
      return
    }
    if (newPassword === currentPassword) {
      setError("Le nouveau mot de passe doit être différent de l'ancien.")
      return
    }
    setPending(true)
    const result = await changeOwnPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    })
    if (!result.ok) {
      setPending(false)
      setError(result.error)
      return
    }
    // Le serveur a déjà fermé la session ; on aligne l'état local puis on renvoie à la connexion.
    await session.signOut()
    navigate(LOGIN_PATH, {
      replace: true,
      state: { notice: "Mot de passe modifié. Connectez-vous avec le nouveau mot de passe." },
    })
  }

  return (
    <form className="grid max-w-xl gap-4" onSubmit={save} autoComplete="off">
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <KeyRound aria-hidden="true" className="text-violet" size={22} />
          Changer le mot de passe
        </h2>
        <p className="mt-1 text-muted">
          Après l’enregistrement, vous serez déconnecté et devrez vous reconnecter avec le nouveau mot de passe.
        </p>
        <div className="mt-4 grid gap-4">
          <PasswordField
            id="ancien-mot-de-passe"
            label="Ancien mot de passe *"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            visible={showCurrent}
            onToggle={() => setShowCurrent((value) => !value)}
          />
          <PasswordField
            id="nouveau-mot-de-passe"
            label="Nouveau mot de passe *"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            visible={showNew}
            onToggle={() => setShowNew((value) => !value)}
          />
          <PasswordField
            id="confirmation-mot-de-passe"
            label="Confirmer le nouveau mot de passe *"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            visible={showConfirm}
            onToggle={() => setShowConfirm((value) => !value)}
          />
        </div>
        <p className="mt-4 flex items-start gap-2 text-muted">
          <Lock aria-hidden="true" className="mt-1 shrink-0 text-violet" size={18} />
          <span>Le mot de passe doit être suffisamment long et complexe. Il n’est jamais affiché ni journalisé.</span>
        </p>
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/compte/profil" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour au profil
        </Link>
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary disabled:opacity-60" disabled={pending}>
          <Save aria-hidden="true" size={18} />
          {pending ? "Enregistrement…" : "Enregistrer et se déconnecter"}
        </button>
      </div>
    </form>
  )
}
