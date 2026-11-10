import { useLocation } from "react-router"
import { Breadcrumb } from "../components/layout/Breadcrumb.jsx"
import { PageHero } from "../components/layout/PageHero.jsx"
import { usePageTitle } from "../lib/usePageTitle.js"

const TITLES = {
  "/reglement": "Règlement intérieur",
  "/faq": "FAQ",
  "/mentions-legales": "Mentions légales",
  "/confidentialite": "Confidentialité",
  "/conditions": "Conditions d'utilisation",
}

export default function SimplePage() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || "Information"
  usePageTitle(title)

  return (
    <div className="space-y-8">
      <PageHero title={title} />
      <Breadcrumb items={[{ label: "Accueil", to: "/" }, { label: title }]} />
      <p className="max-w-3xl text-body text-ink">
        Cette page de démonstration sera remplacée par le texte de la bibliothèque.
      </p>
    </div>
  )
}
