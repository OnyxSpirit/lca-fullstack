# Tests de trésorerie

Exécutés via API et contrôlés par MySQL : entrée 75 000, sortie 25 000, transfert 50 000, contrepassation 25 000, refus de 999 999 999 pour solde insuffisant et refus de catégorie incompatible. Les soldes finaux ont été calculés par compte.

L’encaissement SAV ajoute un mouvement entrant `POSTED` de 53 505 XAF, source règlement 7. Le journal et l’écran Comptabilité & Trésorerie l’affichent correctement dans l’agence financière Pointe-Noire.

Revalidation finale sur base neuve : entrée 75 000 XAF, sortie 25 000 XAF, transfert 50 000 XAF, contrepassation du mouvement 12 par le mouvement 15. Les refus 409 « Solde disponible insuffisant » et « Sens du mouvement incompatible avec la catégorie » sont conformes.
