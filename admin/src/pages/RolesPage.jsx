import { useEffect, useState } from "react"
import { ArrowLeft, BookOpen, CalendarDays, Check, Crown, FileText, KeyRound, LayoutDashboard, Megaphone, Pencil, RotateCcw, Settings, Shield, ShieldCheck, Users, X } from "lucide-react"
import { Link } from "react-router"
import { listRoles, listStaff, saveRoles } from "../api/staff.js"
import { FormSaveOverlay } from "../components/FormSaveOverlay.jsx"
import { busyPhase } from "../lib/saveAndGo.js"
import { canOpen } from "../nav/entries.js"
import { useSession } from "../session/SessionContext.jsx"

const ACTIONS = [
  { id: "view", label: "Consulter" },
  { id: "add", label: "Ajouter" },
  { id: "change", label: "Modifier" },
  { id: "delete", label: "Supprimer" },
]

const MODULES = [
  { id: "dashboard", label: "Tableau de bord", hint: "Ouvert à tout le personnel connecté", icon: LayoutDashboard, locked: true },
  { id: "catalog", label: "Catalogue", hint: "Livres, auteurs, catégories, exemplaires", icon: BookOpen },
  { id: "announcements", label: "Annonces", hint: "", icon: Megaphone },
  { id: "publications", label: "Publications", hint: "", icon: FileText },
  { id: "events", label: "Événements", hint: "Pas de suppression : archivage seulement", icon: CalendarDays },
  { id: "users", label: "Utilisateurs et rôles", hint: "", icon: Users },
  { id: "settings", label: "Paramètres", hint: "", icon: Settings },
]

const ICONS = { crown: Crown, book: BookOpen, pen: Pencil }

function cloneRoles(items) {
  return structuredClone(items)
}

function permissionCount(roles) {
  return roles.reduce((sum, role) => sum + MODULES.reduce((count, item) => count + ACTIONS.filter((action) => role.grants?.[item.id]?.[action.id]).length, 0), 0)
}

function actionDisabled(moduleId, actionId) {
  if (moduleId === "dashboard") return true
  if (moduleId === "events" && actionId === "delete") return true
  if (moduleId === "users" && actionId === "delete") return true
  if (moduleId === "settings" && (actionId === "add" || actionId === "delete")) return true
  return false
}

