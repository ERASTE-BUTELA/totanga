export const STAFF_ROLES = [
  {
    code: "administrateur",
    label: "Administrateur",
    chip: "bg-lavender text-violet",
    permissions: [
      "Gérer le catalogue : livres, auteurs, catégories et exemplaires.",
      "Voir, ajouter et modifier les comptes du personnel.",
      "Lire les messages des visiteurs.",
      "Consulter le journal des actions.",
    ],
  },
  {
    code: "bibliothecaire",
    label: "Bibliothécaire",
    chip: "bg-available-soft text-available",
    permissions: [
      "Voir, ajouter et modifier les livres, les auteurs et les catégories.",
      "Gérer les exemplaires.",
      "Archiver un livre. Personne ne peut le supprimer.",
    ],
  },
  {
    code: "redacteur",
    label: "Rédacteur",
    chip: "bg-[#e7eefc] text-[#1d4ed8]",
    permissions: [
      "Les droits sur les annonces, les publications et les événements seront ajoutés avec ces contenus.",
      "Aucun droit n'est accordé pour le moment.",
    ],
  },
  {
    code: "depannage",
    label: "Dépannage",
    chip: "bg-[#fde7c7] text-[#9a3412]",
    permissions: [
      "Compte technique. Il ne sert pas au travail quotidien de la bibliothèque.",
    ],
  },
]

export function roleOf(code) {
  return STAFF_ROLES.find((role) => role.code === code) || {
    code: code || "",
    label: code ? code : "Sans rôle",
    chip: "bg-canvas text-muted",
    permissions: ["Ce compte n'a aucun rôle."],
  }
}
