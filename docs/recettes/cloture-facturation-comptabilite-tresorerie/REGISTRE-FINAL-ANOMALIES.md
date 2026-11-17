# Registre final des anomalies

| Référence | État | Preuve actuelle |
|---|---|---|
| FIN-001 | Corrigée et recettée | API, MySQL et navigateur : mouvements et soldes vérifiés |
| FIN-002 | Corrigée sur fixture | Mouvement 6, audit unique, rejeu sans doublon |
| FIN-003 | Corrigée sur encaissement | Écriture `VE-FIN-2025-000001`, débit = crédit |
| FIN-004 | Corrigée ; réserve navigateur | API officielle exhaustive sur 6 profils, changement d’agence, révocation/réactivation ; navigateur représentatif |
| FIN-005 | Corrigée | Tests ciblés réussis |
| FIN-006 | Qualifiée, aucune écriture requise | Les 118 000 XAF proviennent de `official-document-mysql-fixture.sql`, insertion directe hors métier ; base réelle non modifiée |
| SAV-MVT-01 | Corrigée | Migration 129 autorise `internal_delivery` et `sav_return`, test ciblé et E2E réussis |
| UI-FR-SAV-01 | Corrigée | Bundle final : `Terminée`, `Facturé → Clôturé`, aucun statut brut ciblé |
| AUTH-E2E-01 | Contournée en recette | Limitation 2FA après connexions rapprochées, sans impact fonctionnel persistant |

Réserve transversale : les suites globales hors périmètre ne sont pas vertes. Le lot financier ciblé et le scénario SAV sont réussis ; cette réserve interdit seulement la qualification « sans réserve ».