export function RolesPage() {
  const session = useSession()
  const canEdit = canOpen(session.account?.permissions ?? [], "accounts.change_user", session.account?.role)
  const [roles, setRoles] = useState([])
  const [snapshot, setSnapshot] = useState([])
  const [selected, setSelected] = useState("administrateur")
  const [people, setPeople] = useState([])
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [phase, setPhase] = useState(null)
  const busy = busyPhase(phase)
  const current = roles.find((role) => role.code === selected) || roles[0]
  const Icon = ICONS[current?.icon] || Shield
  const writable = canEdit && editing && !busy

  useEffect(() => {
    let active = true
    Promise.all([listRoles(), listStaff()]).then(([rolesResult, staffResult]) => {
      if (!active) return
      if (!rolesResult.ok) {
        setError(rolesResult.error)
        setLoading(false)
        return
      }
      setRoles(rolesResult.data)
      setSnapshot(cloneRoles(rolesResult.data))
      setSelected(rolesResult.data[0]?.code || "administrateur")
      if (staffResult.ok) setPeople(staffResult.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  function update(code, patch) {
    setRoles((items) => items.map((role) => (role.code === code ? { ...role, ...patch } : role)))
    setNotice("")
    setError("")
  }

  function setGrant(module, action, value) {
    if (!current || actionDisabled(module, action) || !writable) return
    update(current.code, {
      grants: {
        ...current.grants,
        [module]: { ...current.grants[module], [action]: value },
      },
    })
  }

  function setRow(module, value) {
    if (!current || !writable) return
    const next = { ...current.grants[module] }
    for (const action of ACTIONS) {
      if (!actionDisabled(module, action.id)) next[action.id] = value
    }
    update(current.code, {
      grants: {
        ...current.grants,
        [module]: next,
      },
    })
  }

  function startEditing() {
    if (!canEdit || busy) return
    setSnapshot(cloneRoles(roles))
    setEditing(true)
    setNotice("")
    setError("")
  }

  function cancelEditing() {
    if (busy) return
    setRoles(cloneRoles(snapshot))
    setEditing(false)
    setNotice("")
    setError("")
  }

  async function reloadDefaults() {
    if (busy || editing) return
    setPhase("saving")
    setError("")
    setNotice("")
    const result = await listRoles()
    if (!result.ok) {
      setPhase(null)
      setError(result.error)
      return
    }
    setRoles(result.data)
    setSnapshot(cloneRoles(result.data))
    setSelected(result.data[0]?.code || "administrateur")
    setPhase("done")
    await new Promise((resolve) => window.setTimeout(resolve, 750))
    setPhase(null)
    setNotice("Affichage rechargé depuis le serveur.")
  }

  async function save() {
    if (!writable || roles.length === 0) return
    setPhase("saving")
    setError("")
    setNotice("")
    const result = await saveRoles(roles.map((role) => ({ code: role.code, grants: role.grants })))
    if (!result.ok) {
      setPhase(null)
      setError(result.error)
      return
    }
    setRoles(result.data)
    setSnapshot(cloneRoles(result.data))
    setPhase("done")
    await new Promise((resolve) => window.setTimeout(resolve, 750))
    setPhase(null)
    setEditing(false)
    setNotice("Les modifications ont été enregistrées. Elles s'appliquent aux prochains contrôles d'accès.")
  }

  if (loading) return <p>Chargement…</p>
  if (!current) {
    return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error || "Aucun rôle n'est disponible."}</p>
  }

  const associated = people.filter((person) => roles.some((role) => role.code === person.role)).length
  const activeRoles = roles.filter((role) => people.some((person) => person.role === role.code && person.active)).length

  return (
    <section className="grid gap-4">
      {phase ? <FormSaveOverlay phase={phase} label={phase === "done" ? "Enregistré" : undefined} /> : null}
      <div className="flex flex-wrap gap-2">
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-panel px-4 font-semibold text-violet">
          <Users aria-hidden="true" size={18} />
          Utilisateurs
        </Link>
        <Link to="/utilisateurs/roles" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary">
          <Shield aria-hidden="true" size={18} />
          Rôles et permissions
        </Link>
      </div>
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      {notice ? <p role="status" className="rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      {!canEdit ? <p className="rounded-panel border border-line bg-panel p-4 text-muted">Seul un administrateur peut modifier les rôles.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Rôles au total", roles.length, Users, "bg-lavender text-violet"],
          ["Rôles actifs", activeRoles, ShieldCheck, "bg-available-soft text-available"],
          ["Utilisateurs associés", associated, Users, "bg-info-soft text-info"],
          ["Permissions au total", permissionCount(roles), KeyRound, "bg-warning-soft text-warning"],
        ].map(([label, value, CardIcon, chip]) => (
          <article key={label} className="rounded-panel border border-line bg-panel p-4 shadow-card">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-control ${chip}`}>
              <CardIcon aria-hidden="true" size={22} />
            </span>
            <p className="mt-3 text-section text-heading">{value}</p>
            <p className="text-muted">{label}</p>
          </article>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <article className="rounded-panel border border-line bg-panel p-4 shadow-card">
          <h2 className="font-semibold text-heading">Rôles ({roles.length})</h2>
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
                    className={`grid w-full gap-1 rounded-panel border p-3 text-left ${active ? "border-violet bg-lavender" : "border-line bg-panel"}`}
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
        <article className="rounded-panel border border-line bg-panel p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-section text-heading">
              <Icon aria-hidden="true" className="text-violet" size={22} />
              Détails du rôle : {current.label}
            </h2>
            {canEdit && !editing ? (
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-violet px-3 font-semibold text-violet" onClick={startEditing}>
                <Pencil aria-hidden="true" size={18} />
                Modifier
              </button>
            ) : null}
            {editing ? (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lavender px-3 font-semibold text-violet">
                <Pencil aria-hidden="true" size={18} />
                Modification active
              </span>
            ) : null}
            {!canEdit ? (
              <span className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted">Lecture seule</span>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Nom du rôle</span>
              <input className="w-full rounded-control border border-line bg-canvas px-3" value={current.label} readOnly />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-heading">Description</span>
              <input className="w-full rounded-control border border-line bg-canvas px-3" value={current.description || ""} readOnly />
            </label>
          </div>
          <h3 className="mt-6 flex items-center gap-2 font-semibold text-heading">
            <Shield aria-hidden="true" className="text-violet" size={18} />
            Permissions du rôle
          </h3>
          {!editing && canEdit ? (
            <p className="mt-2 text-muted">Cliquez sur Modifier pour changer les permissions.</p>
          ) : null}
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
                  const row = current.grants[item.id] || { view: false, add: false, change: false, delete: false }
                  const ModuleIcon = item.icon
                  const editableActions = ACTIONS.filter((action) => !actionDisabled(item.id, action.id))
                  const all = editableActions.length > 0 && editableActions.every((action) => row[action.id])
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
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-violet"
                          checked={all}
                          disabled={!writable || editableActions.length === 0}
                          aria-label={`Tout autoriser pour ${item.label}`}
                          onChange={(event) => setRow(item.id, event.target.checked)}
                        />
                      </td>
                      {ACTIONS.map((action) => (
                        <td key={action.id} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-violet"
                            checked={Boolean(row[action.id])}
                            disabled={!writable || actionDisabled(item.id, action.id)}
                            aria-label={`${action.label} ${item.label}`}
                            onChange={(event) => setGrant(item.id, action.id, event.target.checked)}
                          />
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
        <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-violet" disabled={busy} onClick={reloadDefaults}>
              <RotateCcw aria-hidden="true" size={18} />
              Recharger
            </button>
          ) : null}
          {editing ? (
            <>
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-panel px-4 font-semibold text-heading" disabled={busy} onClick={cancelEditing}>
                <X aria-hidden="true" size={18} />
                Annuler
              </button>
              <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-violet px-4 font-semibold text-on-primary disabled:opacity-60" disabled={busy} onClick={save}>
                <Check aria-hidden="true" size={18} />
                Enregistrer les modifications
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
