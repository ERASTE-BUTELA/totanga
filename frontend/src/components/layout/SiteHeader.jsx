import { useEffect, useState } from "react"
import { NavLink } from "react-router"
import { BookOpen, CalendarDays, House, Info, Megaphone, Menu, Newspaper, Search, X } from "lucide-react"
import { ThemeSelector } from "../ThemeSelector.jsx"

const LINKS = [
  { to: "/", label: "Accueil", end: true, icon: House },
  { to: "/catalogue", label: "Catalogue", icon: BookOpen },
  { to: "/annonces", label: "Annonces", icon: Megaphone },
  { to: "/publications", label: "Publications", icon: Newspaper },
  { to: "/evenements", label: "Événements", icon: CalendarDays },
  { to: "/a-propos", label: "À propos", icon: Info },
]

function linkClass(isActive, open) {
  if (open) {
    const base = "pointer-events-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-menu font-semibold"
    return isActive
      ? `${base} border-violet bg-lavender text-violet`
      : `${base} border-line bg-panel text-ink hover:border-violet hover:text-violet`
  }
  const base = "pointer-events-auto inline-flex items-center gap-2 border-b-2 px-2 py-2 text-center text-menu"
  return isActive
    ? `${base} border-violet text-violet`
    : `${base} border-transparent text-ink hover:text-violet`
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  useEffect(() => {
    function onResize() {
      if (window.matchMedia("(min-width: 1280px)").matches) setOpen(false)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-panel">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-8 sm:py-3 lg:px-14">
        <NavLink to="/" end className="col-start-1 min-w-0 shrink-0 rounded-control" onClick={() => setOpen(false)}>
          <img
            src="/images/logo.png"
            alt="Bibliothèque Totanga, Sœurs des pauvres de Bergame"
            className="theme-logo h-10 w-auto max-w-[11rem] sm:h-12 sm:max-w-none"
          />
        </NavLink>

        <nav
          id="navigation-principale"
          aria-label="Navigation principale"
          className="col-start-2 hidden min-w-0 flex-wrap items-center justify-center xl:flex"
        >
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => linkClass(isActive, false)}
            >
              <link.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="col-start-3 flex items-center gap-2">
          <ThemeSelector compact />
          <NavLink
            to="/catalogue"
            aria-label="Rechercher dans le catalogue"
            className="control hidden rounded-xl border border-line p-2.5 text-violet md:inline-flex"
            onClick={() => setOpen(false)}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </NavLink>
          <button
            type="button"
            className={`control rounded-xl border xl:hidden ${open ? "border-violet bg-lavender text-violet" : "border-line bg-panel text-ink"}`}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 xl:hidden" id="menu-mobile">
          <nav
            aria-label="Navigation mobile"
            className="border-b-2 border-line bg-panel-soft px-4 py-4 shadow-[0_16px_36px_rgb(28_16_48/0.2)] sm:px-8 lg:px-14"
          >
            <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
              {LINKS.map((link) => (
                <li key={link.to} className="min-w-0 sm:w-auto">
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => linkClass(isActive, true)}
                    onClick={() => setOpen(false)}
                  >
                    <link.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="h-[100dvh] w-full bg-scrim"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
        </div>
      ) : null}
    </header>
  )
}
