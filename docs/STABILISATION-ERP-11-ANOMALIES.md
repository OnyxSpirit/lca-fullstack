# ERP-11 — Anomalies

1. **Corrigée** — course de création utilisateur : `ER_DUP_ENTRY` exposait 500 au lieu de 409.
2. **Réserve de test** — `super-admin-system.test.ts` termine en échec de processus après environ 5 s, car le pool MySQL importé reste ouvert ; les assertions du test ne signalent pas d’échec fonctionnel.
3. **Limite connue** — certains paramètres de lecture inter-agences sont refusés en amont par le middleware d’agence, même avec scope concession. Le workflow de transfert officiel reste fonctionnel.
