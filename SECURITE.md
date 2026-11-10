# Sécurité — Totanga

Règles du portail de la bibliothèque Totanga. Elles s'appuient sur l'OWASP Top 10 (contrôle d'accès, secrets, injection, configuration, dépendances, authentification, journaux) et sur la checklist de déploiement de Django.

Chaque point de la checklist est **Appliqué**, **À faire**, ou **Non applicable**. État au 9 novembre 2026. Le conteneur actuel lance les réglages de développement : `DEBUG` y est vrai, et c'est voulu. Les protections de production sont dans `config.settings.production`.

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
- **Ressources.** Pas de script, de police ou d'image chargé depuis un site que nous ne maîtrisons pas. Tout est servi par Totanga.
- **Production.** Pas de `console.log` technique, pas de source maps publiées.
- **En-têtes HTTP à la mise en ligne.** Politique de contenu (CSP), interdiction d'affichage dans un cadre, type de contenu forcé (`nosniff`), politique de référent, HTTPS forcé.

## Backend (Django et API)

- **Production.** `DEBUG` est faux. La clé secrète et les mots de passe viennent uniquement de l'environnement. `ALLOWED_HOSTS` liste les vrais domaines, jamais `*`.
- **Transport.** Cookies de session et CSRF marqués sécurisés, redirection HTTPS, HSTS. Derrière un reverse proxy, Django doit connaître l'en-tête qui indique HTTPS.
- **CSRF.** Le middleware CSRF reste actif. Les origines de confiance sont explicites.
- **Session du personnel.** Déconnexion après 30 minutes sans activité, et au plus tard au bout de 10 heures. Le cookie de session n'est pas lisible par un script. Le cookie CSRF le reste, pour que l'écran d'administration puisse l'envoyer. Cinq échecs de connexion bloquent les suivants pendant 15 minutes. La réponse est la même si le compte n'existe pas.
- **CORS.** Limité au domaine du site. `CORS_ALLOW_ALL_ORIGINS` reste faux.
- **API publique.** Lecture seule, sauf une exception : un visiteur peut envoyer un message à la bibliothèque. Il ne peut ni le modifier ni le supprimer. L'adresse électronique est conservée pour le personnel et n'est jamais renvoyée ni affichée. L'administration reste réservée au personnel connecté.
- **Abus.** Limiter le nombre de requêtes, en particulier sur la connexion. L'adresse de l'administration n'est pas `/admin/`.
- **Mots de passe.** Validateurs Django actifs (longueur, complexité, mots de passe courants).
- **Fichiers.** Type et taille contrôlés. Les images du catalogue : JPG, PNG ou WebP, 2 Mo maximum. Aucun envoi de livre (PDF ou autre).
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
| Images limitées au JPG, PNG, WebP et à 2 Mo | Appliqué |
| Aucune requête SQL écrite à la main | Appliqué |
| Aucun secret dans les journaux de la commande d'administrateur | Appliqué |
| Compte administrateur du quotidien dans le groupe, sans privilège technique de super-utilisateur | Appliqué |
| Session du personnel : 30 minutes d'inactivité, 10 heures au maximum, cookie de session illisible par un script | Appliqué |
| Limitation des tentatives de connexion : 5 échecs, puis 15 minutes, même réponse si le compte n'existe pas | Appliqué |
| Journal des actions du personnel : qui, quoi, quel objet, quand, sans mot de passe, clé, adresse ni message | Appliqué |
| Administration Django `/admin/` absente en production ; API du personnel sous `/api/gestion/` | Appliqué |
| Port PostgreSQL non publié vers la machine | Appliqué |
| `.env` exclu de Git et de l'image Docker | Appliqué |
| Réglages de développement et de production séparés | Appliqué |
| Versions Python verrouillées dans `requirements.txt` | Appliqué |
| `python manage.py check --deploy` réussi avec les réglages de production | Appliqué |
| Pas de compte lecteur. L'adresse d'un message est réservée au personnel et n'est pas publiée | Appliqué |
| Message public : création seulement, texte sans balise, 8 envois par heure sur l'adresse de connexion | Appliqué |
| Aucune ressource chargée depuis un site externe | Appliqué |
| Politique de contenu CSP | À faire |
| Dire à Django qu'un reverse proxy termine le HTTPS (`SECURE_PROXY_SSL_HEADER`) | À faire |
| Origine CORS et `ALLOWED_HOSTS` du vrai domaine de production | À faire |
| API publique de consultation (livres, annonces, événements, publications) | À faire |
| Limitation générale du nombre de requêtes, au-delà de la connexion et des messages | À faire |
| Utilisateur PostgreSQL aux droits limités | À faire |
| Sauvegardes régulières, avec un essai de restauration | À faire |
| Application d'administration séparée, sans lien depuis le site public, non référencée | Appliqué |
| Session d'administration : cookie HttpOnly seulement, jeton CSRF relu à chaque envoi, rien dans localStorage | Appliqué |
| Comptes d'essai des trois rôles : commande de développement, refusée lorsque DEBUG est faux | Appliqué |
| Conteneur frontend lancé sans être administrateur | Appliqué |
| Conteneur de l'administration lancé sans être administrateur | Appliqué |
| Conteneurs backend et base lancés sans être administrateur | À faire |
| Rythme de mise à jour des images et contrôle des failles des paquets | À faire |
| Module unique d'appel à l'API, message d'erreur sans détail technique | Appliqué |
| Liens des contenus limités à http et https, ouverture sécurisée | Appliqué |
| Pas de HTML brut, pas de secret et pas de ressource externe dans le frontend | Appliqué |
| Build de production sans source maps ni `console` | Appliqué |
| Versions du frontend verrouillées (`package-lock.json`) | Appliqué |
| Nettoyage d'un contenu HTML riche | À faire |

Le formulaire de publication accepte un texte mis en forme. Le navigateur ne garde que quelques balises (paragraphe, gras, italique, souligné, listes, citation, lien http ou https, tableau simple). Le nettoyage côté serveur reste à faire lorsque ce contenu sera enregistré.
