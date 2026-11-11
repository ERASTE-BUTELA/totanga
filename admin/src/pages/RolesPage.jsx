import { useEffect, useState } from "react"
import { ArrowLeft, BookOpen, CalendarDays, Check, Crown, FileText, KeyRound, LayoutDashboard, Megaphone, Pencil, Plus, RotateCcw, Settings, Shield, ShieldCheck, Users } from "lucide-react"
import { Link } from "react-router"
import { listStaff } from "../api/staff.js"

const ACTIONS = [
  { id: "view", label: "Consulter" },
  { id: "add", label: "Ajouter" },
  { id: "change", label: "Modifier" },
  { id: "delete", label: "Supprimer" },
]

const MODULES = [
  { id: "dashboard", label: "Tableau de bord", hint: "", icon: LayoutDashboard },
  { id: "catalog", label: "Catalogue", hint: "Livres, auteurs, catégories, exemplaires", icon: BookOpen },
  { id: "announcements", label: "Annonces", hint: "", icon: Megaphone },
  { id: "publications", label: "Publications", hint: "", icon: FileText },
  { id: "events", label: "Événements", hint: "", icon: CalendarDays },
  { id: "users", label: "Utilisateurs et rôles", hint: "", icon: Users },
  { id: "settings", label: "Paramètres", hint: "", icon: Settings },
]

const ICONS = { crown: Crown, book: BookOpen, pen: Pencil }

function blankGrants() {
  return Object.fromEntries(MODULES.map((item) => [item.id, { view: false, add: false, change: false, delete: false }]))
}

function withGrants(allowed) {
  const grants = blankGrants()
  for (const [module, actions] of Object.entries(allowed)) {
    for (const action of actions) grants[module][action] = true
  }
  return grants
}

function serverRoles() {
  return [
    {
      code: "administrateur",
      label: "Administrateur",
      description: "Accès complet au système.",
      icon: "crown",
      grants: withGrants({
        dashboard: ["view"],
        catalog: ["view", "add", "change"],
        announcements: ["view", "add", "change"],
        events: ["view", "add", "change"],
        users: ["view", "add", "change"],
      }),
    },
    {
      code: "bibliothecaire",
      label: "Bibliothécaire",
      description: "Gestion du catalogue (livres, exemplaires, auteurs, catégories).",
      icon: "book",
      grants: withGrants({
        dashboard: ["view"],
        catalog: ["view", "add", "change"],
      }),
    },
    {
      code: "redacteur",
      label: "Rédacteur",
      description: "Annonces et événements. Les publications viendront ensuite.",
      icon: "pen",
      grants: withGrants({
        dashboard: ["view"],
        announcements: ["view", "add", "change"],
        events: ["view", "add", "change"],
      }),
    },
  ]
}

function permissionCount(roles) {
  return roles.reduce((sum, role) => sum + MODULES.reduce((count, item) => count + ACTIONS.filter((action) => role.grants[item.id][action.id]).length, 0), 0)
}

