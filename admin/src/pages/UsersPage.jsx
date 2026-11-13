import { useEffect, useState } from "react"
import { Check, Shield, UserRound, UserRoundCheck, UserRoundX, Users } from "lucide-react"
import { Link } from "react-router"
import { listStaff } from "../api/staff.js"
import { canOpen } from "../nav/entries.js"
import { useSession } from "../session/SessionContext.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { STAFF_ROLES, roleOf } from "./staffRoles.js"

function initials(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "?"
}

function joined(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function RolePanel({ rows, selected, onSelect }) {
  const role = roleOf(selected)
  const people = rows.filter((row) => (row.role || "") === (role.code || ""))
  const [detail, setDetail] = useState("permissions")

  return (
    <aside className="grid content-start gap-4">
      <article className="rounded-panel border border-line bg-panel p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-section text-heading">
          <Shield aria-hidden="true" className="text-violet" size={22} />
          Rôles ({STAFF_ROLES.length})
        </h2>
        <ul className="mt-3 grid gap-1">
          {STAFF_ROLES.map((item) => {
            const count = rows.filter((row) => row.role === item.code).length
            const active = item.code === selected
            return (
              <li key={item.code}>
                <button
                  type="button"
                  aria-pressed={active}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-3 text-left font-semibold ${active ? "bg-lavender text-violet" : "text-heading hover:bg-canvas"}`}
                  onClick={() => onSelect(item.code)}
                >
                  <span>{item.label}</span>
                  <span className="text-muted">{count}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </article>
      <article className="rounded-panel border border-line bg-panel p-4 shadow-card">
        <h2 className="text-section text-heading">Détails du rôle : {role.label}</h2>
        <div className="mt-3 flex gap-2">
          <button type="button" className={`min-h-11 rounded-control px-3 font-semibold ${detail === "permissions" ? "bg-violet text-on-primary" : "text-violet"}`} onClick={() => setDetail("permissions")}>
            Permissions
          </button>
          <button type="button" className={`min-h-11 rounded-control px-3 font-semibold ${detail === "people" ? "bg-violet text-on-primary" : "text-violet"}`} onClick={() => setDetail("people")}>
            Utilisateurs ({people.length})
          </button>
        </div>
        {detail === "permissions" ? (
          <ul className="mt-4 grid gap-3">
            {role.permissions.map((item) => (
              <li key={item} className="flex gap-2 text-heading">
                <Check aria-hidden="true" className="mt-1 shrink-0 text-available" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-4 grid gap-2">
            {people.length === 0 ? <li className="text-muted">Aucun compte pour ce rôle.</li> : people.map((person) => (
              <li key={person.id}>
                <Link to={`/utilisateurs/${person.id}`} className="font-semibold text-violet">{person.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </aside>
  )
}

export function UsersPage() {
  const session = useSession()
  const canAdd = canOpen(session.account?.permissions ?? [], "accounts.add_user", session.account?.role)
  const [rows, setRows] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState("administrateur")

  useEffect(() => {
    let active = true
    listStaff().then((result) => {
      if (!active) return
      if (!result.ok) setError(result.error)
      else setRows(result.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const activeCount = rows.filter((row) => row.active).length
  const suspended = rows.length - activeCount

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary">
          <Users aria-hidden="true" size={18} />
          Utilisateurs
        </Link>
        <Link to="/utilisateurs/roles" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-panel px-4 font-semibold text-violet">
          <Shield aria-hidden="true" size={18} />
          Rôles et permissions
        </Link>
      </div>
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      {loading ? <p>Chargement…</p> : null}
      {!loading ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <CatalogListPage
            heading="Liste des utilisateurs"
            headingIcon={Users}
            one="utilisateur"
            noun="utilisateurs"
            addLabel={canAdd ? "Nouvel utilisateur" : ""}
            addTo={canAdd ? "/utilisateurs/nouveau" : ""}
            placeholder="Rechercher un compte (nom, identifiant…)"
            rows={rows}
            showSort={false}
            searchOf={(row) => `${row.name} ${row.username}`}
            sortOf={(row) => row.name}
            stats={[
              { label: "Utilisateurs (total)", value: String(rows.length), trend: "comptes du personnel", icon: Users, chip: "bg-lavender text-violet" },
              { label: "Comptes actifs", value: String(activeCount), trend: "peuvent se connecter", icon: UserRoundCheck, chip: "bg-available-soft text-available" },
              { label: "Comptes suspendus", value: String(suspended), trend: "connexion refusée", icon: UserRoundX, chip: "bg-unavailable-soft text-unavailable" },
              { label: "Rôles", value: String(STAFF_ROLES.length), trend: "définis pour le personnel", icon: Shield, chip: "bg-info-soft text-info" },
            ]}
            filters={[
              {
                id: "role",
                label: "Rôle",
                options: [{ value: "", label: "Tous" }, ...STAFF_ROLES.map((role) => ({ value: role.code, label: role.label }))],
                match: (row, value) => row.role === value,
              },
              {
                id: "status",
                label: "Statut",
                options: [
                  { value: "", label: "Tous" },
                  { value: "actif", label: "Actif" },
                  { value: "suspendu", label: "Suspendu" },
                ],
                match: (row, value) => (value === "actif" ? row.active : !row.active),
              },
            ]}
            columns={[
              { key: "n", label: "#", render: (_row, index) => index + 1 },
              {
                key: "user",
                label: "Utilisateur",
                render: (row) => (
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-lavender font-semibold text-violet">{initials(row.name)}</span>
                    <span className="grid">
                      <span className="font-semibold text-heading">{row.name}</span>
                      <span className="text-muted">{row.username}</span>
                    </span>
                  </span>
                ),
              },
              { key: "username", label: "Identifiant", render: (row) => row.username },
              {
                key: "role",
                label: "Rôle",
                render: (row) => {
                  const role = roleOf(row.role)
                  return <span className={`rounded-full px-3 py-1 font-semibold ${role.chip}`}>{role.label}</span>
                },
              },
              { key: "joined", label: "Date d'inscription", render: (row) => joined(row.joined) },
              {
                key: "status",
                label: "Statut",
                render: (row) => (
                  <span className={row.active ? "rounded-full bg-available-soft px-3 py-1 font-semibold text-available" : "rounded-full bg-warning-soft px-3 py-1 font-semibold text-warning"}>
                    {row.active ? "Actif" : "Suspendu"}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <Link to={`/utilisateurs/${row.id}`} aria-label="Voir" className="inline-flex h-11 w-11 items-center justify-center rounded-control text-info">
                    <UserRound size={18} />
                  </Link>
                ),
              },
            ]}
          />
          <RolePanel rows={rows} selected={selected} onSelect={setSelected} />
        </div>
      ) : null}
    </section>
  )
}
