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
      "Voir, ajouter et modifier les annonces et les événements.",
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
      "Voir, ajouter et modifier les annonces et les événements.",
      "Les publications seront ajoutées plus tard.",
    ],
  },
  {
    code: "depannage",
    label: "Super-administrateur",
    chip: "bg-[#fde7c7] text-[#9a3412]",
    permissions: [
      "Accès à tous les menus et à toutes les actions, sans groupe.",
      "Un livre ne se supprime pas : il s'archive.",
      "Le dernier administrateur ne peut être ni désactivé ni supprimé.",
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
