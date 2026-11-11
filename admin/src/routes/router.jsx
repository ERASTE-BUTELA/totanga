import { createBrowserRouter, useLocation } from "react-router"
import { AdminShell } from "../components/AdminShell.jsx"
import { RequireAuth } from "../components/RequireAuth.jsx"
import { ADMIN_BASENAME, normalizeAdminPath } from "../lib/paths.js"
import { canOpen, PAGES } from "../nav/entries.js"
import { AuthorFormPage } from "../pages/AuthorFormPage.jsx"
import { AnnouncementFormPage } from "../pages/AnnouncementFormPage.jsx"
import { AnnouncementsPage } from "../pages/AnnouncementsPage.jsx"
import { AuthorsPage } from "../pages/AuthorsPage.jsx"
import { BookFormPage } from "../pages/BookFormPage.jsx"
import { BooksPage } from "../pages/BooksPage.jsx"
import { CategoriesPage } from "../pages/CategoriesPage.jsx"
import { CategoryFormPage } from "../pages/CategoryFormPage.jsx"
import { DashboardPage } from "../pages/DashboardPage.jsx"
import { EventFormPage } from "../pages/EventFormPage.jsx"
import { EventsPage } from "../pages/EventsPage.jsx"
import { ForbiddenPage } from "../pages/ForbiddenPage.jsx"
import { JournalPage } from "../pages/JournalPage.jsx"
import { LoginPage } from "../pages/LoginPage.jsx"
import { MessagesPage } from "../pages/MessagesPage.jsx"
import { NotFoundPage } from "../pages/NotFoundPage.jsx"
import { NotificationsPage } from "../pages/NotificationsPage.jsx"
import { PreferencesPage } from "../pages/PreferencesPage.jsx"
import { ProfilePage } from "../pages/ProfilePage.jsx"
import { PublicationFormPage } from "../pages/PublicationFormPage.jsx"
import { PublicationsPage } from "../pages/PublicationsPage.jsx"
import { SettingsPage } from "../pages/SettingsPage.jsx"
import { SoonPage } from "../pages/SoonPage.jsx"
import { RolesPage } from "../pages/RolesPage.jsx"
import { UserCreatePage } from "../pages/UserCreatePage.jsx"
import { UsersPage } from "../pages/UsersPage.jsx"
import { UserViewPage } from "../pages/UserViewPage.jsx"
import { useSession } from "../session/SessionContext.jsx"

function Allowed({ permission, children }) {
  const session = useSession()
  if (!canOpen(session.account?.permissions ?? [], permission, session.account?.role)) {
    return <ForbiddenPage />
  }
  return children
}

function GuardedPage() {
  const session = useSession()
  const path = normalizeAdminPath(useLocation().pathname)
  const page = PAGES.find((item) => item.to === path)
  if (!page) return <NotFoundPage />
  if (!canOpen(session.account?.permissions ?? [], page.permission, session.account?.role)) {
    return <ForbiddenPage />
  }
  if (page.to === "/") return <DashboardPage />
  if (page.to === "/catalogue/livres") return <BooksPage />
  if (page.to === "/catalogue/auteurs") return <AuthorsPage />
  if (page.to === "/catalogue/categories") return <CategoriesPage />
  if (page.to === "/annonces") return <AnnouncementsPage />
  if (page.to === "/publications") return <PublicationsPage />
  if (page.to === "/evenements") return <EventsPage />
  if (page.to === "/utilisateurs") return <UsersPage />
  if (page.to === "/journal") return <JournalPage />
  if (page.to === "/messages") return <MessagesPage />
  if (page.to === "/parametres") return <SettingsPage />
  return <SoonPage />
}

export const router = createBrowserRouter(
  [
    { path: "/connexion", element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AdminShell />,
          children: [
            // Tableau de bord = https://bibtotanga.com/admin/
            { index: true, element: <DashboardPage /> },
            ...PAGES.filter((page) => page.to !== "/").map((page) => ({
              path: page.to.slice(1),
              element: <GuardedPage />,
            })),
            { path: "catalogue/livres/nouveau", element: <Allowed permission="catalog.add_book"><BookFormPage mode="create" /></Allowed> },
            { path: "catalogue/livres/:bookId/modifier", element: <Allowed permission="catalog.change_book"><BookFormPage mode="edit" /></Allowed> },
            { path: "catalogue/livres/:bookId", element: <Allowed permission="catalog.view_book"><BookFormPage mode="view" /></Allowed> },
            { path: "catalogue/auteurs/nouveau", element: <Allowed permission="catalog.add_author"><AuthorFormPage mode="create" /></Allowed> },
            { path: "catalogue/auteurs/:authorId/modifier", element: <Allowed permission="catalog.change_author"><AuthorFormPage mode="edit" /></Allowed> },
            { path: "catalogue/auteurs/:authorId", element: <Allowed permission="catalog.view_author"><AuthorFormPage mode="view" /></Allowed> },
            { path: "catalogue/categories/nouveau", element: <Allowed permission="catalog.add_category"><CategoryFormPage mode="create" /></Allowed> },
            { path: "catalogue/categories/:categoryId/modifier", element: <Allowed permission="catalog.change_category"><CategoryFormPage mode="edit" /></Allowed> },
            { path: "catalogue/categories/:categoryId", element: <Allowed permission="catalog.view_category"><CategoryFormPage mode="view" /></Allowed> },
            { path: "annonces/nouveau", element: <Allowed permission="announcements.add_announcement"><AnnouncementFormPage mode="create" /></Allowed> },
            { path: "annonces/:announcementId/modifier", element: <Allowed permission="announcements.change_announcement"><AnnouncementFormPage mode="edit" /></Allowed> },
            { path: "annonces/:announcementId", element: <Allowed permission="announcements.view_announcement"><AnnouncementFormPage mode="view" /></Allowed> },
            { path: "publications/nouveau", element: <Allowed permission="posts.add_post"><PublicationFormPage mode="create" /></Allowed> },
            { path: "publications/:publicationId/modifier", element: <Allowed permission="posts.change_post"><PublicationFormPage mode="edit" /></Allowed> },
            { path: "publications/:publicationId", element: <Allowed permission="posts.view_post"><PublicationFormPage mode="view" /></Allowed> },
            { path: "evenements/nouveau", element: <Allowed permission="events.add_event"><EventFormPage mode="create" /></Allowed> },
            { path: "evenements/:eventId/modifier", element: <Allowed permission="events.change_event"><EventFormPage mode="edit" /></Allowed> },
            { path: "evenements/:eventId", element: <Allowed permission="events.view_event"><EventFormPage mode="view" /></Allowed> },
            { path: "utilisateurs/nouveau", element: <Allowed permission="accounts.add_user"><UserCreatePage /></Allowed> },
            { path: "utilisateurs/roles", element: <Allowed permission="accounts.view_user"><RolesPage /></Allowed> },
            { path: "utilisateurs/:userId", element: <Allowed permission="accounts.view_user"><UserViewPage /></Allowed> },
            { path: "compte/profil", element: <ProfilePage /> },
            { path: "compte/mot-de-passe", element: <SoonPage /> },
            { path: "compte/preferences", element: <PreferencesPage /> },
            { path: "compte/notifications", element: <NotificationsPage /> },
            { path: "compte/aide", element: <SoonPage /> },
            { path: "acces-refuse", element: <ForbiddenPage /> },
            { path: "*", element: <NotFoundPage /> },
          ],
        },
      ],
    },
    { path: "*", element: <NotFoundPage /> },
  ],
  { basename: ADMIN_BASENAME },
)
