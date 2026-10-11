# ERP-07 — RBAC et multi-agences

| Profil | Liste API | Données financières | Verdict |
|---|---:|---:|---|
| Super Administrateur | 200 | visibles | validé |
| Responsable financier A2 | 200 | visibles | validé |
| Comptable A1, scope concession | 200 | visibles | validé |
| Direction | 200 | lecture visible | validé |
| Commercial | 403 | absentes | validé |
| Responsable livraison | 403 | absentes | validé |
| Responsable financier A3 dédié | 200 | visibles A3 | validé |

Les accès sans authentification renvoient 401. Un client hors agence est refusé 403. Les quatre agences sont présentes dans le sélecteur frontend ; les agences 2 et 3 ont été exercées en écriture officielle. `OWN` reste explicitement non applicable aux données financières. Le contrôle inter-concessions reste réservé faute de seconde concession officielle.

Le frontend a été parcouru avec le Super Administrateur ; la matrice multi-profils complète a été prouvée au niveau API authentifiée, donc le volet navigateur multi-profils est PARTIEL.
