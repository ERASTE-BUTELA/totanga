let announcements = [
  { id: 1, order: 1, image: "/images/annonces/horaires.webp", title: "Nouveaux horaires de la bibliothèque", type: "Horaires", category: "Vie de la bibliothèque", starts: "2026-11-10", ends: "2026-12-31", status: "Publié", pinned: true, content: "Chers usagers,\n\nNous vous informons de la mise en vigueur de nouveaux horaires d'ouverture de la Bibliothèque Totanga à partir du lundi 10 novembre 2026.\n\nLundi – Vendredi : 08 h 00 – 17 h 00\nSamedi : 09 h 00 – 14 h 00\n\nNous vous remercions pour votre compréhension et vous invitons à planifier vos visites en conséquence." },
  { id: 2, order: 2, image: "/images/annonces/acquisitions.webp", title: "Nouvelles acquisitions : plus de 200 ouvrages", type: "Nouveauté", category: "Catalogue", starts: "2026-11-05", ends: "2026-11-30", status: "Publié", pinned: false, content: "Plus de 200 ouvrages rejoignent les rayons ce mois-ci." },
  { id: 3, order: 3, image: "", title: "Fermeture exceptionnelle", type: "Important", category: "Information générale", starts: "2026-11-20", ends: "2026-11-22", status: "Publié", pinned: false, content: "La bibliothèque sera exceptionnellement fermée du 20 au 22 novembre 2026." },
  { id: 4, order: 4, image: "/images/publications/lectures.webp", title: "Réouverture de la salle de travail en groupe", type: "Information", category: "Services", starts: "2026-11-03", ends: "2026-11-30", status: "Publié", pinned: false, content: "La salle de travail en groupe est de nouveau ouverte." },
  { id: 5, order: 5, image: "/images/publications/lecture.webp", title: "Mise à jour des conditions d'accès", type: "Règlement", category: "Accès et services", starts: "2026-11-01", ends: "2026-12-31", status: "Publié", pinned: false, content: "Les conditions d'accès aux salles ont été mises à jour." },
  { id: 6, order: 6, image: "/images/publications/semaine.webp", title: "Don de livres à la bibliothèque", type: "Appel à contribution", category: "Partenariat", starts: "2026-10-25", ends: "2026-11-30", status: "Publié", pinned: false, content: "Vous pouvez proposer un don de livres à l'accueil." },
  { id: 7, order: 7, image: "/images/publications/hero.webp", title: "Semaine du livre : programme des activités", type: "Événement", category: "Animation culturelle", starts: "2026-11-15", ends: "2026-11-21", status: "Publié", pinned: true, content: "Retrouvez le programme de la semaine du livre." },
  { id: 8, order: 8, image: "/images/publications/ecrans.webp", title: "Votre avis compte ! Participez à notre enquête", type: "Sondage", category: "Amélioration des services", starts: "2026-11-05", ends: "2026-11-25", status: "Brouillon", pinned: false, content: "Quelques minutes suffisent pour répondre à l'enquête." },
  { id: 9, order: 9, image: "/images/publications/ecrans.webp", title: "Maintenance du site web", type: "Information", category: "Services numériques", starts: "2026-11-12", ends: "2026-11-12", status: "Publié", pinned: false, content: "Le site sera indisponible quelques heures le 12 novembre." },
  { id: 10, order: 10, image: "/images/publications/hero.webp", title: "Participation au Salon du livre de Kinshasa", type: "Événement", category: "Événements externes", starts: "2026-11-28", ends: "2026-12-05", status: "Archivé", pinned: false, content: "La bibliothèque sera présente au Salon du livre de Kinshasa." },
]

