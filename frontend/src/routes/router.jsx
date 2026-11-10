import { lazy, Suspense } from "react"
import { createBrowserRouter } from "react-router"
import { RootLayout } from "../components/layout/RootLayout.jsx"
import RouteErrorPage from "../pages/RouteErrorPage.jsx"

function load(factory) {
  const Page = lazy(factory)
  return function LazyPage() {
    return (
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Page />
      </Suspense>
    )
  }
}

const HomePage = load(() => import("../pages/HomePage.jsx"))
const CatalogPage = load(() => import("../pages/CatalogPage.jsx"))
const BookPage = load(() => import("../pages/BookPage.jsx"))
const AnnouncementsPage = load(() => import("../pages/AnnouncementsPage.jsx"))
const AnnouncementPage = load(() => import("../pages/AnnouncementPage.jsx"))
const PublicationsPage = load(() => import("../pages/PublicationsPage.jsx"))
const PublicationPage = load(() => import("../pages/PublicationPage.jsx"))
const EventsPage = load(() => import("../pages/EventsPage.jsx"))
const EventPage = load(() => import("../pages/EventPage.jsx"))
const AboutPage = load(() => import("../pages/AboutPage.jsx"))
const SimplePage = load(() => import("../pages/SimplePage.jsx"))
const NotFoundPage = load(() => import("../pages/NotFoundPage.jsx"))

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "catalogue", element: <CatalogPage /> },
      { path: "catalogue/:slug", element: <BookPage /> },
      { path: "annonces", element: <AnnouncementsPage /> },
      { path: "annonces/:slug", element: <AnnouncementPage /> },
      { path: "publications", element: <PublicationsPage /> },
      { path: "publications/:slug", element: <PublicationPage /> },
      { path: "evenements", element: <EventsPage /> },
      { path: "evenements/:slug", element: <EventPage /> },
      { path: "a-propos", element: <AboutPage /> },
      { path: "reglement", element: <SimplePage /> },
      { path: "faq", element: <SimplePage /> },
      { path: "mentions-legales", element: <SimplePage /> },
      { path: "confidentialite", element: <SimplePage /> },
      { path: "conditions", element: <SimplePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
