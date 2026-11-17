# Rapport de non-régression

Builds frontend et backend réussis. La sélection backend financière compte 17 fichiers réussis sur 17, incluant FIN-005, les intégrations MySQL, la trésorerie manuelle, l’automatisation comptable, le RBAC et les deux procédures historiques. La sélection frontend financière compte 40 tests réussis sur 40 après correction de l’attente devenue obsolète « Mouvements Treasury » vers « Mouvements de trésorerie ».

La suite globale backend a été lancée mais présente plusieurs échecs hors périmètre (notamment fixtures d’application/authentification et modules commerciaux). La suite globale frontend a également révélé plusieurs attentes historiques hors périmètre ; elle a été interrompue après collecte, puis la sélection financière a été isolée et entièrement réussie. Ces suites globales ne sont donc pas présentées comme vertes.

Le 17 novembre, le test ciblé `sav-parts-refonte-foundation.test.ts` réussit après la migration 129, ainsi que les builds backend et frontend. Le dernier lancement global backend a encore observé des échecs dans app/auth, commercial, CRM, livraison et marques documentaires, puis a été interrompu après blocage prolongé. Aucun de ces résultats n’est masqué ni requalifié comme vert.
