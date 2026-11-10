import { BookOpen, Clock, Megaphone } from "lucide-react"

export function announcementGroup(item) {
  if (item.kind === "important") return "important"
  if (/horaire/i.test(item.title)) return "horaires"
  return "acquisitions"
}

export function announcementBadge(item) {
  const group = announcementGroup(item)
  if (group === "important") return { label: "Important", icon: Megaphone, className: "bg-unavailable text-white" }
  if (group === "horaires") return { label: "Horaires", icon: Clock, className: "bg-gold-bright text-heading" }
  return { label: "Nouvelle acquisition", icon: BookOpen, className: "bg-available text-white" }
}

export function announcementCategory(item) {
  const group = announcementGroup(item)
  if (group === "important") return "Informations générales"
  if (group === "horaires") return "Horaires"
  return "Nouvelles acquisitions"
}
