import { Navigate, Outlet } from "react-router"
import { LOGIN_FAILED } from "../api/messages.js"
import { LOGIN_PATH } from "../lib/paths.js"
import { useSession } from "../session/SessionContext.jsx"

export function RequireAuth() {
  const session = useSession()
  if (session.status === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-heading">
        <p>Chargement…</p>
      </main>
    )
  }
  if (session.unavailable) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <p role="alert" className="max-w-md text-center text-heading">{LOGIN_FAILED}</p>
      </main>
    )
  }
  if (!session.account) {
    // basename /admin → /admin/connexion (jamais le site public /)
    return <Navigate to={LOGIN_PATH} replace state={{ expired: session.expired }} />
  }
  return <Outlet />
}
