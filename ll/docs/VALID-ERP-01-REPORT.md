# VALID-ERP-01 — Rapport de clôture Dashboard

Date d'audit : 2026-10-10  
Verdict : **VALIDÉ AVEC RÉSERVES**

## Périmètre et méthode

Les cinq rapports AUDIT-ERP-01 et les quatre rapports CORR-ERP-01 ont été relus intégralement. Les constats ont ensuite été recoupés avec le code courant, les tests ciblés, les builds/lints et les suites globales. Aucun rapport antérieur n'a été tenu pour preuve suffisante à lui seul.

## Contrôle A01 à A13

| ID | Résultat | Preuve synthétique |
|---|---|---|
| A01 | Conforme | Comparaison avec la vraie semaine précédente dans `dashboard.routes.ts`. |
| A02 | Conforme | CA excluant les factures `draft` et `cancelled`. |
| A03 | Conforme | Marge limitée aux ventes actives, hors états annulés. |
| A04 | Conforme | Union comptable factures/avoirs, chaque pièce utilisant sa propre date d'émission. |
| A05 | Conforme | Bornes supérieures des périodes explicites. |
| A06 | Conforme | Séries récursives complètes : 7 jours et 6 mois, y compris seaux vides. |
| A07 | Conforme | Séries graphiques différenciées visuellement. |
| A08 | Conforme | Filtres agence/commercial appliqués côté serveur. |
| A09 | Conforme | Filtres actifs cohérents entre requêtes et affichage. |
| A10 | Conforme | Libellé du KPI aligné sur la période réellement calculée. |
| A11 | Conforme | État d'erreur explicite, distinct de l'état vide. |
| A12 | **À vérifier** | Implémentation responsive présente, mais validation navigateur du bundle corrigé bloquée. |
| A13 | Conforme | Navigation réalisée avec des liens applicatifs. |

## A12 — validation responsive

Le port 3001 sert une instance déjà ouverte à `http://127.0.0.1:3001`. Elle ne correspond pas de manière démontrable au bundle corrigé du workspace. Le processus propriétaire n'est pas visible depuis l'espace de processus/réseau accessible à cette mission ; son identité, son conteneur éventuel et ses sessions n'ont donc pas pu être établis avec certitude. Conformément aux consignes, il n'a pas été arrêté ni remplacé.

Le lancement isolé proposé sur 3002 a été refusé par la couche d'exécution de l'environnement avant création du processus. Aucune instance temporaire n'a donc été démarrée. Les résolutions 1440, 1024, 768 et 375 px n'ont pas pu être validées sur le code corrigé. Aucune capture de l'ancien bundle n'est présentée comme preuve de correction.

Réserve : A12 reste une vérification réelle obligatoire avant levée complète du verdict.

## Cohérence financière avec Reporting

Le Dashboard corrigé utilise la date propre de l'avoir. Le Reporting conserve une autre convention dans ses agrégats principaux : les avoirs sont rattachés à la période de la facture d'origine, tandis que ses agrégats financiers dédiés utilisent la date de l'avoir. Il s'agit d'une divergence intermodule confirmée, antérieure et non modifiée pendant cette mission.

Impact : pour un avoir émis dans une période différente de sa facture, le CA net Dashboard et certains totaux Reporting peuvent diverger. Une décision comptable doit déterminer la convention canonique avant toute correction. Les brouillons/annulations, marges, bornes de période et permissions du Dashboard sont correctement traités dans le périmètre testé.

## Conclusion

Les corrections A01–A11 et A13 sont étayées par le code et les tests ciblés. Le Dashboard n'est pas déclaré « apte production ERP » : A12 reste non observé sur le bundle courant et les suites globales contiennent des échecs hors du seul périmètre Dashboard. La divergence temporelle Reporting doit aussi être arbitrée.
