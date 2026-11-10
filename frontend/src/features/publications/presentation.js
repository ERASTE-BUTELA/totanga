import { BookOpen, Building2, LineChart } from "lucide-react"

const KIND_META = {
  Recommandation: { className: "bg-violet text-white", icon: BookOpen },
  Analyse: { className: "bg-[#1d4ed8] text-white", icon: LineChart },
  "Vie de la bibliothèque": { className: "bg-gold-bright text-heading", icon: Building2 },
}

export function publicationKind(kind) {
  return KIND_META[kind] || { className: "bg-lavender text-violet", icon: BookOpen }
}
