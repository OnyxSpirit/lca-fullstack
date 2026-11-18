# Matrice de traçabilité PAG-001 à PAG-141

La matrice détaillée et immuable des 141 surfaces reste [la matrice d'audit](../../audits/audit-pagination-frontend-global/07-matrice-couverture.md). Le présent document est sa couche de qualification finale : aucun identifiant n'est omis.

| Identifiants | Décision de correction |
|---|---|
| PAG-001 à PAG-014 | Listes principales conservées/harmonisées ; historiques facture PAG-009 à PAG-012 paginés localement ; sélecteurs PAG-013/014 restent des recherches de formulaire à traiter côté API si leur volume l'exige. |
| PAG-015 à PAG-026 | Liste CRM à 10 ; Kanban conserve le chargement progressif indépendant ; activités et devis liés paginés ; PAG-026 reste exempté. |
| PAG-027 à PAG-038 | Listes serveur conservées ; sous-collections Client 360 conservées ; exemptions PAG-035 à PAG-038 maintenues. |
| PAG-039 à PAG-048 | Livraisons et GED/notifications harmonisées ; sous-listes documentaires bornées conservées ; recherches de formulaire non transformées artificiellement. |
| PAG-049 à PAG-071 | Personnel, congés, primes et collections de dossiers paginés ; petits référentiels PAG-070 exemptés ; les migrations serveur recommandées « à terme » restent hors refonte forcée. |
| PAG-072 à PAG-083 | Catalogue, commandes, mouvements et factures fournisseur corrigés ; référentiels et lignes de document exemptés. |
| PAG-084 à PAG-093 | Proformas, ventes et devis harmonisés ; agrégats de reporting exemptés ; exports restent exhaustifs. |
| PAG-094 à PAG-108 | SAV principal/clients harmonisés ; sous-listes bornées par OR conservées ou paginées localement ; fenêtres planning exemptées. |
| PAG-109 à PAG-122 | Véhicules et historiques 360 harmonisés ; écritures, plan, journaux et historique comptable raccordés au composant partagé. |
| PAG-123 à PAG-131 | Trésorerie : paginations client conservées, journal serveur à 10 et contrôles partagés ; mappings bornés conservés. |
| PAG-132 à PAG-141 | Utilisateurs harmonisés ; affectations/référentiels bornés conservés ; les très grands catalogues de permissions restent recherchables plutôt que découpés arbitrairement. |

Les exemptions de l'audit sont maintenues lorsqu'elles portent sur une ressource unique, un agrégat, une fenêtre temporelle, une ligne de document ou un petit référentiel. Une surveillance de volumétrie reste requise pour les exemptions conditionnelles.
