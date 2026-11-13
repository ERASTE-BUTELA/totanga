import { Link } from "react-router"
import { usePageTitle } from "../lib/usePageTitle.js"

export default function NotFoundPage() {
  usePageTitle("Page introuvable")
  return (
    <section className="max-w-3xl">
      <p className="text-badge text-violet">Erreur 404</p>
      <h1 className="mt-2 text-page text-ink">Cette page n'existe pas</h1>
      <p className="mt-4 text-lead text-muted">
        L'adresse demandée ne correspond à aucune page de la bibliothèque.
      </p>
      <Link
        to="/"
        className="control mt-6 rounded-control bg-violet px-4 py-2 font-semibold text-on-primary"
      >
        Retour à l'accueil
      </Link>
    </section>
  )
}
