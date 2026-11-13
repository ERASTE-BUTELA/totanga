# Tâches avant la mise en ligne

- Écrire la page de confidentialité. Elle reste une page fixe, hors de la base, et doit exister avant l'ouverture du site au public.

## Page de confidentialité — fréquentation du site

À mentionner clairement :

- Ce qui est mesuré :
  - **Visiteur** : empreinte quotidienne distincte (une fois par jour) ;
  - **Visite** : séjour continu ; une nouvelle visite commence après 30 minutes sans activité, ou le lendemain ;
  - **Page vue** : chaque page ouverte (y compris les changements de page sans rechargement), hors rechargements instantanés et robots ;
  - livres et catégories consultés, termes de recherche les plus fréquents (agrégés), type d'appareil, origine approximative du lien (direct, WhatsApp, Facebook, moteur de recherche).
- Ce qui n'est **pas** mesuré ni stocké : adresse IP, cookie de suivi, traceur publicitaire, service d'analyse externe, e-mail, numéro de téléphone, nom, compte lecteur.
- Comment l'estimation d'un visiteur est faite : empreinte quotidienne calculée côté serveur (adresse de connexion + navigateur + sel secret qui change chaque jour), jamais enregistrée en clair.
- Durée : les détails de fréquentation sont effacés après 90 jours ; seuls des compteurs agrégés (totaux par jour) sont conservés.
- Accès : réservé à l'administration de la bibliothèque (permission dédiée), jamais exposé sur le site public.
- Limite : le pays ou la ville du visiteur ne sont pas déterminés (aucune base géographique locale et aucun service externe).
