# AUDIT-ERP-02 — Rapport CRM et Clients 360°

Date : 2026-10-10  
Nature : audit statique, tests ciblés et analyse intermodules, sans correction.

## Synthèse

Le socle CRM est globalement structuré : permissions dynamiques, scopes SQL, affectation contrôlée, workflow devis/essai, conversion transactionnelle en client et gestion explicite des erreurs. L'audit relève toutefois des risques importants : transitions arrière non bornées, timeline 360° partiellement non scopée, absence de détection de doublons à la création CRM et Kanban plafonné silencieusement à 200 éléments.

## Parcours audités

- création, édition, affectation et réaffectation d'un prospect ;
- pipeline complet de `new` à `won`/`lost` ;
- rendez-vous, activités, essai Showroom et devis ;
- conversion prospect vers client ;
- création directe et recherche Client 360° ;
- véhicules, ventes, devis, atelier, factures, paiements et timeline ;
- recherche, filtres, pagination, compteurs ;
- scopes OWN, AGENCY, CONCESSION et GLOBAL ;
- notifications et visibilité temps réel ;
- états frontend, permissions dynamiques et accessibilité statique.

## Conformes notables

- Le formulaire prospect est réinitialisé à la fermeture et après succès : l'ancien défaut de reprise du budget n'est pas reproduit dans le code courant.
- Le filtre « Toute l'équipe » transmet une valeur vide et le backend désactive correctement le filtre commercial.
- Les filtres CRM sont appliqués côté serveur avant pagination.
- L'affectation vérifie utilisateur actif, habilitation opérationnelle et périmètre.
- Les actions frontend sont conditionnées par les permissions dynamiques.
- L'essai réel doit être retourné avant émission d'un devis.
- La création de devis rattache ou crée un client de façon transactionnelle puis synchronise `leads.customer_id` et `opportunities.customer_id`.
- La recherche client couvre code, nom, entreprise, e-mail et téléphone ; la recherche CRM couvre nom, entreprise, e-mail, téléphone et projet véhicule.
- Les erreurs de chargement CRM et Client 360° sont rendues explicitement.

## Réserves majeures

1. Une mutation générique de phase accepte des retours non définis, notamment vers `new`, y compris depuis des états terminaux.
2. Les événements Livraison, Showroom et GED de la timeline 360° sont ajoutés sur la seule permission, sans prédicat de scope métier.
3. La création CRM n'effectue aucun rapprochement d'identité avant insertion.
4. La vue Kanban non paginée est limitée à 200 prospects ; ses compteurs sont ceux du sous-ensemble chargé.
5. Rendez-vous : aucune détection de conflit/doublon de créneau commercial.
6. Les activités utilisent `assigned_user_id` pour représenter l'acteur, ce qui confond auteur et affectataire dans la sémantique du modèle.
7. Les cartes et plusieurs lignes de tableau cliquables ne sont pas opérables au clavier.

## Résultats navigateur

Le navigateur réel disponible pointe vers une instance existante sur le port 3001 dont la parité avec le workspace n'est pas démontrée. Elle n'a pas été utilisée comme preuve du code courant. La recette responsive 1440/1024/768/375 du CRM et de Client 360° est donc **non exécutée** sur le bon bundle.

## Décisions métier requises

- Autoriser ou interdire explicitement chaque retour arrière et réouverture d'un gagné/perdu.
- Définir si le doublon prospect doit être bloquant, averti ou fusionnable, et à quel périmètre.
- Définir la granularité attendue des rendez-vous et la gestion de disponibilité.
- Confirmer qu'un client créé directement reste un client sans opportunité tant qu'aucun acte commercial ne l'exige.
- Définir l'auteur immuable d'une activité distinctement de son responsable.

Le détail, les preuves, le RBAC et les corrections minimales figurent dans les autres livrables AUDIT-ERP-02.
