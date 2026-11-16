import { useEffect, useId, useRef, useState } from "react"
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleQuestionMark,
  FileText,
  LayoutDashboard,
  Library,
  Lock,
  LogOut,
  Megaphone,
  ScrollText,
  Settings,
  SlidersHorizontal,
  Tag,
  User,
  Users,
  Wrench,
} from "lucide-react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { listMessages } from "../api/content.js"
import { getLibrarySettings, setMaintenanceMode } from "../api/settings.js"
import { subscribeAlerts, setUnreadMessages } from "../lib/alertsStore.js"
import { LOGIN_PATH, normalizeAdminPath } from "../lib/paths.js"
import { canOpen, PAGES, visibleNav } from "../nav/entries.js"
import { ThemeSelector } from "./ThemeSelector.jsx"
import { useTheme } from "../lib/useTheme.js"
import { useSession } from "../session/SessionContext.jsx"

const SUBTITLES = {
  "/": "Vue d'ensemble des activités de la bibliothèque",
  "/catalogue/livres": "Gérez le catalogue des livres de la bibliothèque.",
  "/catalogue/auteurs": "Gérez les auteurs du catalogue de la bibliothèque.",
  "/catalogue/editeurs": "Gérez les maisons d'édition du catalogue.",
  "/catalogue/categories": "Gérez les catégories de classification des livres.",
  "/annonces": "Gérez les annonces de la bibliothèque (avis, nouveautés, horaires, informations importantes, etc.).",
  "/publications": "Gérez les publications de la bibliothèque.",
  "/evenements": "Gérez les événements, ateliers, conférences et activités de la bibliothèque.",
  "/utilisateurs": "Gérez les comptes du personnel, leurs rôles et leurs permissions.",
  "/journal": "Actions du personnel et statistiques de fréquentation.",
  "/parametres": "Configurez la bibliothèque, ses fonctionnalités et son fonctionnement.",
  "/compte/profil": "Consultez et mettez à jour vos informations personnelles.",
  "/compte/mot-de-passe": "Compte du personnel",
  "/compte/preferences": "Personnalisez votre expérience d'utilisation.",
  "/compte/notifications": "Notifications système et messages des visiteurs.",
  "/compte/aide": "Compte du personnel",
}

const ACCOUNT_TITLES = {
  "/compte/profil": "Mon profil",
  "/compte/mot-de-passe": "Changer le mot de passe",
  "/compte/preferences": "Préférences",
  "/compte/notifications": "Alertes",
  "/compte/aide": "Aide et support",
}

const ACCOUNT_LINKS = [
  [
    { to: "/compte/profil", label: "Mon profil", icon: User },
    { to: "/compte/mot-de-passe", label: "Changer le mot de passe", icon: Lock },
    { to: "/compte/preferences", label: "Préférences", icon: SlidersHorizontal },
  ],
  [
    { to: "/compte/notifications", label: "Alertes", icon: Bell },
    { to: "/compte/aide", label: "Aide et support", icon: CircleQuestionMark },
  ],
]

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?"
}

const ICONS = {
  dashboard: LayoutDashboard,
  Catalogue: Library,
  announcements: Megaphone,
  publications: FileText,
  events: CalendarDays,
  users: Users,
  journal: ScrollText,
  settings: Settings,
}

const CHILD_ICONS = {
  books: BookOpen,
  authors: Users,
  publishers: Building2,
  categories: Tag,
}

const HOME = { label: "Tableau de bord", to: "/" }

function crumb(label, to) {
  return to ? { label, to } : { label }
}

