# Index du dossier officiel de remise de l ERP LCA

## Organisation contractuelle

- Projet et client final : ERP / CRM automobile de La Congolaise de l’Automobile LCA.
- Sous-traitant technique chargé du développement : BEROX.
- Donneur d’ordre de BEROX et structure chargée de la remise officielle à LCA : NEXORA.
- Circuit de livraison : **BEROX → NEXORA → LCA**.
- Identifiant technique du paquet : `LCA-ERP-PKG-20261012`.
- Archive de référence : `LCA-ERP-LIVRAISON-FINALE.zip`.
- Nombre de fichiers du paquet : 471.
- Empreinte SHA-256 vérifiée : `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.
- Qualification technique : B — qualifié avec réserves non bloquantes.
- Préparation du paquet : B — paquet prêt avec réserves documentées.

La préparation de ce dossier ne constate pas que les remises ont eu lieu. Elle ne vaut ni réception fonctionnelle, ni déploiement, ni mise en production.

## A Documents de remise BEROX vers NEXORA

| No | Document | Objet | Signataires prévus | Statut |
|---:|---|---|---|---|
| 01 | `01-PROCES-VERBAL-REMISE-TECHNIQUE.docx` | Constat de la remise technique du paquet par BEROX à NEXORA | BEROX et NEXORA | prêt à compléter |
| 02 | `02-BORDEREAU-DES-LIVRABLES.docx` | Inventaire matériel à contrôler lors du transfert initial | BEROX et NEXORA | prêt à compléter |
| 03 | `03-FICHE-DES-RESERVES.docx` | Registre commun des réserves et actions préalables à la production | BEROX et NEXORA pour le suivi initial | prêt à compléter |
| 04 | `04-TRANSFERT-TECHNIQUE-ET-RESPONSABILITES.docx` | Transfert initial des connaissances et éléments techniques | BEROX et NEXORA | prêt à compléter |

## B Documents de remise NEXORA vers LCA

| No | Document | Objet | Signataires prévus | Statut |
|---:|---|---|---|---|
| 08 | `08-PROCES-VERBAL-REMISE-NEXORA-LCA.docx` | Constat distinct de la remise matérielle officielle par NEXORA à LCA | NEXORA et LCA | prêt à compléter |
| 05 | `05-PROCES-VERBAL-RECEPTION-FONCTIONNELLE.docx` | Formulaire de recette et de décision fonctionnelle sans option présélectionnée | NEXORA et LCA | prêt à compléter lors de la recette |
| 06 | `06-SYNTHESE-EXECUTIVE-LIVRAISON.docx` | Synthèse destinée à LCA précisant les rôles de NEXORA et de BEROX | sans signature obligatoire | prêt pour examen |
| 03 | `03-FICHE-DES-RESERVES.docx` | Registre à joindre ou reprendre lors de la remise officielle | selon décision des parties | prêt à compléter |

Le bordereau 02 décrit l’inventaire technique préparé par BEROX. Pour la remise NEXORA vers LCA, ses lignes doivent être jointes ou reprises et renseignées au moment de l’opération ; aucune réception matérielle n’est déclarée par avance.

## Distinction des opérations

- **Remise technique** : transfert initial des éléments relevant de la prestation de BEROX vers NEXORA.
- **Transmission des fichiers** : acheminement par le canal sécurisé à renseigner, avec vérification de l’empreinte du support effectivement transmis.
- **Réception matérielle** : constat de présence et d’intégrité des éléments, sans jugement fonctionnel automatique.
- **Réception fonctionnelle** : décision de LCA après exécution et consignation de sa recette métier.
- **Mise en production** : décision formelle, distincte de toutes les opérations précédentes, après validation de l’infrastructure et des responsabilités d’exploitation.

## Champs restant à compléter

### Informations administratives communes

- date et lieu de chaque remise ;
- référence contractuelle, si elle existe ;
- nature du support ou canal sécurisé réellement utilisé ;
- noms, fonctions, dates et signatures des représentants habilités ;
- personne ayant vérifié l’empreinte et résultat du contrôle ;
- observations et écarts constatés au moment de chaque opération.

### Réserves et exploitation

- responsable confirmé et échéance de chaque réserve ou action ;
- décisions et preuves de clôture ;
- état des certificats HTTPS, du reverse proxy, des sauvegardes et de la restauration ;
- état des paramètres de production, des accès, des anciennes copies concernées par LCA-R01 et des volumes `lca_*`.

### Transfert BEROX vers NEXORA

- référents techniques ;
- canal sécurisé de transmission des accès ;
- éléments effectivement transmis et tests d’accès ;
- validation de la matrice des responsabilités ;
- date, participants, questions et actions de la session de transfert.

### Remise et réception NEXORA vers LCA

- support effectivement remis et contrôle matériel associé ;
- version et environnement effectivement testés ;
- date, lieu, responsable et participants de recette ;
- modules, scénarios, résultats, anomalies et réserves client ;
- pièces jointes de recette ;
- une décision parmi réception sans réserve, réception avec réserves ou réception ajournée ;
- signatures seulement après constat ou décision par les personnes habilitées.

## Contrôle de cohérence

- BEROX est présenté comme sous-traitant technique chargé du développement et remettant initial à NEXORA.
- NEXORA est présenté comme donneur d’ordre de BEROX, réceptionnaire initial et structure chargée de la remise officielle à LCA.
- LCA est présenté comme client final et bénéficiaire, puis comme réceptionnaire de la remise officielle et décideur de sa recette fonctionnelle.
- Les signatures correspondent à chacune des deux opérations de remise.
- Aucune relation contractuelle directe BEROX–LCA n’est affirmée.
- Aucune mention de NOVA ne subsiste dans le dossier.
- La qualification technique, la préparation du paquet, l’archive, les 471 fichiers et l’empreinte restent inchangés.
- Les réserves AUD-LCA-013, AUD-LCA-014 et AUD-LCA-024 restent ouvertes ou partiellement traitées selon leur statut documenté.
- Aucune remise, réception, signature, responsabilité opérationnelle ou mise en production n’est déclarée réalisée.

## Statut du dossier

**B — DOSSIER PRÊT AVEC INFORMATIONS À COMPLÉTER.**

Avant signature, chaque partie doit compléter les champs qui la concernent, contrôler l’empreinte du support effectivement remis, relire les réserves, confirmer les responsabilités opérationnelles et vérifier l’habilitation de ses signataires.