const reading = "<p>La lecture ouvre l'esprit, enrichit la pensée et prépare un avenir meilleur. Dans un monde en constante évolution, elle reste un outil puissant de connaissance, de réflexion et de réussite.</p><p>À la Bibliothèque Totanga, nous encourageons chacun, jeune ou adulte, à faire de la lecture une habitude quotidienne. C'est un véritable pont vers de nouvelles opportunités : réussite scolaire, développement personnel et engagement citoyen.</p><blockquote><p>« Lire aujourd'hui, c'est bâtir les bases d'un avenir éclairé. »</p></blockquote><p>Venez découvrir notre sélection d'ouvrages et nos espaces de lecture, ouverts à tous !</p>"
const readingExcerpt = "La lecture ouvre l'esprit, enrichit la pensée et prépare un avenir meilleur. Découvrez pourquoi elle reste un outil essentiel de connaissance et de réussite."

function publication(record) {
  const safe = record.title.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]))
  return { pinned: false, content: `<p>${safe}</p>`, excerpt: record.title, ...record }
}

let publications = [
  publication({ id: 1, order: 1, image: "/images/publications/lecture.webp", title: "L'importance de la lecture à l'ère numérique", category: "Culture", author: "Martin Kabasele", status: "Publié", featured: true, publishedAt: "2026-11-10T14:30", content: reading, excerpt: readingExcerpt }),
  publication({ id: 2, order: 2, image: "/images/publications/lectures.webp", title: "Nouveautés du mois : 10 livres à découvrir", category: "Actualité", author: "Aline Mbuyi", status: "Publié", featured: false, publishedAt: "2026-11-05T09:15" }),
  publication({ id: 3, order: 3, image: "/images/publications/semaine.webp", title: "Pourquoi lire ? Les bienfaits de la lecture", category: "Conseils", author: "Jean-Pierre Tshala", status: "Publié", featured: false, publishedAt: "2026-10-28T16:20" }),
  publication({ id: 4, order: 4, image: "/images/publications/hero.webp", title: "Salon du Livre de Kinshasa 2026", category: "Événement", author: "Comité Totanga", status: "Publié", featured: true, publishedAt: "2026-10-20T11:10" }),
  publication({ id: 5, order: 5, image: "/images/publications/lecture.webp", title: "Hommage à Sony Labou Tansi", category: "Culture", author: "Denis Mukwege", status: "Publié", featured: false, publishedAt: "2026-10-15T17:45" }),
  publication({ id: 6, order: 6, image: "/images/publications/ecrans.webp", title: "La bibliothèque à l'ère du numérique", category: "Technologie", author: "Aline Mbuyi", status: "Brouillon", featured: false, publishedAt: "2026-10-12T10:25" }),
  publication({ id: 7, order: 7, image: "/images/publications/lectures.webp", title: "Lire pour rêver, lire pour réussir", category: "Conseils", author: "Martin Kabasele", status: "Publié", featured: true, publishedAt: "2026-10-08T09:50" }),
  publication({ id: 8, order: 8, image: "/images/publications/semaine.webp", title: "Citation du mois : « La lecture éclaire la vie »", category: "Culture", author: "Jean-Pierre Tshala", status: "Publié", featured: false, publishedAt: "2026-10-01T13:30" }),
]

function copy(list) {
  return list.map((item) => ({ ...item }))
}

export function readAnnouncements() {
  return copy(announcements)
}

export function readAnnouncement(id) {
  return copy(announcements).find((item) => item.id === Number(id)) || null
}

export function saveAnnouncement(record) {
  if (record.id) {
    announcements = announcements.map((item) => (item.id === record.id ? { ...item, ...record } : item))
    return record.id
  }
  const id = Math.max(0, ...announcements.map((item) => item.id)) + 1
  announcements = [{ ...record, id, order: 0 }, ...announcements]
  return id
}

export function removeAnnouncement(id) {
  announcements = announcements.filter((item) => item.id !== Number(id))
}

export function readPublications() {
  return copy(publications)
}

export function readPublication(id) {
  return copy(publications).find((item) => item.id === Number(id)) || null
}

export function savePublication(record) {
  if (record.id) {
    publications = publications.map((item) => (item.id === record.id ? { ...item, ...record } : item))
    return record.id
  }
  const id = Math.max(0, ...publications.map((item) => item.id)) + 1
  publications = [{ ...record, id, order: 0 }, ...publications]
  return id
}