function trailFor(pathname) {
  const catalog = crumb("Catalogue")
  const books = crumb("Livres", "/catalogue/livres")
  const authors = crumb("Auteurs", "/catalogue/auteurs")
  const publishers = crumb("Éditeurs", "/catalogue/editeurs")
  const categories = crumb("Catégories", "/catalogue/categories")
  const announcements = crumb("Annonces", "/annonces")
  const publications = crumb("Publications", "/publications")
  const events = crumb("Événements", "/evenements")
  const users = crumb("Utilisateurs et rôles", "/utilisateurs")
  const account = crumb("Mon compte", "/compte/profil")

  const exact = {
    "/": { items: [crumb("Tableau de bord")], subtitle: SUBTITLES["/"] },
    "/catalogue/livres": { items: [HOME, catalog, crumb("Livres")], subtitle: SUBTITLES["/catalogue/livres"] },
    "/catalogue/auteurs": { items: [HOME, catalog, crumb("Auteurs")], subtitle: SUBTITLES["/catalogue/auteurs"] },
    "/catalogue/editeurs": { items: [HOME, catalog, crumb("Éditeurs")], subtitle: SUBTITLES["/catalogue/editeurs"] },
    "/catalogue/categories": { items: [HOME, catalog, crumb("Catégories")], subtitle: SUBTITLES["/catalogue/categories"] },
    "/catalogue/livres/nouveau": { items: [HOME, catalog, books, crumb("Nouveau livre")], subtitle: "Ajoutez un livre et ses exemplaires." },
    "/catalogue/auteurs/nouveau": { items: [HOME, catalog, authors, crumb("Nouvel auteur")], subtitle: "Ajoutez un auteur au catalogue." },
    "/catalogue/editeurs/nouveau": { items: [HOME, catalog, publishers, crumb("Nouvel éditeur")], subtitle: "Ajoutez une maison d'édition au catalogue." },
    "/catalogue/categories/nouveau": { items: [HOME, catalog, categories, crumb("Nouvelle catégorie")], subtitle: "Ajoutez une catégorie de classification." },
    "/annonces": { items: [HOME, crumb("Annonces")], subtitle: SUBTITLES["/annonces"] },
    "/publications": { items: [HOME, crumb("Publications")], subtitle: SUBTITLES["/publications"] },
    "/evenements": { items: [HOME, crumb("Événements")], subtitle: SUBTITLES["/evenements"] },
    "/utilisateurs": { items: [HOME, crumb("Utilisateurs et rôles")], subtitle: SUBTITLES["/utilisateurs"] },
    "/utilisateurs/nouveau": { items: [HOME, users, crumb("Nouvel utilisateur")], subtitle: "Créez un compte du personnel. Le mot de passe est généré automatiquement." },
    "/utilisateurs/roles": { items: [HOME, users, crumb("Rôles et permissions")], subtitle: "Définissez les rôles et gérez les permissions d'accès au système." },
    "/journal": { items: [HOME, crumb("Journal")], subtitle: SUBTITLES["/journal"] },
    "/parametres": { items: [HOME, crumb("Paramètres")], subtitle: SUBTITLES["/parametres"] },
    "/compte/profil": { items: [HOME, account, crumb("Mon profil")], subtitle: SUBTITLES["/compte/profil"] },
    "/compte/mot-de-passe": { items: [HOME, account, crumb("Changer le mot de passe")], subtitle: SUBTITLES["/compte/mot-de-passe"] },
    "/compte/preferences": { items: [HOME, account, crumb("Préférences")], subtitle: SUBTITLES["/compte/preferences"] },
    "/compte/notifications": { items: [HOME, account, crumb("Alertes")], subtitle: SUBTITLES["/compte/notifications"] },
    "/compte/aide": { items: [HOME, account, crumb("Aide et support")], subtitle: SUBTITLES["/compte/aide"] },
    "/acces-refuse": { items: [HOME, crumb("Accès refusé")], subtitle: "" },
  }
  if (exact[pathname]) return exact[pathname]

  const rules = [
    [/^\/annonces\/nouveau$/, [HOME, announcements, crumb("Nouvelle annonce")], "Rédigez une annonce, puis publiez-la ou enregistrez un brouillon."],
    [/^\/annonces\/\d+\/modifier$/, [HOME, announcements, crumb("Modifier une annonce")], "Mettez à jour l'annonce, puis publiez-la ou enregistrez un brouillon."],
    [/^\/annonces\/\d+$/, [HOME, announcements, crumb("Voir une annonce")], "Fiche de l'annonce."],
    [/^\/publications\/nouveau$/, [HOME, publications, crumb("Nouvelle publication")], "Rédigez le contenu de la publication et ses informations."],
    [/^\/publications\/\d+\/modifier$/, [HOME, publications, crumb("Modifier une publication")], "Mettez à jour le contenu de la publication et ses informations."],
    [/^\/publications\/\d+$/, [HOME, publications, crumb("Voir une publication")], "Fiche de la publication."],
    [/^\/evenements\/nouveau$/, [HOME, events, crumb("Nouvel événement")], "Ajoutez un événement, un atelier ou une activité."],
    [/^\/evenements\/\d+\/modifier$/, [HOME, events, crumb("Modifier un événement")], "Mettez à jour cet événement."],
    [/^\/evenements\/\d+$/, [HOME, events, crumb("Voir un événement")], "Fiche de l'événement."],
    [/^\/utilisateurs\/\d+$/, [HOME, users, crumb("Voir un compte")], "Fiche du compte du personnel."],
    [/^\/catalogue\/livres\/\d+\/modifier$/, [HOME, catalog, books, crumb("Modifier un livre")], "Mettez à jour les informations du livre et ses exemplaires."],
    [/^\/catalogue\/livres\/\d+$/, [HOME, catalog, books, crumb("Voir un livre")], "Fiche du livre et de ses exemplaires."],
    [/^\/catalogue\/auteurs\/\d+\/modifier$/, [HOME, catalog, authors, crumb("Modifier un auteur")], "Mettez à jour cet auteur."],
    [/^\/catalogue\/auteurs\/\d+$/, [HOME, catalog, authors, crumb("Voir un auteur")], "Fiche de l'auteur."],
    [/^\/catalogue\/editeurs\/\d+\/modifier$/, [HOME, catalog, publishers, crumb("Modifier un éditeur")], "Mettez à jour cet éditeur."],
    [/^\/catalogue\/editeurs\/\d+$/, [HOME, catalog, publishers, crumb("Voir un éditeur")], "Fiche de l'éditeur."],
    [/^\/catalogue\/categories\/\d+\/modifier$/, [HOME, catalog, categories, crumb("Modifier une catégorie")], "Mettez à jour cette catégorie."],
    [/^\/catalogue\/categories\/\d+$/, [HOME, catalog, categories, crumb("Voir une catégorie")], "Fiche de la catégorie."],
  ]
  for (const [pattern, items, subtitle] of rules) {
    if (pattern.test(pathname)) return { items, subtitle }
  }
  return { items: [HOME, crumb(titleFallback(pathname))], subtitle: SUBTITLES[pathname] || "" }
}

