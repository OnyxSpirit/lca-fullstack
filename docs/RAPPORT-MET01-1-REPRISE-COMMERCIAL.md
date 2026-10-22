# RAPPORT MET-01.1 — Reprise de la recette Commercial

Date : 20 octobre 2026
Environnement : Docker local `lca`, MySQL 8.4 `concession_erp`, application `http://127.0.0.1`
Verdict consolidé : **NON VALIDÉ**

## 1. Résumé

La réserve `datetime-local` de MET-01 est levée sans modification applicative. Le rendez-vous Alpha a été créé dans le navigateur par une interaction native qui déclenche réellement `onChange`. Le parcours a ensuite couvert l'essai immédiat et son retour, le devis, la négociation, la conversion client et la fiche Client 360°.

La transformation en vente atteint la vérification finale, mais le backend refuse l'écriture avec le message « Archive officielle absente ». Le devis demeure `negotiation` et le compte Commercial ne dispose pas de `quotations.validate`, permission nécessaire à l'émission officielle. Aucun droit supplémentaire n'a été attribué et aucune vente n'a été forcée.

## 2. Environnement et authentification

- Frontend, backend et MySQL : `healthy` lors de la campagne initiale, sans redémarrage ni reconstruction pour MET-01.1.
- Migration courante : 101.
- Session réelle : `Commercial MET01`, utilisateur 15, rôle `COMMERCIAL_MET01`, agence Brazzaville.
- 29 permissions existantes, sans scope GLOBAL.
- Les prospects 9 à 13 ont été réutilisés ; aucun prospect historique n'a été supprimé.

## 3. Analyse du contrôle datetime-local

Le formulaire CRM utilise :

```tsx
<input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
```

La validation refuse une valeur vide, invalide ou passée. `appointmentIso` interprète la saisie comme heure métier `Africa/Brazzaville` et produit l'instant UTC envoyé à l'API.

Constats :

1. `fill('2026-10-22T10:30')` modifiait le contrôle visible sans actualiser l'état React ; le message « Renseignez la date et l'heure » subsistait.
2. Le changement de focus seul ne suffisait pas.
3. Après le remplissage, une interaction clavier native `ArrowUp` a modifié un segment du contrôle et déclenché l'événement attendu.
4. L'état React est alors devenu valide, le message a disparu et le bouton s'est activé.

Conclusion : **limite de la première méthode d'automatisation**, pas défaut de saisie utilisateur ni défaut du composant démontré. Aucune modification React, DOM artificielle, API de contournement ou écriture SQL n'a été utilisée.

## 4. Rendez-vous

- Canal : NAVIGATEUR.
- Prospect : Alpha, lead 9.
- Saisie finale : 23 octobre 2026, 10:30 heure métier, durée 30 minutes.
- Résultat UI : succès « Rendez-vous planifié », étape `Rendez-vous`, progression 40 %.
- Historique : activité « Rendez-vous commercial », transition `qualified → appointment`.
- MySQL : follow-up 7, `scheduled_at=2026-10-23 09:30:00`, statut `pending`, durée 30 minutes.

La valeur MySQL correspond à l'instant UTC attendu pour 10:30 à Brazzaville. La fiche CRM affiche toutefois `09:30`, soit l'heure UTC au lieu de l'heure métier. La même dérive apparaît dans les notifications. Cette anomalie d'affichage est documentée comme `MET01.1-A01`.

La modification et l'annulation d'un second rendez-vous n'ont pas été exécutées.

## 5. Essai automobile

Un premier essai futur a servi à vérifier la planification, puis a été annulé par le workflow officiel. Un second essai immédiat a été créé et réalisé :

- véhicule : Mercedes GDX6, stock `STK-000005`, véhicule 5 ;
- permis fictif : `MET01-PERMIS-ALPHA` ;
- départ : kilométrage 0 ;
- retour : kilométrage 5 ;
- avis : essai concluant, proposition demandée ;
- résultat : étape CRM `test_drive`, progression 55 %, activité de retour terminée.

Preuve MySQL :

- essai 11 : `cancelled`, créneau futur ;
- essai 12 : `completed`, démarré et retourné, kilométrages 0 → 5, commentaire conservé.

Le cas négatif d'un véhicule indisponible n'a pas été rejoué dans le navigateur.

## 6. Proposition et négociation

- Canal : NAVIGATEUR.
- Devis : `DEV-20261020-28436291`, identifiant 7.
- Véhicule : Mercedes GDX6.
- Base HT : 24 000 000 XAF.
- TVA 18,9 % : 4 536 000 XAF.
- Total TTC : 28 536 000 XAF.
- Remise : 0.
- Propriétaire/créateur : utilisateur 15.
- Statut final : `negotiation`.
- Étape CRM : Négociation, progression de liste 85 %.

La remise est désactivée pour ce rôle, conformément à l'absence de permission spécialisée.

## 7. Conversion client

La création du devis a utilisé le workflow transactionnel réel et a créé/rattaché le client :

- client 7 ;
- code `CLI-000007` ;
- identité `MET01 Prospect Alpha` ;
- email et téléphone fictifs conservés ;
- conseiller Commercial MET01 ;
- fiche 360° accessible ;
- une opportunité et un devis visibles ;
- aucune vente rattachée.

Le comportement avec un client déjà existant n'a pas été rejoué avec un second jeu fictif.

## 8. Préparation de vente

Le wizard réel a validé : client, véhicule, agence, commercial, fiscalité et garantie. L'écran final affichait :

- Mercedes GDX6 ;
- total 28 536 000 XAF ;
- reste à facturer 28 536 000 XAF ;
- garantie Mercedes, 32 mois ;
- aucun acompte.