export function removePublication(id) {
  publications = publications.filter((item) => item.id !== Number(id))
}

let events = [
  { id: 1, order: 1, image: "/images/publications/lectures.webp", title: "Atelier de lecture pour les jeunes", summary: "Découvrir le plaisir de la lecture.", type: "Atelier", starts: "2026-11-15", ends: "2026-11-15", startTime: "10:00", endTime: "12:00", place: "Salle de lecture A", organizer: "Équipe Jeunesse", registered: 42, capacity: 50, status: "À venir" },
  { id: 2, order: 2, image: "/images/publications/ecrans.webp", title: "Conférence : La lecture à l'ère du numérique", summary: "Quel avenir pour le livre ?", type: "Conférence", starts: "2026-11-20", ends: "2026-11-20", startTime: "14:00", endTime: "16:30", place: "Auditorium", organizer: "Bibliothèque Totanga", registered: 118, capacity: 150, status: "À venir" },
  { id: 3, order: 3, image: "/images/publications/hero.webp", title: "Salon du livre de Kinshasa 2026", summary: "Rencontre avec des auteurs et éditeurs.", type: "Salon", starts: "2026-11-28", ends: "2026-11-30", startTime: "09:00", endTime: "17:00", place: "Esplanade principale", organizer: "Comité du salon", registered: 356, capacity: 500, status: "À venir" },
  { id: 4, order: 4, image: "/images/publications/semaine.webp", title: "Heure du conte", summary: "Lectures et contes pour enfants.", type: "Animation", starts: "2026-11-08", ends: "2026-11-08", startTime: "15:00", endTime: "16:00", place: "Espace Enfants", organizer: "Équipe Jeunesse", registered: 28, capacity: 30, status: "Passé" },
  { id: 5, order: 5, image: "/images/publications/ecrans.webp", title: "Initiation à la recherche documentaire", summary: "Apprendre à utiliser les ressources de la bibliothèque.", type: "Formation", starts: "2026-11-01", ends: "2026-11-01", startTime: "09:00", endTime: "12:00", place: "Salle multimédia", organizer: "Équipe Formation", registered: 25, capacity: 30, status: "Passé" },
  { id: 6, order: 6, image: "/images/publications/lecture.webp", title: "Club de lecture – Numéro 12", summary: "Discussion autour d'un roman contemporain.", type: "Club", starts: "2026-11-22", ends: "2026-11-22", startTime: "16:00", endTime: "18:00", place: "Salle de réunion", organizer: "Club de lecture", registered: 18, capacity: 20, status: "À venir" },
  { id: 7, order: 7, image: "/images/annonces/acquisitions.webp", title: "Atelier d'écriture créative", summary: "Développer son imagination et son style.", type: "Atelier", starts: "2026-11-29", ends: "2026-11-29", startTime: "10:00", endTime: "13:00", place: "Salle de formation", organizer: "Équipe Culture", registered: 20, capacity: 25, status: "À venir" },
  { id: 8, order: 8, image: "/images/annonces/horaires.webp", title: "Exposition : Patrimoine et mémoire de Kinshasa", summary: "Une immersion dans l'histoire de la ville.", type: "Exposition", starts: "2026-12-10", ends: "2026-12-20", startTime: "09:00", endTime: "17:00", place: "Galerie de la bibliothèque", organizer: "Service Culturel", registered: null, capacity: null, status: "En cours" },
]

export function readEvents() {
  return copy(events)
}

export function readEvent(id) {
  return copy(events).find((item) => item.id === Number(id)) || null
}

export function saveEvent(record) {
  if (record.id) {
    events = events.map((item) => (item.id === record.id ? { ...item, ...record } : item))
    return record.id
  }
  const id = Math.max(0, ...events.map((item) => item.id)) + 1
  events = [{ ...record, id, order: 0 }, ...events]
  return id
}

export function removeEvent(id) {
  events = events.filter((item) => item.id !== Number(id))
}
