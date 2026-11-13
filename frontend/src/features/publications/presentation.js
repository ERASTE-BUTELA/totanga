import { BookOpen, CalendarDays, LineChart, Lightbulb, Newspaper, Sparkles } from "lucide-react"

const KIND_META = {
  Culture: { className: "bg-violet text-white", icon: BookOpen },
  Actualité: { className: "bg-[#1d4ed8] text-white", icon: Newspaper },
  Conseils: { className: "bg-available text-white", icon: Lightbulb },
  Événement: { className: "bg-gold-bright text-heading", icon: CalendarDays },
  Technologie: { className: "bg-[#1d4ed8] text-white", icon: Sparkles },
  // Exemples fictifs (fixtures) encore utilisés en développement.
  Recommandation: { className: "bg-violet text-white", icon: BookOpen },
  Analyse: { className: "bg-[#1d4ed8] text-white", icon: LineChart },
  "Vie de la bibliothèque": { className: "bg-gold-bright text-heading", icon: BookOpen },
}

export function publicationKind(kind) {
  return KIND_META[kind] || { className: "bg-lavender text-violet", icon: BookOpen }
}
