# Plan de correction recommandé

Ce document ne réalise aucune correction.

## P0 — Décisions d'architecture

1. Valider la propriété des cachets : agence uniquement, ou agence + concession.
2. Valider la liste des ressources centrales délégables.
3. Réserver explicitement au vrai Super Admin les seules opérations système trans-concessions.

Critère de sortie : matrice permission × propriété métier × profils approuvée.

## P1 — Cachets et catégories

- aligner le contrat UI/API;
- ne jamais déduire une concession d'un identifiant fourni sans vérifier l'agence active;
- si agence obligatoire, injecter l'agence active côté serveur et rejeter un identifiant client divergent;
- si cachet central, créer un chemin central séparé, limité à la concession active;
- qualifier les données historiques avant migration.

Tests : formulaire réel, multipart, Super Admin, habilité, non habilité, `OWN`, agence A/B, changement d'agence, cachet central historique.

## P1 — Autorisations centrales

- introduire un helper fondé sur permission + concession active;
- remplacer progressivement `requireCentralAgencyPermission` sur les ressources délégables;
- conserver un helper système distinct pour les opérations réellement globales;
- harmoniser le frontend pour ne montrer une action que si le backend l'autorise réellement.

Priorité d'application : identité/logo, paramètres généraux, documents, constructeurs, checklist/services livraison, barèmes, agences, rôles/affectations, politiques 2FA.

## P2 — Tests et contrats

- ajouter des tests de contrat qui importent le sérialiseur frontend;
- tester un utilisateur ordinaire habilité, pas seulement Super Admin;
- remplacer les assertions `requireCentralAgencyPermission`/`isSuperAdmin` par des résultats HTTP et SQL attendus;
- ajouter les refus inter-concessions et inter-agences;
- vérifier les effets MySQL et l'audit.

## P2 — Données et déploiement

- fournir un script de diagnostic en lecture seule pour les cachets et scopes;
- rendre l'application indisponible au démarrage si la migration terminale manque;
- étiqueter les images avec le SHA Git et exposer une version non sensible;
- comparer frontend, backend et migrations avant déploiement.

## P3 — Qualification finale

- exécuter la matrice des six profils dans une recette isolée;
- rejouer les workflows financiers, documents, livraisons, SAV, RH et stock;
- réaliser un test de sécurité authentifié ciblé IDOR/inter-agences;
- n'autoriser la production qu'après absence d'anomalie critique/majeure ouverte.

## Séquencement sûr

La modification du helper central en une seule fois aurait un rayon d'impact trop large. Procéder endpoint par endpoint, derrière tests positifs et négatifs, puis supprimer l'ancien comportement seulement lorsqu'aucun appel délégable ne subsiste.
