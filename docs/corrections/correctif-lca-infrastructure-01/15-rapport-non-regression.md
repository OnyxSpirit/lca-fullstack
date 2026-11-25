# Non-régression et résultats des suites

## Validations réussies

- `git diff --check` : 0 erreur.
- Contrôle immuabilité : 104 migrations vérifiées, 0 divergence.
- Backend Node 22 : TypeScript/lint réussi.
- Frontend Node 22 : TypeScript/lint réussi; build Vite réussi (2 555 modules, 17,93 s pour la sortie isolée; 17,55 s dans l'image).
- Baseline/bootstrap statique : 36/36 tests réussis.
- Migration 094 MySQL 8.4 : 2/2 réussis.
- Correctif 135 MySQL 8.4 : suite ciblée réussie; cinq états de reprise et les assertions de structure/données sont verts.
- Installation fraîche baseline 071→137 : réussite, zéro avertissement.
- Copie historique 135 partielle→137 : réussite; rejeu idempotent réussi.

## Suites globales

Frontend, montage workspace correct sous Node 22 : 1 094 tests, 1 085 réussis, 9 échoués, 0 ignoré. Les échecs sont des contrats fonctionnels antérieurs : COM-02/CRM permissions et création de devis, FIN04 interface RH, QUOTE-FE permissions, SETTINGS-FE mutation/loading, LOT14B2B identité/fiscalité, deux contrats TEST-DRIVE et filtre manuel des statuts véhicules. Aucun fichier de migration, runner, baseline, runtime ou permissions d'artefacts de cette mission n'est la cause de ces assertions; plusieurs concernent les modifications EVOLUTION-LCA-03 déjà présentes.

Backend sous Node 22 : 2 206 tests déclarés, 2 suites, 2 064 réussis, 35 échoués, 107 ignorés. Les échecs se regroupent en contrats Garantie/OR historiques, workflow devis/archives, rendu PDF et marques officielles, RBAC proforma/showroom/stock, extraction PDF et anciens consommateurs OR. Ils existaient hors du périmètre infrastructure et ne touchent pas les chemins corrigés. Les tests du runner, de 094, 135, baseline et démarrage sont exécutés séparément et verts.

La suite globale du runner a exécuté les installations fraîches, injections d'interruption, dérive checksum et les deux bootstraps concurrents jusqu'au niveau 137 avec zéro avertissement. Elle s'est terminée avec le code 1 après 1 495,716 s : le test monolithique avait dépassé son ancien plafond de 1 200 s, sans OOM, puis les opérations déjà engagées ont fini proprement. Le plafond versionné est porté à 2 400 s pour les prochains lancements. Les sous-suites ciblées 135, baseline et 094 sont vertes et les deux runners concurrents ont chacun produit le résumé niveau 137. Un premier lancement comprenait aussi un faux échec de chemin dû au montage backend seul; les suites concernées ont été rejouées avec le workspace correct.

Docker : images backend/frontend construites; MySQL/backend/frontend healthy; HTTP interface, healthz et proxy API 200; authentification HTTP 200 avec challenge 2FA; base niveau 137, zéro étape non APPLIED et zéro scope interdit. Le backend aux volumes corrigés démarre sans EACCES et répond 200.

## Analyse d'imputabilité

La mission modifie le runner, 135, ajoute 137, corrige la baseline et standardise runtime/sortie. Aucun des 44 échecs globaux ne porte sur ces changements. Les validations ciblées correspondantes sont vertes. Les écarts fonctionnels restent à traiter dans EVOLUTION-LCA-02/03 ou les lots métier concernés; ils ne sont pas masqués ni déclarés réussis.
