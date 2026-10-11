# ERP-17 — Anomalies indépendamment vérifiées

| ID | Conclusion | État |
|---|---|---|
| BILL01 | agence1 sans facture ; filtre conforme | faux positif API/MySQL, UI à confirmer |
| UI01 | réservation/consommation estimée sans garde frontend dédiée | corrigé localement |
| UI02 | contexte garantie incomplet dans Nouvel OR | corrigé localement |
| PDF01 | espace U+202F mal rendu | corrigé localement |
| PDF02 | quantité absente alléguée non reproduite | faux positif visuel |
| PDF03 | lignes Atelier HT affichées sous TTC | projection PDF corrigée |
| TEST01 | assertions périmées mélangées à défauts réels | suites ciblées vertes |
| GED01 | archive après commit, reprise nécessaire ; fenêtre crash/orphelin | réserve explicitée |

Les affirmations ERP16 «toutes assertions obsolètes» et «montants PDF concordants» étaient trop larges.