À l'enregistrement, le backend a répondu : **« Archive officielle absente. Réessayez l'action de finalisation avant de consulter ce document. »**

La protection est cohérente : le devis doit être émis par un acteur ayant `quotations.validate`, ce que le Commercial MET01 ne possède pas. Résultat MySQL : zéro vente pour l'opportunité 9. Aucun paiement, aucune facture et aucune livraison n'ont été créés.

La différence métier observée :

- « Enregistrer la vente » prépare le bon de commande et réserve les relations commerciales, mais exige le devis officiellement archivé ;
- « Confirmer la vente » est une transition ultérieure, distincte, soumise aux verrous financiers et documentaires ;
- aucune confirmation de vente n'a été atteinte ni forcée.

## 9. Scénarios négatifs

- Prospect vide : PASS, messages obligatoires sur prénom, nom et moyen de contact.
- Email invalide : PASS, message « L'adresse e-mail n'est pas valide », aucune création.
- Perte avec motif : PASS hérité de MET-01.
- Routes Utilisateurs, RH et Trésorerie : PASS hérité, accès refusé.
- Annulation d'un essai planifié : PASS, historique conservé.
- Doublon prospect : NON EXÉCUTÉ.
- Modification puis annulation prospect : NON EXÉCUTÉ.
- Portefeuille d'un second Commercial : NON EXÉCUTÉ, aucun compte supplémentaire créé.
- Véhicule indisponible : NON EXÉCUTÉ.
- Conversion sans droit : la conversion en vente est BLOQUÉE par l'archive et non par une élévation RBAC.

## 10. Notifications et KPI

Deux notifications internes `showroom.test-drive-started` ont été visibles pour l'utilisateur 15 et corroborées en base (IDs 151 et 152). L'une correspond à l'essai planifié ensuite annulé, l'autre à l'essai immédiat terminé. Aucun email ou SMS externe n'a été envoyé.

Reporting mensuel observé :

- prospects créés : 5 ;
- convertis selon statut courant du lead : 0 ;
- essais : 2 ;
- ventes enregistrées : 0 ;
- ventes non annulées : 0 XAF.

Le KPI « Convertis » suit le statut courant du lead, tandis qu'une fiche client existe déjà. Cette différence sémantique est conservée comme réserve d'interprétation ; aucune règle de reporting n'a été modifiée.

## 11. Contrôles MySQL

Lectures uniquement :

- lead 9 lié au client 7 ;
- opportunité 9 au stade `negotiation`, valeur 28 536 000 ;
- follow-up 7 pending, durée 30 ;
- essais 11 annulé et 12 terminé ;
- devis 7 en négociation, montants cohérents ;
- client 7 et code `CLI-000007` ;
- aucune vente pour l'opportunité 9 ;
- notifications 151 et 152 persistées.

## 12. Anomalies et corrections

### MET01.1-A01 — heure affichée dans le fuseau du navigateur

- Gravité : P2 fonctionnelle.
- Saisie métier : 10:30 Africa/Brazzaville.
- Stockage UTC : 09:30, correct.
- Affichage CRM : 09:30, incorrect pour l'utilisateur métier.
- Cause : le helper générique `formatDateTime` utilise `Intl.DateTimeFormat` sans `timeZone` explicite.
- Correction : non appliquée dans cette mission, car le helper est transversal et une correction sûre doit réutiliser le fuseau configuré sans modifier tous les écrans implicitement.

### MET01.1-R02 — devis sans archive officielle

- Nature : précondition métier/documentaire, pas anomalie démontrée.
- Effet : vente non enregistrée.
- Action requise : émission du devis par un acteur distinct habilité `quotations.validate`, puis reprise de la conversion.

Correction de code appliquée : **aucune**.

## 13. Non-régression

| Contrôle | Résultat |
|---|---|
| Frontend complet | 959 PASS, 0 FAIL, 0 SKIP |
| Backend complet | 1 925 PASS, 0 FAIL, 91 SKIP conditionnels |
| Lint frontend | PASS |
| Lint backend | PASS |
| Build frontend | PASS, 2 516 modules |
| Build backend | PASS |
| Tests CRM/rendez-vous/essais/clients/devis/ventes/RBAC | inclus dans les suites complètes, PASS |

## 14. Matrice consolidée des 25 scénarios initiaux

| Statut | Nombre | Scénarios principaux |
|---|---:|---|
| PASS | 21 | environnement, authentification, navigation, 3 refus RBAC, création/validation prospects, qualification, perte, affectation, rendez-vous, essai, stock, devis, client, notifications, reporting, MySQL |
| FAIL | 0 | — |
| BLOQUÉ | 1 | préparation de vente : devis non émis/archive officielle absente |
| NON EXÉCUTÉ | 3 | doublon prospect, modification/annulation prospect, modification/annulation d'un second rendez-vous |
| NON APPLICABLE | 0 | — |

Des variantes additionnelles demandées par MET-01.1 restent non exécutées : portefeuille d'un second Commercial, véhicule indisponible et client préexistant.

## 15. Verdict MET-01

**NON VALIDÉ.**

Le blocage initial `datetime-local` est levé et les parcours rendez-vous, essai, devis et client sont démontrés dans le navigateur. La vente reste toutefois un workflow critique bloqué, et plusieurs scénarios négatifs structurants ne sont pas couverts. Une preuve API ou un ajout de permission au Commercial ne remplacerait pas l'émission officielle par un acteur habilité.

Pour clôturer MET-01 : faire authentifier un acteur distinct possédant `quotations.validate`, émettre `DEV-20261020-28436291`, revenir sous Commercial MET01, reprendre la vente, puis compléter les scénarios OWN et les négatifs restants. MET-02 n'a pas été commencé.
