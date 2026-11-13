# Sécurité — Totanga

Règles du portail de la bibliothèque Totanga. Elles s'appuient sur l'OWASP Top 10 (contrôle d'accès, secrets, injection, configuration, dépendances, authentification, journaux) et sur la checklist de déploiement de Django.

Chaque point de la checklist est **Appliqué**, **À faire**, ou **Non applicable**. État au 11 novembre 2026. Le compose de développement lance `config.settings.development` (`DEBUG` vrai). Le compose de production (`docker-compose.production.yml`) lance `config.settings.production`.

## Principes

- **Moindre privilège.** Un compte, un conteneur ou un utilisateur de base n'a que les droits dont il a besoin.
- **Ne jamais faire confiance aux données reçues.** Tout ce qui vient du navigateur, d'une API ou d'un fichier envoyé est contrôlé côté serveur.
- **Défense en plusieurs couches.** Une validation dans le formulaire ne remplace pas la base, les en-têtes HTTP ni les droits du compte.
- **Aucune clé secrète dans le code.** Mots de passe, clé Django et accès à la base vivent dans `.env`, jamais dans Git.

## Frontend (React / Vite)

Le site public n'a pas de compte lecteur. Les fondations du site appliquent déjà ces règles. Les pages de contenu les réutiliseront.

- **Injection de code (XSS).** Ne jamais insérer du HTML venu de l'API tel quel. Pas de `dangerouslySetInnerHTML` sans nettoyage, pas de `eval`, pas de script écrit dans la page.
- **Aucun secret dans le frontend.** Tout fichier livré au navigateur est public. Seule l'adresse publique de l'API peut y figurer.
- **Liens issus des contenus.** Une adresse saisie par le personnel (inscription à un événement, par exemple) n'est acceptée que si elle commence par `http://` ou `https://`. Un lien externe s'ouvre avec `rel="noopener noreferrer"`.
- **Données de l'API.** Titres, résumés, noms et URL sont des données non fiables, même si notre base les a enregistrées.
- **Un seul accès à l'API.** Un module unique appelle l'API. En cas d'erreur, l'écran affiche un message simple, jamais la trace technique, le code SQL ou le détail du serveur.
- **Navigateur.** Pas de jeton, de mot de passe ni de donnée personnelle dans `localStorage` ou `sessionStorage`. L'administration lit le cookie CSRF et le renvoie. Le cookie de session reste illisible par un script.
- **Administration.** Application séparée du site public, sans lien depuis celui-ci, non proposée aux moteurs de recherche. Le menu masque une entrée, mais le serveur décide.
- **Ressources.** Pas de script, de police ou d'image chargé depuis un site que nous ne maîtrisons pas. Tout est servi par Totanga. **Exception :** la localisation de la bibliothèque peut être affichée via l'API Google Maps Embed (`iframe` vers `google.com/maps/embed`), uniquement pour ce besoin. La clé `VITE_GOOGLE_MAPS_EMBED_KEY` reste dans `.env`, restreinte par référent HTTP, et n'est pas un secret d'administration (elle est exposée au navigateur comme toute clé Embed).
- **Production.** Pas de `console.log` technique, pas de source maps publiées.
- **En-têtes HTTP à la mise en ligne.** Politique de contenu (CSP), interdiction d'affichage dans un cadre, type de contenu forcé (`nosniff`), politique de référent, HTTPS forcé.

## Backend (Django et API)

- **Production.** `DEBUG` est faux. La clé secrète et les mots de passe viennent uniquement de l'environnement. `ALLOWED_HOSTS` liste les vrais domaines, jamais `*`.
- **Transport.** Cookies de session et CSRF marqués sécurisés, redirection HTTPS, HSTS. Derrière un reverse proxy, Django doit connaître l'en-tête qui indique HTTPS.
- **CSRF.** Le middleware CSRF reste actif. Les origines de confiance sont explicites.
- **Session du personnel.** Déconnexion après 30 minutes sans activité, et au plus tard au bout de 10 heures. Le cookie de session n'est pas lisible par un script. Le cookie CSRF le reste, pour que l'écran d'administration puisse l'envoyer. Cinq échecs de connexion bloquent les suivants pendant 15 minutes. La réponse est la même si le compte n'existe pas.
- **CORS.** Limité au domaine du site. `CORS_ALLOW_ALL_ORIGINS` reste faux.
- **API publique.** Lecture seule, sauf une exception : un visiteur peut envoyer un message à la bibliothèque. Il ne peut ni le modifier ni le supprimer. L'adresse électronique ou le numéro WhatsApp est conservé pour le personnel et n'est jamais renvoyé ni affiché au public. L'administration reste réservée au personnel connecté.
- **Abus.** Limiter le nombre de requêtes, en particulier sur la connexion. L'adresse de l'administration n'est pas `/admin/`.
- **Mots de passe.** Validateurs Django actifs (longueur, complexité, mots de passe courants).
- **Fichiers.** Type et taille contrôlés. Les images du catalogue : JPG, PNG ou WebP, 5 Mo maximum. Aucun envoi de livre (PDF ou autre).
- **Contenu riche.** Si un champ accepte du HTML, il est nettoyé côté serveur avant enregistrement.
- **Base.** Pas de SQL écrit à la main : l'ORM Django construit les requêtes. L'utilisateur PostgreSQL de l'application n'est pas super-utilisateur.
- **Journaux.** Pas de mot de passe, de clé secrète, d'adresse électronique, d'adresse IP ni de corps de message. Le journal du personnel note qui a fait quoi, sur quel objet, et quand. Des sauvegardes régulières de la base sont prévues et restaurées à l'essai.

## Docker et déploiement

- Les conteneurs ne tournent pas en administrateur (`root`). Le site public le respecte déjà. Le serveur PostgreSQL tourne avec l'utilisateur `postgres` ; l'image officielle doit toutefois démarrer en administrateur le temps de préparer le volume, puis elle baisse les droits. Le backend reste administrateur : le dossier des images lui appartient et n'est pas accessible en écriture à un autre utilisateur, donc le changer casserait le dépôt des couvertures.
- En production, PostgreSQL n'a pas de port ouvert vers l'extérieur. Seul le backend lui parle, sur le réseau Docker.
- Les images officielles sont mises à jour, et les failles connues sont vérifiées avant une mise en ligne.
- `.env` n'est ni versionné, ni copié dans l'image, ni publié.
- Les réglages de développement et de production restent séparés. La production utilise `config.settings.production`.

## Dépendances et travail avec l'IA

- Les versions des paquets sont verrouillées (`requirements.txt`, puis le fichier de verrouillage du frontend).
- Les failles connues des paquets sont vérifiées régulièrement, et avant chaque mise en ligne.
- Aucun paquet nouveau n'est ajouté sans l'accord du responsable du projet, avec le pourquoi.
- L'assistant suit `.cursor/rules/securite.mdc` : il lit ce document, ne contourne pas une protection en silence, n'écrit pas de secret, signale les risques et met à jour la checklist.

## Checklist avant mise en ligne

| Point | État |
| --- | --- |
| Clé secrète et mots de passe uniquement dans `.env`, fichier ignoré par Git | Appliqué |
| `DEBUG` faux dans les réglages de production | Appliqué |
| Hôtes autorisés exigés en production, `*` refusé | Appliqué |
| Cookies de session et CSRF sécurisés, HTTPS et HSTS en production | Appliqué |
| Protection CSRF active | Appliqué |
| CORS fermé (`CORS_ALLOW_ALL_ORIGINS` faux, origines listées) | Appliqué |
| En-tête anti-cadre (`X-Frame-Options: DENY`) | Appliqué |
| Type de contenu forcé (`nosniff`) en production | Appliqué |
| Politique de référent `same-origin` | Appliqué |
| Mots de passe contrôlés par les validateurs Django | Appliqué |
| Images limitées au JPG, PNG, WebP et à 5 Mo, redimensionnées et sans données d'appareil photo | Appliqué |
| API publique de consultation des livres | Appliqué |
| API publique des annonces et des événements | Appliqué |
| API publique des publications | Appliqué |
| Limitation du nombre de lectures du catalogue | Appliqué |
| Limitation du nombre de lectures des annonces et des événements (`content_read`, 120 par minute, adresse de connexion) | Appliqué |
| Limitation générale du nombre de requêtes, au-delà du catalogue, des annonces, des événements, de la connexion et des messages | À faire |
| Utilisateur PostgreSQL aux droits limités | À faire. `deploy/postgres/init-extensions.sql` crée `unaccent` et `pg_trgm` à l'init du volume. En développement le compte reste super-utilisateur. En production, après le premier migrate réussi, retirer le super-utilisateur du rôle applicatif (`ALTER ROLE … NOSUPERUSER`). |
| Aucune requête SQL écrite à la main dans les vues | Appliqué. Les verrous et les extensions sont du SQL de schéma, dans les migrations. La remise à zéro du catalogue d'exemple est une commande de développement qui désactive le verrou le temps de l'effacement, et elle refuse la production. |
| Aucun secret dans les journaux de la commande d'administrateur | Appliqué |
| Compte administrateur du quotidien dans le groupe, sans privilège technique de super-utilisateur | Appliqué |
| Super-administrateur technique, sans groupe : tous les menus et toutes les actions, journal compris | Appliqué |
| Dernier administrateur impossible à désactiver, à retirer du groupe ou à supprimer | Appliqué |
| Annonce et publication : suppression définitive autorisée pour le personnel habilité ; archivage toujours possible. Événement : pas de suppression, archivage seulement. Le brouillon et l'archivé restent hors de l'API publique | Appliqué |
| Prix d'acquisition et registre d'import absents de l'API publique | Appliqué |
| Session du personnel : 30 minutes d'inactivité, 10 heures au maximum, cookie de session illisible par un script | Appliqué |
| Limitation des tentatives de connexion : 5 échecs, puis 15 minutes, même réponse si le compte n'existe pas | Appliqué |
| Journal des actions du personnel : qui, quoi, quel objet, quand, sans mot de passe, clé, adresse ni message | Appliqué |
| Administration Django `/admin/` absente en production ; API du personnel sous `/api/gestion/` | Appliqué |
| Port PostgreSQL non publié vers la machine | Appliqué |
| `.env` exclu de Git et de l'image Docker | Appliqué |
| Réglages de développement et de production séparés | Appliqué |
| Versions Python verrouillées dans `requirements.txt` | Appliqué |
| `python manage.py check --deploy` réussi avec les réglages de production | Appliqué |
| Pas de compte lecteur. L'email ou le WhatsApp d'un message est réservé au personnel et n'est pas publié | Appliqué |
| Message public : création seulement, texte sans balise, 8 envois par heure sur l'adresse de connexion | Appliqué |
| Aucune ressource chargée depuis un site externe (sauf carte Google Maps Embed pour la localisation de la bibliothèque) | Appliqué |
| Politique de contenu CSP | À faire |
| Dire à Django qu'un reverse proxy termine le HTTPS (`SECURE_PROXY_SSL_HEADER`) | Appliqué |
| Origine CORS et `ALLOWED_HOSTS` du vrai domaine de production | À faire. Les placeholders et l'exemple `bibtotanga.com` sont dans `.env.example` ; les vrais sous-domaines restent à renseigner avant la mise en ligne. |
| Sauvegardes régulières, avec un essai de restauration | À faire |
| Application d'administration séparée, sans lien depuis le site public, non référencée | Appliqué |
| Session d'administration : cookie HttpOnly seulement, jeton CSRF relu à chaque envoi, rien dans localStorage | Appliqué |
| Comptes d'essai des trois rôles et du super-administrateur : commande de développement, refusée lorsque DEBUG est faux | Appliqué |
| Conteneur frontend lancé sans être administrateur | Appliqué |
| Conteneur de l'administration lancé sans être administrateur | Appliqué |
| Conteneurs backend et base lancés sans être administrateur | À faire |
| Rythme de mise à jour des images et contrôle des failles des paquets | À faire |
| Module unique d'appel à l'API, message d'erreur sans détail technique | Appliqué |
| Liens des contenus limités à http et https, ouverture sécurisée | Appliqué |
| Pas de HTML brut, pas de secret et pas de ressource externe dans le frontend (hors iframe Maps Embed pour la localisation) | Appliqué |
| Build de production sans source maps ni `console` | Appliqué |
| Versions du frontend verrouillées (`package-lock.json`) | Appliqué |
| Nettoyage d'un contenu HTML riche | Appliqué. « À propos » (paramètres) et contenu des publications sont nettoyés côté serveur (même famille de balises que l'éditeur). Affichage public via SafeHtml. |

Le formulaire de publication accepte un texte mis en forme. Le navigateur ne garde que quelques balises (paragraphe, gras, italique, souligné, listes, citation, lien http ou https, tableau simple). Le nettoyage côté serveur s'applique à la fiche bibliothèque et aux publications.