export function RolesPage() {
  const [roles, setRoles] = useState(serverRoles)
  const [selected, setSelected] = useState("administrateur")
  const [people, setPeople] = useState([])
  const [notice, setNotice] = useState("")
  const current = roles.find((role) => role.code === selected) || roles[0]
  const Icon = ICONS[current.icon] || Shield

  useEffect(() => {
    listStaff().then((result) => {
      if (result.ok) setPeople(result.data)
    })
  }, [])

  function update(code, patch) {
    setRoles((items) => items.map((role) => (role.code === code ? { ...role, ...patch } : role)))
    setNotice("")
  }

  function setGrant(module, action, value) {
    update(current.code, {
      grants: {
        ...current.grants,
        [module]: { ...current.grants[module], [action]: value },
      },
    })
  }

  function setRow(module, value) {
    update(current.code, {
      grants: {
        ...current.grants,
        [module]: { view: value, add: value, change: value, delete: value },
      },
    })
  }

  function addRole() {
    const code = `nouveau-${roles.length + 1}`
    setRoles((items) => [...items, { code, label: "Nouveau rôle", description: "", icon: "pen", grants: blankGrants() }])
    setSelected(code)
    setNotice("")
  }

  const associated = people.filter((person) => roles.some((role) => role.code === person.role)).length
  const activeRoles = roles.filter((role) => people.some((person) => person.role === role.code && person.active)).length

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-white px-4 font-semibold text-violet">
          <Users aria-hidden="true" size={18} />
          Utilisateurs
        </Link>
        <Link to="/utilisateurs/roles" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white">
          <Shield aria-hidden="true" size={18} />
          Rôles et permissions
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Rôles au total", roles.length, Users, "bg-lavender text-violet"],
          ["Rôles actifs", activeRoles, ShieldCheck, "bg-available-soft text-available"],
          ["Utilisateurs associés", associated, Users, "bg-[#e7eefc] text-[#1d4ed8]"],
          ["Permissions au total", permissionCount(roles), KeyRound, "bg-[#fde7c7] text-[#9a3412]"],
        ].map(([label, value, CardIcon, chip]) => (
          <article key={label} className="rounded-panel border border-line bg-white p-4 shadow-card">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-control ${chip}`}>
              <CardIcon aria-hidden="true" size={22} />
            </span>
            <p className="mt-3 text-section text-heading">{value}</p>
            <p className="text-muted">{label}</p>
          </article>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <article className="rounded-panel border border-line bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-heading">Rôles ({roles.length})</h2>
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 font-semibold text-violet" onClick={addRole}>
              <Plus aria-hidden="true" size={18} />
              Nouveau rôle
            </button>
          </div>
          <ul className="mt-3 grid gap-2">
            {roles.map((role) => {
              const RoleIcon = ICONS[role.icon] || Shield
              const count = people.filter((person) => person.role === role.code).length
              const active = role.code === current.code
              return (
                <li key={role.code}>
                  <button
                    type="button"
                    aria-pressed={active}
                    className={`grid w-full gap-1 rounded-panel border p-3 text-left ${active ? "border-violet bg-lavender" : "border-line bg-white"}`}
                    onClick={() => setSelected(role.code)}
                  >
                    <span className="flex items-center gap-2 font-semibold text-heading">
                      <RoleIcon aria-hidden="true" size={18} className="text-violet" />
                      {role.label}
                    </span>
                    <span className="text-muted">{role.description || "Sans description"}</span>
                    <span className="text-muted">{count} {count === 1 ? "utilisateur" : "utilisateurs"}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </article>
        <article className="rounded-panel border border-line bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <Icon aria-hidden="true" className="text-violet" size={22} />
              Détails du rôle : {current.label}
            </h2>
            <button type="button" className="inline-flex min-h-11 items-center gap-2 font-semibold text-violet" onClick={() => document.getElementById("nom-du-role")?.focus()}>
              <Pencil aria-hidden="true" size={18} />
              Modifier le rôle
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Nom du rôle *</span>
              <input id="nom-du-role" className="w-full rounded-control border border-line px-3" value={current.label} onChange={(event) => update(current.code, { label: event.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Description</span>
              <input className="w-full rounded-control border border-line px-3" value={current.description} onChange={(event) => update(current.code, { description: event.target.value })} />
            </label>
          </div>
          <h3 className="mt-6 flex items-center gap-2 font-semibold text-heading">
            <Shield aria-hidden="true" className="text-violet" size={18} />
            Permissions du rôle
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-3 py-3 font-semibold">Module / Fonctionnalité</th>
                  <th className="px-3 py-3 text-center font-semibold">Tout autoriser</th>
                  {ACTIONS.map((action) => (
                    <th key={action.id} className="px-3 py-3 text-center font-semibold">{action.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((item) => {
                  const row = current.grants[item.id]
                  const ModuleIcon = item.icon
                  const all = ACTIONS.every((action) => row[action.id])
                  return (
                    <tr key={item.id} className="border-b border-line">
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2 font-semibold text-heading">
                          <ModuleIcon aria-hidden="true" size={18} className="text-violet" />
                          <span className="grid">
                            <span>{item.label}</span>
                            {item.hint ? <span className="font-normal text-muted">{item.hint}</span> : null}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" className="h-5 w-5 accent-violet" checked={all} aria-label={`Tout autoriser pour ${item.label}`} onChange={(event) => setRow(item.id, event.target.checked)} />
                      </td>
                      {ACTIONS.map((action) => (
                        <td key={action.id} className="px-3 py-3 text-center">
                          <input type="checkbox" className="h-5 w-5 accent-violet" checked={row[action.id]} aria-label={`${action.label} ${item.label}`} onChange={(event) => setGrant(item.id, action.id, event.target.checked)} />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste des rôles
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-white px-4 font-semibold text-violet" onClick={() => { setRoles(serverRoles()); setSelected("administrateur"); setNotice("") }}>
            <RotateCcw aria-hidden="true" size={18} />
            Réinitialiser
          </button>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-white" onClick={() => setNotice("L'affichage est mis à jour sur cet écran. Les droits du serveur restent inchangés.")}>
            <Check aria-hidden="true" size={18} />
            Enregistrer les modifications
          </button>
        </div>
      </div>
      {notice ? <p className="text-muted">{notice}</p> : null}
    </section>
  )
}
