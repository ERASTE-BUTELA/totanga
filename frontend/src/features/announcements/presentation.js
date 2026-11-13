import { BookOpen, Clock, Info, Megaphone, Wrench } from "lucide-react"

const GROUPS = {
  informations: { label: "Informations générales", icon: Info, className: "bg-info text-on-primary" },
  acquisitions: { label: "Nouvelle acquisition", icon: BookOpen, className: "bg-available text-on-primary" },
  horaires: { label: "Horaires", icon: Clock, className: "bg-gold-bright text-heading" },
  maintenance: { label: "Maintenance", icon: Wrench, className: "bg-violet text-on-primary" },
}

export function announcementGroup(item) {
  if (item.category && GROUPS[item.category]) return item.category
  if (item.kind === "important") return "informations"
  if (/horaire/i.test(item.title || "")) return "horaires"
  return "acquisitions"
}

export function announcementBadge(item) {
  if (item.important || item.kind === "important") {
    return { label: "Important", icon: Megaphone, className: "bg-unavailable text-on-primary" }
  }
  return GROUPS[announcementGroup(item)]
}

export function announcementCategory(item) {
  if (item.categoryLabel) return item.categoryLabel
  return GROUPS[announcementGroup(item)].label
}
