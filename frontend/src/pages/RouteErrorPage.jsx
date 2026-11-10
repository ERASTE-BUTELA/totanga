import { Link } from "react-router"
import { usePageTitle } from "../lib/usePageTitle.js"

export default function RouteErrorPage() {
  usePageTitle("Erreur")
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4">
      <h1 className="text-page text-ink">Le contenu ne peut pas être affiché</h1>
      <p className="mt-4 text-lead text-muted">Réessayez plus tard.</p>
      <Link to="/" className="control mt-6 w-fit rounded-control bg-violet px-4 py-2 font-semibold text-white">
        Retour à l'accueil
      </Link>
    </div>
  )
}
