import { usePageTitle } from "../lib/usePageTitle.js"

export function MaintenancePage({ library }) {
  usePageTitle("Site en maintenance")
  const name = library?.name || "Bibliothèque Totanga"
  const logo = library?.logo || "/images/logo.png"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-violet px-4 text-center text-white">
      <img src={logo} alt="" className="h-20 w-auto rounded-2xl bg-white px-3 py-2" />
      <h1 className="mt-8 text-page">Site en maintenance</h1>
      <p className="mt-4 max-w-md text-lead text-white/90">
        {name} est temporairement indisponible. Merci de revenir un peu plus tard.
      </p>
    </div>
  )
}
