import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router"
import { getLibraryInfo } from "../../api/client.js"
import { SiteFooter } from "./SiteFooter.jsx"
import { SiteHeader } from "./SiteHeader.jsx"

export function RootLayout() {
  const [library, setLibrary] = useState(null)
  const [error, setError] = useState("")

  const location = useLocation()
  const wide = location.pathname === "/" || location.pathname.startsWith("/catalogue") || location.pathname.startsWith("/annonces") || location.pathname.startsWith("/publications") || location.pathname.startsWith("/evenements") || location.pathname.startsWith("/a-propos")

  useEffect(() => {
    let active = true
    getLibraryInfo()
      .then((data) => {
        if (active) setLibrary(data)
      })
      .catch((cause) => {
        if (active) setError(cause.message)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main
        id="contenu"
        tabIndex={-1}
        className={wide ? "w-full flex-1" : "mx-auto w-full max-w-6xl flex-1 px-4 py-8"}
      >
        <Outlet />
      </main>
      <SiteFooter library={library} error={error} />
    </div>
  )
}
