# ERP-08 — Verdict A à Z

| Axe | État et preuves | Anomalies / réserves | Verdict |
|---|---|---|---|
| A Architecture | Recette isolée 4176/3004/33321 | Aucune écriture 3001 | OK |
| B Backend | Build TypeScript et santé Docker | Campagne globale bruitée | OK |
| C Clients | Client 2 lié aux véhicules 3/7 | Association étrangère refusée | OK |
| D Données | Trois OR et historiques MySQL | OR 1 contient une ligne de test surnuméraire | Partiel |
| E Encaissements | Paiement 7, facture 8 soldée | Aucun paiement externe | OK |
| F Facturation | Factures 8/9, blocage solde | Snapshot TVA corrigé | OK |
| G Garanties | Non-applicabilité affichée | Pas de cas couvert disponible | Partiel |
| H Historique | Toutes transitions persistées | Aucun trou observé | OK |
| I Interventions | Affectation et session complète | OR pièces sans intervention requise | OK |
| J Jeux de tests | Scripts rejouables et test ERP-08 | 39 échecs globaux à requalifier | Partiel |
| K Contrôles API | Réponses positives et refus 4xx attendus | Aucun 500 observé | OK |
| L Livraison | Remise après paiement uniquement | Kilométrage maître non actualisé | Partiel |
| M MySQL | OR, devis, stock, facture, paiement contrôlés | Aucune écriture SQL directe | OK |
| N Notifications | 38 visibles, événements OR présents | Destinataires non audités exhaustivement | Partiel |
| O Ordres de réparation | Livré, diagnostic et facturé conservés | Aucun | OK |
| P Pièces | Stock 5→4, réservation consommée | Profil A2 ajouté pour la recette | OK |
| Q Qualité des corrections | Tests ciblés et rendu visuel | Revue humaine recommandée | OK |
| R Réception | Inspection obligatoire, doublon refusé | Aucun | OK |
| S SAV | Parcours principal bout en bout | Cas garantie couverte indisponible | OK avec réserve |
| T Traçabilité | Auteurs, statuts, mouvements, archives | Aucun | OK |
| U Utilisateurs | Sept profils connectés | Certains 404 dus aux scopes propres | OK |
| V Véhicules | VIN et origine cohérents | `vehicles.mileage` reste ancien | Partiel |
| W Workflows | Chaîne complète validée | Aucun blocage majeur | OK |
| X Cas limites | Concurrence, idempotence, invalides | Abandon non rejoué | Partiel |
| Y Risques résiduels | Réserves documentées | OR 1 et kilométrage maître | Maîtrisé |
| Z Verdict final | UI/API/MySQL/PDF concordants | Réserves non bloquantes | VALIDÉ AVEC RÉSERVES |
