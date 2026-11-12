import { Navigate, createBrowserRouter, useLocation } from "react-router"
import { AdminShell } from "../components/AdminShell.jsx"
import { RequireAuth } from "../components/RequireAuth.jsx"
import {
  ADMIN_BASENAME,
  DASHBOARD_ALIAS,
  DASHBOARD_PATH,
  LOGIN_ALIAS,
  LOGIN_PATH,
  normalizeAdminPath,
} from "../lib/paths.js"
import { canOpen, PAGES } from "../nav/entries.js"
import { AuthorFormPage } from "../pages/AuthorFormPage.jsx"
import { AnnouncementFormPage } from "../pages/AnnouncementFormPage.jsx"
import { AnnouncementsPage } from "../pages/AnnouncementsPage.jsx"
import { AuthorsPage } from "../pages/AuthorsPage.jsx"
import { BookFormPage } from "../pages/BookFormPage.jsx"
import { BooksPage } from "../pages/BooksPage.jsx"
import { CategoriesPage } from "../pages/CategoriesPage.jsx"
import { CategoryFormPage } from "../pages/CategoryFormPage.jsx"
import { PublisherFormPage } from "../pages/PublisherFormPage.jsx"
import { PublishersPage } from "../pages/PublishersPage.jsx"
import { DashboardPage } from "../pages/DashboardPage.jsx"
import { EventFormPage } from "../pages/EventFormPage.jsx"
import { EventsPage } from "../pages/EventsPage.jsx"
import { ForbiddenPage } from "../pages/ForbiddenPage.jsx"
import { JournalPage } from "../pages/JournalPage.jsx"
import { LoginPage } from "../pages/LoginPage.jsx"
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
  if (page.to === "/catalogue/editeurs") return <PublishersPage />
  if (page.to === "/catalogue/categories") return <CategoriesPage />
  if (page.to === "/annonces") return <AnnouncementsPage />
  if (page.to === "/publications") return <PublicationsPage />
  if (page.to === "/evenements") return <EventsPage />
  if (page.to === "/utilisateurs") return <UsersPage />
  if (page.to === "/journal") return <JournalPage />
  if (page.to === "/parametres") return <SettingsPage />
  return <SoonPage />
}

export const router = createBrowserRouter(
  [
    { path: LOGIN_PATH, element: <LoginPage /> },
    { path: LOGIN_ALIAS, element: <Navigate to={LOGIN_PATH} replace /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AdminShell />,
          children: [
            // https://bibtotanga.com/admin/  et  /admin/dashboard
            { index: true, element: <DashboardPage /> },
            { path: DASHBOARD_ALIAS.slice(1), element: <DashboardPage /> },
            ...PAGES.filter((page) => page.to !== DASHBOARD_PATH).map((page) => ({
              path: page.to.slice(1),
              element: <GuardedPage />,
            })),
            { path: "catalogue/livres/nouveau", element: <Allowed permission="catalog.add_book"><BookFormPage mode="create" /></Allowed> },
            { path: "catalogue/livres/:bookId/modifier", element: <Allowed permission="catalog.change_book"><BookFormPage mode="edit" /></Allowed> },
            { path: "catalogue/livres/:bookId", element: <Allowed permission="catalog.view_book"><BookFormPage mode="view" /></Allowed> },
            { path: "catalogue/auteurs/nouveau", element: <Allowed permission="catalog.add_author"><AuthorFormPage mode="create" /></Allowed> },
            { path: "catalogue/auteurs/:authorId/modifier", element: <Allowed permission="catalog.change_author"><AuthorFormPage mode="edit" /></Allowed> },
            { path: "catalogue/auteurs/:authorId", element: <Allowed permission="catalog.view_author"><AuthorFormPage mode="view" /></Allowed> },
            { path: "catalogue/editeurs/nouveau", element: <PublisherFormPage /> },
            { path: "catalogue/editeurs/:publisherId/modifier", element: <PublisherFormPage /> },
            { path: "catalogue/editeurs/:publisherId", element: <PublisherFormPage /> },
            { path: "catalogue/categories/nouveau", element: <CategoryFormPage /> },
            { path: "catalogue/categories/:categoryId/modifier", element: <CategoryFormPage /> },
            { path: "catalogue/categories/:categoryId", element: <CategoryFormPage /> },
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
            { path: "messages", element: <Navigate to="/compte/notifications?onglet=messages" replace /> },
            { path: "compte/aide", element: <SoonPage /> },
            { path: "acces-refuse", element: <ForbiddenPage /> },
            { path: "*", element: <NotFoundPage /> },
          ],
        },
      ],
    },
    { path: "*", element: <NotFoundPage /> },
  ],
  {
    basename: ADMIN_BASENAME,
    // Sans ça, React Router peut passer de /admin/ à /admin ; le F5 Vite échoue.
    trailingSlash: "ignore",
  },
)
