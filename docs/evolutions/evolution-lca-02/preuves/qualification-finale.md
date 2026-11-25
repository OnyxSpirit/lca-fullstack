# Preuves de qualification finale

Date : 25 novembre 2026. Environnement : Node.js 22 en conteneur, MySQL 8.4.11.

## Parcours HTTP réel

- Verdict du script `backend-node/test/evolution-lca-02.http-e2e.mjs` : `REUSSI`.
- Diagnostic externe : 20 ; OR automatique : 12 ; demande de pièces : 7.
- Acceptations concurrentes : HTTP 201 et HTTP 200, même OR.
- Rejeu après création : HTTP 200.
- Devis immuable après émission : HTTP 409.
- Création directe d’OR : HTTP 400 avec identifiant invalide, HTTP 409 avec identifiants valides.
- Affectations : 3 techniciens puis 2 après modification.
- Diagnostic refusé : 21, sans OR.
- OR interne exonéré : 13.
- Ventes : factures 16 à 19, quatre combinaisons client/fiscalité, totaux 71 340 ou 60 000 XAF.
- Inventaire : +8 mouvements, +12 unités vendues, +240 000 XAF ; filtre facture = 2 lignes.

## Documents et exports

- PDF devis diagnostic : 1 833 octets, signature `%PDF`.
- CSV filtré : 728 octets, en-têtes français.
- XLSX filtré : 9 302 octets, signature `PK`.

## MySQL

- Installation fraîche : niveau 135, 0 avertissement.
- Montée autonome 133→134 : niveau 134, 0 avertissement.
- Montée autonome 134→135 : niveau 135, 0 avertissement.
- Permissions avant/après 134→135 : 383→388, exactement cinq ajouts LCA-02.
- Rôles avant/après : 1→1.
- Affectations RBAC hors `OWN`/`AGENCY` : 0.

## Compilation et non-régression

- Lint backend : réussi.
- Build backend : réussi.
- Lint frontend : réussi.
- Build frontend : réussi, 2 554 modules transformés.
- Suite frontend Node 22 : 1 086 réussis, 8 échecs hors périmètre sur 1 094.
- Suite backend Node 22 : 2 071 réussis, 28 échecs historiques hors parcours LCA-02 et 106 ignorés sur 2 205.
- Serveur frontend final : HTTP 200, 906 octets.

## Limite d’environnement

La commande de contrôle navigateur a signalé que l’accès au navigateur local n’est pas disponible pour ce chat. Aucun résultat visuel n’est donc déclaré réussi.
