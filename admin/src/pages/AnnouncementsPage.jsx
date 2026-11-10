import { useState } from "react"
import { AlertTriangle, Megaphone, Star } from "lucide-react"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { readAnnouncements, removeAnnouncement, saveAnnouncement } from "./contentStore.js"

const TYPES = ["Horaires", "Nouveauté", "Important", "Information", "Règlement", "Appel à contribution", "Événement", "Sondage"]
const TYPE_CLASS = {
  Horaires: "bg-[#e7eefc] text-[#1d4ed8]",
  Nouveauté: "bg-lavender text-violet",
  Important: "bg-unavailable-soft text-unavailable",
  Information: "bg-[#e7eefc] text-[#1d4ed8]",
  Règlement: "bg-lavender text-violet",
  "Appel à contribution": "bg-[#fde7c7] text-[#9a3412]",
  Événement: "bg-lavender text-violet",
  Sondage: "bg-available-soft text-available",
}

function period(row) {
  const format = (value) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  return `du ${format(row.starts)} au ${format(row.ends)}`
}

function statusClass(status) {
  if (status === "Archivé") return "rounded-full bg-canvas px-3 py-1 font-semibold text-muted"
  if (status === "Brouillon") return "rounded-full bg-[#fde7c7] px-3 py-1 font-semibold text-[#9a3412]"
  return "rounded-full bg-available-soft px-3 py-1 font-semibold text-available"
}

export function AnnouncementsPage() {
  const [rows, setRows] = useState(() => readAnnouncements())
  const [error, setError] = useState("")

  function togglePin(row) {
    saveAnnouncement({ ...row, pinned: !row.pinned })
    setRows(readAnnouncements())
  }

  function onRemove(row) {
    if (!window.confirm(`Supprimer « ${row.title} » ?`)) return
    removeAnnouncement(row.id)
    setRows(readAnnouncements())
    setError("")
  }

  return (
    <section className="grid gap-4">
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      <CatalogListPage
        heading="Liste des annonces"
        headingIcon={Megaphone}
        one="annonce"
        noun="annonces"
        addLabel="Nouvelle annonce"
        addTo="/annonces/nouveau"
        placeholder="Rechercher une annonce (titre, contenu…)"
        rows={rows}
        showSort={false}
        searchOf={(row) => `${row.title} ${row.content} ${row.category} ${row.type}`}
        sortOf={(row) => String(row.order).padStart(3, "0")}
        filters={[
          {
            id: "type",
            label: "Type",
            options: [{ value: "", label: "Tous" }, ...TYPES.map((item) => ({ value: item, label: item }))],
            match: (row, value) => row.type === value,
          },
          {
            id: "category",
            label: "Catégorie",
            options: [{ value: "", label: "Toutes" }, ...[...new Set(rows.map((row) => row.category))].map((item) => ({ value: item, label: item }))],
            match: (row, value) => row.category === value,
          },
          {
            id: "status",
            label: "Statut",
            options: [
              { value: "", label: "Tous" },
              { value: "Publié", label: "Publié" },
              { value: "Brouillon", label: "Brouillon" },
              { value: "Archivé", label: "Archivé" },
            ],
            match: (row, value) => row.status === value,
          },
        ]}
        columns={[
          { key: "n", label: "#", render: (_row, index) => index + 1 },
          {
            key: "image",
            label: "Image",
            render: (row) => row.image
              ? <img src={row.image} alt="" className="h-12 w-16 rounded-md object-cover" />
              : <span className="inline-flex h-12 w-16 items-center justify-center rounded-md bg-unavailable text-white"><AlertTriangle size={22} /></span>,
          },
          { key: "title", label: "Titre", render: (row) => <span className="font-semibold text-heading">{row.title}</span> },
          {
            key: "type",
            label: "Type",
            render: (row) => <span className={`rounded-full px-3 py-1 font-semibold ${TYPE_CLASS[row.type] || "bg-lavender text-violet"}`}>{row.type}</span>,
          },
          { key: "category", label: "Catégorie", render: (row) => row.category },
          { key: "period", label: "Période d'affichage", render: (row) => period(row) },
          { key: "status", label: "Statut", render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
          {
            key: "pin",
            label: "Épinglée",
            render: (row) => (
              <button type="button" aria-pressed={row.pinned} aria-label={row.pinned ? "Retirer l'épingle" : "Épingler"} className={`inline-flex h-11 w-11 items-center justify-center ${row.pinned ? "text-gold" : "text-line"}`} onClick={() => togglePin(row)}>
                <Star size={18} fill={row.pinned ? "currentColor" : "none"} />
              </button>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                viewTo={`/annonces/${row.id}`}
                editTo={`/annonces/${row.id}/modifier`}
                removeLabel="Supprimer"
                onRemove={() => onRemove(row)}
              />
            ),
          },
        ]}
      />
    </section>
  )
}