function titleFallback(pathname) {
  return ACCOUNT_TITLES[pathname] || "Page"
}

function AdminBreadcrumb({ items }) {
  if (!items?.length) return null
  return (
    <nav aria-label="Fil d'Ariane" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1.5 text-body">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" /> : null}
              {item.to && !last ? (
                <Link to={item.to} className="truncate font-semibold text-violet hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={`truncate font-semibold ${last ? "text-heading" : "text-violet"}`}>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function itemClass(active) {
  return [
    "flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold",
    active ? "bg-gold-bright text-violet-dark" : "text-on-bar/90 hover:bg-panel/10",
  ].join(" ")
}

export function AdminShell() {
  useTheme()
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const menuId = useId()
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceBusy, setMaintenanceBusy] = useState(false)
  const [maintenanceError, setMaintenanceError] = useState("")
  const [alertsUnread, setAlertsUnread] = useState(0)
  const nav = visibleNav(session.account?.permissions ?? [], session.account?.role)
  const canToggleMaintenance = canOpen(
    session.account?.permissions ?? [],
    "library_info.change_library",
    session.account?.role,
  )
  const canViewMessages = canOpen(
    session.account?.permissions ?? [],
    "visitor_messages.view_visitormessage",
    session.account?.role,
  )

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => subscribeAlerts((snapshot) => setAlertsUnread(snapshot.total)), [])

  useEffect(() => {
    if (!canViewMessages) {
      setUnreadMessages(0)
      return undefined
    }
    let active = true
    async function refresh() {
      const result = await listMessages()
      if (!active || !result.ok) return
      setUnreadMessages(Number(result.data?.unread_count) || 0)
    }
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [canViewMessages, location.pathname, location.search])

  useEffect(() => {
    if (!canToggleMaintenance) return undefined
    let active = true
    getLibrarySettings().then((result) => {
      if (!active || !result.ok) return
      setMaintenance(Boolean(result.data?.maintenance))
    })
    return () => {
      active = false
    }
  }, [canToggleMaintenance])

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    function onPointer(event) {
      if (buttonRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  async function onLogout() {
    await session.signOut()
    navigate(LOGIN_PATH, { replace: true })
  }

  async function onToggleMaintenance() {
    if (!canToggleMaintenance || maintenanceBusy) return
    const next = !maintenance
    setMaintenanceBusy(true)
    setMaintenanceError("")
    const result = await setMaintenanceMode(next)
    setMaintenanceBusy(false)
    if (!result.ok) {
      setMaintenanceError(result.error)
      return
    }
    setMaintenance(Boolean(result.data?.maintenance))
  }

  const path = normalizeAdminPath(location.pathname)
  const page = PAGES.find((item) => item.to === path)
  const title = page?.label
    || ACCOUNT_TITLES[path]
    || (path === "/acces-refuse" ? "Accès refusé" : "")
    || "Introuvable"
  const trail = trailFor(path)
  const currentLabel = trail?.items?.[trail.items.length - 1]?.label || title

  return (
    <div className="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden">
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <div className="flex items-center bg-violet-dark px-4 py-4">
        <img
          src={`${import.meta.env.BASE_URL}images/logo.png`}
          alt="Bibliothèque Totanga, Sœurs des pauvres de Bergame"
          className="theme-logo h-16 w-auto rounded-control bg-panel px-2 py-1"
        />
      </div>
      <header className="flex items-center justify-between gap-4 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-8 w-1.5 shrink-0 rounded-full bg-gold-bright" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="sr-only">{currentLabel}</h1>
            <AdminBreadcrumb items={trail?.items} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NavLink
            to={alertsUnread > 0 && canViewMessages ? "/compte/notifications?onglet=messages" : "/compte/notifications"}
            aria-label={alertsUnread > 0 ? `Alertes, ${alertsUnread} non lue${alertsUnread > 1 ? "s" : ""}` : "Alertes"}
            className={({ isActive }) =>
              [
                "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-violet shadow-card",
                isActive ? "bg-lavender" : "bg-panel",
                alertsUnread > 0 ? "alerts-bell-pulse" : "",
              ].join(" ")
            }
          >
            <Bell aria-hidden="true" size={20} />
            {alertsUnread > 0 ? (
              <span className="alerts-badge absolute -top-1 -right-1 min-w-5 rounded-full bg-unavailable px-1 text-center text-meta font-bold text-on-primary">
                {alertsUnread > 99 ? "99+" : alertsUnread}
              </span>
            ) : null}
          </NavLink>
          <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            className="flex items-center gap-3 rounded-full border border-line bg-panel px-3 text-left shadow-card"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={menuId}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet text-on-primary">
              <User aria-hidden="true" size={18} />
            </span>
            <span>
              <span className="block font-semibold text-heading">{session.account.name}</span>
              <span className="block text-muted">{session.account.role_label}</span>
            </span>
            <ChevronDown aria-hidden="true" size={18} className={open ? "rotate-180" : ""} />
          </button>
          {open ? (
            <div
              ref={panelRef}
              className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-panel border border-line bg-panel shadow-panel"
            >
              <div className="flex items-center gap-3 border-b border-line px-4 py-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet text-on-primary font-bold">
                  {initials(session.account.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-heading">{session.account.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-0.5 font-semibold text-violet">
                    <BadgeCheck aria-hidden="true" size={14} />
                    {session.account.role_label}
                  </p>
                  <p className="mt-1 truncate text-muted">{session.account.username}</p>
                </div>
              </div>
              <div className="border-b border-line px-4 py-3">
                <p className="mb-2 text-meta font-semibold text-muted">Apparence</p>
                <ThemeSelector />
              </div>
              <div id={menuId} role="menu" className="grid p-2">
                {ACCOUNT_LINKS.map((group, index) => (
                  <div key={group[0].to} className={index > 0 ? "mt-1 border-t border-line pt-1" : ""}>
                    {group.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          role="menuitem"
                          to={item.to}
                          className="flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold text-heading hover:bg-lavender"
                          onClick={() => setOpen(false)}
                        >
                          <Icon aria-hidden="true" size={18} className="text-violet" />
                          {item.label}
                        </NavLink>
                      )
                    })}
                  </div>
                ))}
                {canToggleMaintenance ? (
                  <div className="mt-1 border-t border-line pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-3 rounded-control px-3 py-2 font-semibold text-heading hover:bg-lavender disabled:opacity-60"
                      disabled={maintenanceBusy}
                      onClick={onToggleMaintenance}
                    >
                      <Wrench aria-hidden="true" size={18} className="text-violet" />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block">Mode maintenance</span>
                        <span className="block text-muted font-normal">
                          {maintenanceBusy
                            ? "Enregistrement…"
                            : maintenance
                              ? "Site public coupé — cliquer pour rouvrir"
                              : "Site public ouvert — cliquer pour couper"}
                        </span>
                      </span>
                      <span
                        className={`relative h-7 w-12 shrink-0 rounded-full ${maintenance ? "bg-violet" : "bg-line"}`}
                        aria-hidden="true"
                      >
                        <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-panel ${maintenance ? "translate-x-5" : ""}`} />
                      </span>
                    </button>
                    {maintenanceError ? <p className="px-3 pb-2 text-unavailable" role="alert">{maintenanceError}</p> : null}
                  </div>
                ) : null}
                <div className="mt-1 border-t border-line pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-control px-3 font-semibold text-unavailable hover:bg-lavender"
                    onClick={onLogout}
                  >
                    <LogOut aria-hidden="true" size={18} />
                    Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      </header>
      <aside className="sidebar flex flex-col bg-violet-dark text-on-bar lg:min-h-0 lg:overflow-y-auto">
        <p className="px-5 pt-4 font-semibold tracking-wide text-on-bar/70">Espace d'administration</p>
        <nav aria-label="Administration" className="grid flex-1 content-start gap-1 px-3 py-3">
          {nav.map((entry) => {
            if (entry.children) {
              const Icon = ICONS[entry.id] ?? Library
              return (
                <div key={entry.id} className="grid gap-1">
                  <button
                    type="button"
                    className={`${itemClass(false)} w-full`}
                    aria-expanded={catalogueOpen}
                    onClick={() => setCatalogueOpen((current) => !current)}
                  >
                    <Icon aria-hidden="true" size={20} />
                    <span className="flex-1 text-left">{entry.label}</span>
                    <ChevronDown aria-hidden="true" size={18} className={catalogueOpen ? "rotate-180" : ""} />
                  </button>
                  {catalogueOpen ? (
                    <div className="relative ml-[1.375rem] grid gap-1 border-l border-white/40 py-1 pl-3">
                      {entry.children.map((child) => {
                        const ChildIcon = CHILD_ICONS[child.id] ?? BookOpen
                        return (
                          <NavLink
                            key={child.id}
                            to={child.to}
                            className={({ isActive }) => `relative ${itemClass(isActive)}`}
                          >
                            <span aria-hidden="true" className="absolute top-1/2 -left-3 h-px w-3 bg-panel/40" />
                            <ChildIcon aria-hidden="true" size={18} />
                            {child.label}
                          </NavLink>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            }
            const Icon = ICONS[entry.id] ?? LayoutDashboard
            return (
              <NavLink
                key={entry.id}
                to={entry.to}
                end={entry.to === "/"}
                className={({ isActive }) => itemClass(isActive)}
              >
                <Icon aria-hidden="true" size={20} />
                {entry.label}
              </NavLink>
            )
          })}
        </nav>
        <svg viewBox="0 0 76 48" aria-hidden="true" className="m-4 h-12 w-20 text-on-bar/20">
          <path fill="currentColor" d="M38 12c-8.5-4.2-18.2-5.2-30-2.2v26c11.2-2.6 21-1.4 30 3.2V12z" />
          <path fill="currentColor" d="M38 12c8.5-4.2 18.2-5.2 30-2.2v26c-11.2-2.6-21-1.4-30 3.2V12z" />
        </svg>
      </aside>
      <div id="contenu" className="bg-lavender px-4 py-4 sm:px-6 sm:pb-8 lg:min-h-0 lg:overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
