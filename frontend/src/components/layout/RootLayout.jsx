import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router"
import { getLibraryInfo, recordSiteVisit } from "../../api/client.js"
import { setSiteFavicon } from "../../lib/favicon.js"
import { MaintenancePage } from "../../pages/MaintenancePage.jsx"
import { SiteFooter } from "./SiteFooter.jsx"
import { SiteHeader } from "./SiteHeader.jsx"

const MAINTENANCE_POLL_MS = 20_000

export function RootLayout() {
  const [library, setLibrary] = useState(null)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  const location = useLocation()
  const wide = location.pathname === "/" || location.pathname.startsWith("/catalogue") || location.pathname.startsWith("/annonces") || location.pathname.startsWith("/publications") || location.pathname.startsWith("/evenements") || location.pathname.startsWith("/a-propos")

  useEffect(() => {
    if (location.hash) return
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [location.pathname, location.hash])

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await getLibraryInfo()
        if (!active) return
        setLibrary(data)
        setError("")
      } catch (cause) {
        if (!active) return
        setError(cause.message)
      } finally {
        if (active) setReady(true)
      }
    }

    load()
    const timer = window.setInterval(load, MAINTENANCE_POLL_MS)

    function onVisible() {
      if (document.visibilityState === "visible") load()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [location.pathname])

  useEffect(() => {
    setSiteFavicon(library?.logo)
  }, [library?.logo])

  useEffect(() => {
    if (!ready || library?.maintenance) return undefined
    recordSiteVisit(location.pathname)
    return undefined
  }, [ready, library?.maintenance, location.pathname])

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <p className="text-muted">Chargement…</p>
      </div>
    )
  }

  if (library?.maintenance) {
    return <MaintenancePage library={library} />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main
        id="contenu"
        tabIndex={-1}
        className={wide ? "w-full flex-1" : "mx-auto w-full max-w-6xl flex-1 px-4 py-8"}
      >
        <Outlet context={{ library }} />
      </main>
      <SiteFooter library={library} error={error} />
    </div>
  )
}
