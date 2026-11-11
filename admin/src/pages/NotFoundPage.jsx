import { Link } from "react-router"
import { DASHBOARD_PATH, LOGIN_PATH } from "../lib/paths.js"
import { useSession } from "../session/SessionContext.jsx"

export function NotFoundPage() {
  const session = useSession()
  const home = session.account ? DASHBOARD_PATH : LOGIN_PATH
  const label = session.account ? "Retour au tableau de bord" : "Aller à la connexion"
  return (
    <section className="rounded-panel border border-line bg-white p-6 shadow-card">
      <h1 className="text-page text-heading">Introuvable</h1>
      <p className="mt-3 text-muted">Cette page n'existe pas.</p>
      <Link to={home} className="mt-6 inline-flex min-h-11 items-center font-semibold text-violet">
        {label}
      </Link>
    </section>
  )
}
