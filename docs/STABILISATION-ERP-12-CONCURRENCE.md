# ERP-12 — Concurrence

Deux PATCH simultanés sur l’agence 3 retournent 200/200. L’état final correspond à l’une des deux valeurs, selon une politique dernière écriture gagnante ; les deux changements sont audités. Aucune corruption observée. La lecture répétée d’une notification est idempotente.
