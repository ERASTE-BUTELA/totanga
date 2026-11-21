import { useState } from "react"
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react"
import { Navigate, useLocation } from "react-router"
import { LOGIN_FAILED, SESSION_EXPIRED } from "../api/messages.js"
import { DASHBOARD_PATH } from "../lib/paths.js"
import { useTheme } from "../lib/useTheme.js"
import { useSession } from "../session/SessionContext.jsx"

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`

export function LoginPage() {
  useTheme()
  const session = useSession()
  const location = useLocation()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const passwordNotice = typeof location.state?.notice === "string" ? location.state.notice : ""

  if (session.status === "loading") {
    return <p className="px-6 py-10 text-heading">Chargement…</p>
  }
  // basename /admin → /admin/ (tableau de bord), jamais le site public
  if (session.account) return <Navigate to={DASHBOARD_PATH} replace />

  async function onSubmit(event) {
    event.preventDefault()
    setError("")
    setPending(true)
    const result = await session.signIn(username.trim(), password)
    setPending(false)
    if (result.error) setError(result.error)
  }

  const notice = error || (session.expired ? SESSION_EXPIRED : "")
  const unavailable = session.unavailable ? LOGIN_FAILED : ""

  return (
    <main className="min-h-dvh bg-lavender lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden text-on-bar lg:block">
        <img
          src={asset("images/bibliotheque.webp")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          data-theme-keep=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-dark/95 via-violet-dark/72 to-violet-dark/40" />
        <svg
          className="absolute top-0 right-0 h-full w-28 text-canvas"
          viewBox="0 0 120 800"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M120 0C28 110 28 690 120 800V0Z" fill="currentColor" />
          <path d="M118 0C30 110 30 690 118 800" fill="none" stroke="var(--color-gold-bright)" strokeWidth="8" />
        </svg>
        <div className="relative z-10 flex h-full max-w-2xl flex-col px-12 py-12 xl:px-16">
          <img
            src={asset("images/logo.png")}
            alt=""
            className="theme-logo h-20 w-auto self-start rounded-panel bg-panel px-3 py-2"
          />
          <div className="mt-5 h-1 w-16 rounded-full bg-gold-bright" />
          <h1 className="mt-10 text-page">Espace d'administration</h1>
          <p className="mt-4 max-w-md text-lead text-on-bar/85">
            Gérez le catalogue, les annonces, les publications, les événements et les paramètres de la bibliothèque.
          </p>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-[32rem] rounded-[1.75rem] bg-panel px-6 py-8 shadow-panel sm:px-10 sm:py-10">
          <div className="mb-8 flex justify-center">
            <img
              src={asset("images/logo.png")}
              alt="Bibliothèque Totanga, Sœurs des pauvres de Bergame"
              className="theme-logo h-24 w-auto"
            />
          </div>
          <h1 className="text-center text-section text-heading lg:hidden">Espace d'administration</h1>
          <h2 className="text-section text-heading">Connexion à l'espace d'administration</h2>
          <p className="mt-2 text-muted">Accédez à votre tableau de bord pour gérer la bibliothèque.</p>

          <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate={false}>
            {passwordNotice && !notice ? (
              <p role="status" className="rounded-control border border-available bg-available-soft px-3 py-3 text-available">
                {passwordNotice}
              </p>
            ) : null}
            {notice ? (
              <p role="alert" className="rounded-control bg-unavailable-soft px-3 py-3 text-unavailable">
                {notice}
              </p>
            ) : null}
            {unavailable && !notice ? (
              <p role="alert" className="rounded-control bg-unavailable-soft px-3 py-3 text-unavailable">
                {unavailable}
              </p>
            ) : null}

            <label className="grid gap-2 font-semibold text-violet" htmlFor="username">
              <span className="flex items-center gap-2">
                <UserRound aria-hidden="true" size={20} />
                Nom d'utilisateur ou e-mail
                <abbr className="no-underline" title="obligatoire">*</abbr>
              </span>
              <span className="relative block font-normal text-ink">
                <UserRound aria-hidden="true" size={20} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-control border border-line bg-panel pr-3 pl-11"
                />
              </span>
            </label>

            <label className="grid gap-2 font-semibold text-violet" htmlFor="password">
              <span className="flex items-center gap-2">
                <LockKeyhole aria-hidden="true" size={20} />
                Mot de passe
                <abbr className="no-underline" title="obligatoire">*</abbr>
              </span>
              <span className="relative block font-normal text-ink">
                <LockKeyhole aria-hidden="true" size={20} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-control border border-line bg-panel pr-14 pl-11"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-1 flex w-11 -translate-y-1/2 items-center justify-center text-muted"
                  aria-pressed={visible}
                  aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setVisible((current) => !current)}
                >
                  {visible ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
                </button>
              </span>
            </label>

            <label className="flex min-h-11 items-center gap-3 font-semibold text-heading">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="size-5 accent-violet"
              />
              Se souvenir de moi
            </label>

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-control bg-violet font-semibold text-on-primary disabled:opacity-70"
            >
              <ArrowRight aria-hidden="true" size={20} />
              {pending ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
