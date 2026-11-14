# Registre des anomalies

| ID | Gravité | Domaine | Statut | Résumé |
|---|---|---|---|---|
| ANO-LIV-001 | MAJEURE | Livraison | DÉFECTUEUSE | Décalage horaire de 15:00 saisi à 14:00 affiché |
| ANO-LIV-002 | MOYENNE | Livraison/PV | À ARBITRER | Capture numérique présente et intitulée « signature réelle », tracé facultatif |
| ANO-DEV-001 | MINEURE | Devis | DÉFECTUEUSE | Avertissement fiscal/référentiel incohérent dans une modale fonctionnelle |
| ANO-UX-001 | MOYENNE | Transverse | PARTIELLE | Tri utilisateur absent des listes principales |
| ANO-PRO-001 | MOYENNE | Pro forma | À ARBITRER | Aucun statut/action d’annulation ou d’expiration |
| ANO-DOC-001 | MINEURE | Livraison | PARTIELLE | « Documents remis : Complets » ambigu avant toute pièce numérique jointe |
| ANO-DOC-002 | MAJEURE | Pro forma/PDF | DÉFECTUEUSE | Le nom d’un client particulier est rendu `null` dans le PDF officiel |

## ANO-LIV-001 — Décalage horaire à la planification

- Attendu : le rendez-vous saisi à 15:00 dans le fuseau métier reste affiché à 15:00.
- Observé : saisie `2026-11-14T15:00`, carte créée à `14:00`.
- Reproduction : Ventes → vente prête → Planifier → sélectionner date/heure 15:00 → Planifier.
- Fichiers : `frontend/src/modules/deliveries/NewDeliveryModal.tsx`, routes livraison et sérialisation de date.
- Endpoint : création de livraison.
- Permission : `delivery.schedule`.
- Impact : rendez-vous client décalé, risque opérationnel.
- Preuve : navigateur réel, livraison `LIV-20261114-219145`.
- Correction proposée : définir explicitement le contrat local/UTC et tester aller-retour dans `Africa/Brazzaville`.
- Validation : test DOM + API + MySQL sur heure locale, UTC et changement de date.

## ANO-LIV-002 — Sémantique de signature incohérente

- Attendu : workflow conforme à la décision documentaire ; signature manuscrite prévue sur PDF si la capture numérique a été supprimée.
- Observé : `SignaturePad` canvas actif sous « Signature réelle du client ». Le backend accepte `signatureData`, la stocke dans `delivery_signatures`, mais le tracé est facultatif. Une livraison a été finalisée sans dessin, uniquement nom, kilométrage et consentement.
- Fichiers : `frontend/src/modules/deliveries/DeliveryDetailPage.tsx`, `backend-node/src/modules/deliveries/delivery.routes.ts`, `delivery.domain.ts`.
- Endpoint : `POST /deliveries/:id/sign`.
- Permissions : `delivery.signature.capture`, `delivery.complete`.
- Impact : ambiguïté juridique et UX ; stockage d’une donnée présentée comme « réelle » sans obligation ni politique explicitée.
- Correction proposée : décision métier préalable, puis supprimer le canvas ou formaliser le niveau de preuve et rendre les libellés exacts.
- Validation : PV avec/sans signature, hash, GED, consentement et contrôle RBAC.

## ANO-DEV-001 — Avertissement trompeur

- Attendu : avertissement seulement si une donnée réellement nécessaire manque.
- Observé : après sélection du véhicule, message « Les références commerciales ou les paramètres fiscaux sont indisponibles », alors que prix HT 45 000 000, TVA et total 52 316 000 sont calculés et le devis est créé puis émis.
- Fichier : `frontend/src/modules/crm/QuotationModal.tsx`.
- Impact : perte de confiance, faux diagnostic opérateur.
- Correction proposée : distinguer référence catalogue absente et configuration fiscale exploitable.

## ANO-UX-001 — Tri non interactif

- Attendu : contrôles de tri si cette exigence reste métier.
- Observé : ventes, devis, pro forma, showroom et livraisons proposent recherche/filtres/pagination mais aucun tri ascendant/descendant visible. Les `ORDER BY` backend sont fixes.
- Impact : exploitation difficile sur volumes importants.
- Correction proposée : arbitrer les colonnes triables, ajouter contrat `sort/order` sécurisé et contrôles accessibles.

## ANO-PRO-001 — Cycle de vie réduit

- Observé : frontend et backend ne gèrent que `draft` et `issued`. Pas d’annulation, rejet ou tâche d’expiration.
- Endpoint concerné : routes `proformas`.
- Impact : un document émis erroné ne peut être révoqué fonctionnellement ; validité dépassée non matérialisée.
- Classement : À ARBITRER, car le mandat interdit d’inventer une transition.

## ANO-DOC-001 — Complétude ambiguë

- Observé : la zone « Documents remis » indique « Complets » dès que l’item checklist administratif est coché, même sans pièce jointe numérique.
- Attendu : distinguer explicitement remise physique complète et archive numérique absente.
- Impact : lecture opérationnelle trompeuse mais aucune perte démontrée.

## ANO-DOC-002 — Identité client absente du PDF pro forma

- Attendu : le PDF affiche `first_name + last_name` pour un client de type `individual`.
- Observé : le PDF officiel `PRO-20261114-000001` affiche littéralement `null` ; le snapshot SQL contient pourtant `first_name=Client`, `last_name=Audit UI`, `company_name=null`.
- Preuve : extraction `pdftotext`, comparaison au snapshot et hash GED `01101be6611618d81b04812b0a085512c33fd34bf104c99f137acbca558a1a27` concordant.
- Impact : document commercial officiel sans identité exploitable du client.
- Cause probable : renderer fondé uniquement sur `company_name` sans branche particulier.
- Validation attendue : tests PDF particuliers/sociétés/administrations, valeur nulle interdite dans le rendu.
