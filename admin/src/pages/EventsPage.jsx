import { useState } from "react"
import { CalendarCheck, CalendarDays, CalendarX, MapPin, Users } from "lucide-react"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { readEvents, removeEvent } from "./contentStore.js"

const TYPES = ["Atelier", "Conférence", "Salon", "Animation", "Formation", "Club", "Exposition"]
const TYPE_CLASS = {
  Atelier: "bg-lavender text-violet",
  Conférence: "bg-[#e7eefc] text-[#1d4ed8]",
  Salon: "bg-[#fde7c7] text-[#9a3412]",
  Animation: "bg-available-soft text-available",
  Formation: "bg-[#e7eefc] text-[#1d4ed8]",
  Club: "bg-lavender text-violet",
  Exposition: "bg-[#fde7c7] text-[#9a3412]",
}

function when(row) {
  const start = new Date(`${row.starts}T12:00:00`)
  const end = new Date(`${row.ends}T12:00:00`)
  const time = `${row.startTime} – ${row.endTime}`
  if (row.starts === row.ends) {
    return { date: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }), time }
  }
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString("fr-FR", sameMonth ? { day: "2-digit" } : { day: "2-digit", month: "short" })
  const endLabel = end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  return { date: `${startLabel} – ${endLabel}`, time }
}

function statusClass(status) {
  if (status === "Passé") return "rounded-full bg-canvas px-3 py-1 font-semibold text-muted"
  if (status === "En cours") return "rounded-full bg-[#e7eefc] px-3 py-1 font-semibold text-[#1d4ed8]"
  return "rounded-full bg-available-soft px-3 py-1 font-semibold text-available"
}

export function EventsPage() {
  const [rows, setRows] = useState(() => readEvents())
  const upcoming = rows.filter((row) => row.status === "À venir").length
  const past = rows.filter((row) => row.status === "Passé").length
  const participants = rows.reduce((sum, row) => sum + (row.registered || 0), 0)

  function onRemove(row) {
    if (!window.confirm(`Supprimer « ${row.title} » ?`)) return
    removeEvent(row.id)
    setRows(readEvents())
  }

  return (
    <CatalogListPage
      heading="Liste des événements"
      headingIcon={CalendarDays}
      one="événement"
      noun="événements"
      addLabel="Nouvel événement"
      addTo="/evenements/nouveau"
      placeholder="Rechercher un événement (titre, lieu, organisateur…)"
      rows={rows}
      showSort={false}
      searchOf={(row) => `${row.title} ${row.summary} ${row.place} ${row.organizer}`}
      sortOf={(row) => String(row.order).padStart(3, "0")}
      stats={[
        { label: "Événements au total", value: String(rows.length), trend: "dans la liste", icon: CalendarDays, chip: "bg-lavender text-violet" },
        { label: "Événements à venir", value: String(upcoming), trend: "pas encore commencés", icon: CalendarCheck, chip: "bg-available-soft text-available" },
        { label: "Événements passés", value: String(past), trend: "déjà terminés", icon: CalendarX, chip: "bg-unavailable-soft text-unavailable" },
        { label: "Participants (cumul)", value: participants.toLocaleString("fr-FR"), trend: "inscrits", icon: Users, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
      ]}
      filters={[
        {
          id: "type",
          label: "Type",
          options: [{ value: "", label: "Tous" }, ...TYPES.map((item) => ({ value: item, label: item }))],
          match: (row, value) => row.type === value,
        },
        {
          id: "status",
          label: "Statut",
          options: [
            { value: "", label: "Tous" },
            { value: "À venir", label: "À venir" },
            { value: "En cours", label: "En cours" },
            { value: "Passé", label: "Passé" },
          ],
          match: (row, value) => row.status === value,
        },
      ]}
      period={{
        match: (row, from, to) => {
          if (from && row.ends < from) return false
          if (to && row.starts > to) return false
          return true
        },
      }}
      columns={[
        { key: "n", label: "#", render: (_row, index) => index + 1 },
        {
          key: "image",
          label: "Image",
          render: (row) => <img src={row.image} alt="" className="h-12 w-16 rounded-md object-cover" />,
        },
        {
          key: "title",
          label: "Titre de l'événement",
          render: (row) => (
            <span className="grid">
              <span className="font-semibold text-heading">{row.title}</span>
              <span className="text-muted">{row.summary}</span>
            </span>
          ),
        },
        {
          key: "type",
          label: "Type",
          render: (row) => <span className={`rounded-full px-3 py-1 font-semibold ${TYPE_CLASS[row.type] || "bg-lavender text-violet"}`}>{row.type}</span>,
        },
        {
          key: "when",
          label: "Date et heure",
          render: (row) => {
            const slot = when(row)
            return (
              <span className="grid">
                <span>{slot.date}</span>
                <span className="text-muted">{slot.time}</span>
              </span>
            )
          },
        },
        {
          key: "place",
          label: "Lieu",
          render: (row) => (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" size={16} className="text-muted" />
              {row.place}
            </span>
          ),
        },
        { key: "organizer", label: "Organisateur", render: (row) => row.organizer },
        {
          key: "people",
          label: "Participants",
          render: (row) => (
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden="true" size={16} className="text-muted" />
              {row.capacity == null ? "—" : `${row.registered} / ${row.capacity}`}
            </span>
          ),
        },
        { key: "status", label: "Statut", render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
        {
          key: "actions",
          label: "Actions",
          render: (row) => (
            <RowActions
              viewTo={`/evenements/${row.id}`}
              editTo={`/evenements/${row.id}/modifier`}
              removeLabel="Supprimer"
              onRemove={() => onRemove(row)}
            />
          ),
        },
      ]}
    />
  )
}
