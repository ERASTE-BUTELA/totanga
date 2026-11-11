-- Exécuté une seule fois à la création du volume PostgreSQL.
-- Les extensions de recherche doivent exister avant les migrations catalogue.
-- L'utilisateur créé par l'image reste propriétaire de la base ; le retirer
-- du rôle super-utilisateur se fait après le premier migrate réussi
-- (voir docs de déploiement). Les extensions sont déjà en place ici.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
