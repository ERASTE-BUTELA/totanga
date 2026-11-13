export const STAFF_ROLES = [
  {
    code: "administrateur",
    label: "Administrateur",
    chip: "bg-lavender text-violet",
    permissions: [
      "Gérer le catalogue : livres, auteurs, éditeurs, catégories et exemplaires.",
      "Voir, ajouter et modifier les comptes du personnel.",
      "Lire les messages des visiteurs.",
      "Consulter le journal des actions.",
      "Consulter les statistiques de fréquentation du site public.",
      "Voir, ajouter, modifier et supprimer les annonces et les publications.",
      "Voir, ajouter et modifier les événements (archivage, sans suppression).",
    ],
  },
  {
    code: "bibliothecaire",
    label: "Bibliothécaire",
    chip: "bg-available-soft text-available",
    permissions: [
      "Voir, ajouter et modifier les livres, les auteurs, les éditeurs et les catégories.",
      "Gérer les exemplaires.",
      "Archiver un livre. Personne ne peut le supprimer.",
    ],
  },
  {
    code: "redacteur",
    label: "Rédacteur",
    chip: "bg-info-soft text-info",
    permissions: [
      "Voir, ajouter, modifier et supprimer les annonces et les publications.",
      "Voir, ajouter et modifier les événements (archivage, sans suppression).",
    ],
  },
  {
    code: "depannage",
    label: "Super-administrateur",
    chip: "bg-warning-soft text-warning",
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
