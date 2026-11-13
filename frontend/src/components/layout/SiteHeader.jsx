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

function linkClass(isActive) {
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

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-panel">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-8 lg:px-14">
        <NavLink to="/" end className="col-start-1 shrink-0 rounded-control" onClick={() => setOpen(false)}>
          <img src="/images/logo.png" alt="Bibliothèque Totanga, Sœurs des pauvres de Bergame" className="theme-logo h-12 w-auto" />
        </NavLink>
        <nav
          id="navigation-principale"
          aria-label="Navigation principale"
          className={
            open
              ? "absolute left-0 right-0 top-full z-40 flex flex-col gap-1 border-b border-line bg-panel px-4 py-3 xl:static xl:z-auto xl:col-start-2 xl:flex xl:flex-row xl:flex-wrap xl:items-center xl:justify-center xl:border-0 xl:bg-transparent xl:p-0"
              : "col-start-2 hidden min-w-0 flex-wrap items-center justify-center xl:flex"
          }
        >
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => linkClass(isActive)}
              onClick={() => setOpen(false)}
            >
              <link.icon className="h-5 w-5" aria-hidden="true" />
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
            className="control rounded-xl border border-line text-ink xl:hidden"
            aria-expanded={open}
            aria-controls="navigation-principale"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}
