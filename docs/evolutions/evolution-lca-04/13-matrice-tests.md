# Matrice des scénarios

155 scénarios individualisés ont été exécutés dans `evolution-lca-04-francisation.test.ts`, tous réussis.

| IDs | Exigence / domaine | Action et donnée observable | Preuve | Résultat |
|---|---|---|---|---|
| T001-T030 | EVO-14, champs véhicules | Chaque clé technique est comparée à son libellé français attendu | test automatisé | 30/30 |
| T031-T065 | EVO-14, statuts | Chaque état est comparé individuellement | test automatisé | 35/35 |
| T066-T092 | EVO-14/15/16, opérations | Paiements, stocks, contrats et priorités | test automatisé | 27/27 |
| T093-T106 | Inconnus, formats, finance | Inconnu explicite, virgule, directions, événements et mouvements | test automatisé | 14/14 |
| T107-T114 | EVO-15 | BOM, séparateur, références, négatif, formule, guillemets, accents, multiligne | CSV réel | 8/8 |
| T115-T117 | EVO-14 | Signature et taille substantielle de chacun des 3 PDF | PDF réels | 3/3 |
| T118-T132 | EVO-14, pro forma | Présences françaises et absences anglaises individualisées | texte extrait | 15/15 |
| T133-T143 | EVO-14, multipage/accents | états, paiements, pagination, accents | texte extrait / PNG | 11/11 |
| T144-T155 | EVO-16 | feuilles, dimensions, types et formats de cellules | XLSX rouvert | 12/12 |

Chaque intitulé exact T001-T155 est conservé dans le fichier de test exécutable et son résultat a été affiché par le runner Node.
