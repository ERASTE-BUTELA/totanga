import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router"
import { listStaff } from "../api/staff.js"
import { roleOf } from "./staffRoles.js"

export function UserViewPage() {
  const { userId } = useParams()
  const [person, setPerson] = useState(undefined)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    listStaff().then((result) => {
      if (!active) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPerson(result.data.find((item) => String(item.id) === String(userId)) || null)
    })
    return () => {
      active = false
    }
  }, [userId])

  if (error) {
    return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  }
  if (person === undefined) return <p>Chargement…</p>
  if (!person) {
    return (
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <p>Ce compte n'existe pas.</p>
        <Link to="/utilisateurs" className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet">Retour à la liste</Link>
      </section>
    )
  }

  const role = roleOf(person.role)
  const rows = [
    ["Nom", person.name],
    ["Identifiant", person.username],
    ["Rôle", role.label],
    ["Statut", person.active ? "Actif" : "Suspendu"],
  ]

  return (
    <article className="grid max-w-xl gap-4 rounded-panel border border-line bg-white p-5 shadow-card">
      <h2 className="text-section text-heading">{person.name}</h2>
      <dl className="grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1">
            <dt className="font-semibold text-heading">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Link to="/utilisateurs" className="inline-flex min-h-11 items-center gap-2 font-semibold text-violet">
        <ArrowLeft aria-hidden="true" size={18} />
        Retour à la liste
      </Link>
    </article>
  )
}
