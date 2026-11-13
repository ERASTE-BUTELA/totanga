import { Link } from "react-router"
import { DASHBOARD_PATH } from "../lib/paths.js"

export function ForbiddenPage() {
  return (
    <section className="rounded-panel border border-line bg-panel p-6 shadow-card">
      <h1 className="text-page text-heading">Accès refusé</h1>
      <p className="mt-3 text-muted">Vous n'avez pas l'autorisation d'ouvrir cette page.</p>
      <Link to={DASHBOARD_PATH} className="mt-6 inline-flex min-h-11 items-center font-semibold text-violet">
        Retour au tableau de bord
      </Link>
    </section>
  )
}
