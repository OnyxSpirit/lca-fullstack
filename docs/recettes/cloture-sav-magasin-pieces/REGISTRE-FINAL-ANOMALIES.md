# Registre final des anomalies

| ID | Gravité | État final | Preuve |
|---|---:|---|---|
| SAV-001 | Majeure | Corrigée, automatisé | `GLOBAL`/`CONCESSION` Super Admin produit `agency_id=?` sur l’agence active ; cas sans agence refusé. |
| SAV-002 | Moyenne | Corrigée, automatisé + inspection | Pagination, tris, filtres et CSV serveur présents et testés. |
| SAV-003 | Moyenne | Corrigée, automatisé + inspection | Sélection d’agence via `setCurrentAgency`, période et export protégés. |
| REC-001 | Majeure | Bloquée | Profils métier réels et second facteur humain indisponibles ; aucun bypass. |
| REC-002 | Moyenne | Non levée | Données réelles insuffisantes pour les parcours véhicule externe, transit et facture atelier. |

## Classification des preuves

- Tests réellement exécutés/automatisés : validations TypeScript, builds et suites ciblées.
- Test navigateur : authentification arrêtée au challenge 2FA.
- Inspection statique : fermeture des trois anomalies produit vérifiée dans le code.
- Tests bloqués : profils réels multi-rôles et scénarios A–I complets.
- Tests non exécutés : création de données financières artificielles et déploiement.

Aucune anomalie bloquante de compilation ou de test automatisé ne reste ouverte. La réserve REC-001 interdit néanmoins de déclarer un E2E navigateur complet.
