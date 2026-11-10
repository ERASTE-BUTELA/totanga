export const PAGES = [
  { id: "dashboard", label: "Tableau de bord", to: "/", permission: null },
  { id: "books", label: "Livres", to: "/catalogue/livres", permission: "catalog.view_book", group: "Catalogue" },
  { id: "authors", label: "Auteurs", to: "/catalogue/auteurs", permission: "catalog.view_author", group: "Catalogue" },
  { id: "categories", label: "Catégories", to: "/catalogue/categories", permission: "catalog.view_category", group: "Catalogue" },
  { id: "announcements", label: "Annonces", to: "/annonces", permission: "announcements.view_announcement" },
  { id: "publications", label: "Publications", to: "/publications", permission: "posts.view_post" },
  { id: "events", label: "Événements", to: "/evenements", permission: "events.view_event" },
  { id: "users", label: "Utilisateurs et rôles", to: "/utilisateurs", permission: "accounts.view_user" },
  { id: "settings", label: "Paramètres", to: "/parametres", permission: "library_info.view_librarypage" },
]

export function canOpen(permissions, permission, role) {
  if (!permission) return true
  if (role === "administrateur" || role === "depannage") return true
  return permissions.includes(permission)
}

export function visibleNav(permissions, role) {
  const items = PAGES.filter((page) => canOpen(permissions, page.permission, role))
  const nav = []
  const groups = new Map()
  for (const page of items) {
    if (!page.group) {
      nav.push(page)
      continue
    }
    if (!groups.has(page.group)) {
      const group = { id: page.group, label: page.group, children: [] }
      groups.set(page.group, group)
      nav.push(group)
    }
    groups.get(page.group).children.push(page)
  }
  return nav
}
