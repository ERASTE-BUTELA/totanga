import { BookOpen, CalendarDays, LineChart, Lightbulb, Newspaper, Sparkles } from "lucide-react"

const KIND_META = {
  Culture: { className: "bg-violet text-on-primary", icon: BookOpen },
  Actualité: { className: "bg-info text-on-primary", icon: Newspaper },
  Conseils: { className: "bg-available text-on-primary", icon: Lightbulb },
  Événement: { className: "bg-gold-bright text-heading", icon: CalendarDays },
  Technologie: { className: "bg-info text-on-primary", icon: Sparkles },
  // Exemples fictifs (fixtures) encore utilisés en développement.
  Recommandation: { className: "bg-violet text-on-primary", icon: BookOpen },
  Analyse: { className: "bg-info text-on-primary", icon: LineChart },
  "Vie de la bibliothèque": { className: "bg-gold-bright text-heading", icon: BookOpen },
}

export function publicationKind(kind) {
  return KIND_META[kind] || { className: "bg-lavender text-violet", icon: BookOpen }
}
