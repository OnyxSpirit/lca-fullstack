# Audit CRM & Prospection

## Couverture fonctionnelle

| Capacité | Statut | Constat |
|---|---|---|
| Liste, recherche, pagination | CONFORME | Pagination serveur, recherche différée, états de chargement/erreur/vide testés. |
| Création et modification | CONFORME | Contrôles d’identité et détection des doublons; mutations sous autorisation d’agence. |
| Affectation / réaffectation | CONFORME | Candidats actifs et habilités; périmètres OWN/AGENCY testés. |
| Pipeline | CONFORME | Matrice de 81 transitions testée; transitions invalides et pertes sans motif rejetées. |
| Activités et relances | CONFORME | Ajout et restitution chronologique disponibles. |
| Rendez-vous | CONFORME | Création, reprogrammation et annulation testées; politique temporelle côté UI. |
| Essai routier | CONFORME | Planification CRM/showroom, démarrage, retour et annulation; véhicule et conseiller contrôlés. |
| Conversion prospect → client | CONFORME | Conversion transactionnelle, réutilisation d’identité et conflits 409; concurrence MySQL validée. |
| Devis / vente | CONFORME | Création depuis opportunité; création/réemploi client transactionnel; invalidations transversales. |
| Archivage / désactivation | ABSENTE | Aucun endpoint ni action UI dédiée. À arbitrer si cette capacité fait partie du métier cible. |

## Intégrité et concurrence

- Les mutations réévaluent la permission et l’agence active au moment transactionnel.
- L’affectation et les transitions utilisent des lectures verrouillées; les courses critiques sont couvertes par tests.
- La conversion évite la création de deux clients équivalents dans une agence, y compris sous concurrence réelle MySQL.
- Une identité identique dans deux agences reste autorisée, conformément au modèle multi-agences actuel.

## Réserve

Le parcours fonctionnel traite la perte d’une opportunité, mais pas l’archivage administratif d’un prospect. Ne pas assimiler ces deux concepts sans décision métier explicite.
