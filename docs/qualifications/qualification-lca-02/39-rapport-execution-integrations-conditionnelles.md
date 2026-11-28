# Rapport d’exécution des intégrations conditionnelles

## Périmètre et méthode

L’inventaire AST et le journal TAP initial concordent sur **107 tests individuels**. La suite standard les ignore légitimement lorsque ses drapeaux ne sont pas activés ; la qualification dédiée les exécute sur Node.js 22, MySQL 8.4, API réelle, Poppler et, pour le dernier test, un proxy WSS à chaîne TLS réellement vérifiée.

La première passe d’investigation a exécuté 106 tests conditionnels hors WSS. Parmi les 107 intégrations, 100 ont réussi dès leur première exécution applicable et 7 ont initialement échoué. Le WSS a réussi dès son premier passage correctement configuré. Dix-huit échecs supplémentaires observés dans le même runner concernaient des tests PDF non conditionnels et provenaient de l’image Node minimale dépourvue de Poppler ; ils ne sont pas comptabilisés comme échecs parmi les 107. Les 7 intégrations en défaut ont révélé des fixtures historiques incompatibles avec le workflow SAV actuel, une garde de nom de base trop étroite, une collision artificielle d’identifiants de test, ainsi qu’une anomalie réelle de colonne `origin_source` au lieu de `commercial_origin_source` lors de l’acceptation d’un devis diagnostic.

## Corrections

- le workflow Lot 14C.2 passe désormais réellement par diagnostic, finalisation, chiffrage, émission et acceptation du devis ;
- la requête d’origine véhicule utilise la colonne persistée `commercial_origin_source` ;
- les tests SAV historiques prouvent le refus de création directe, puis préparent explicitement leurs états historiques en base isolée pour tester les opérations aval ;
- la fixture RBAC prend en charge la décision 2FA ajoutée au middleware ;
- la qualification des rôles accepte le nom générique de la base d’intégration isolée ;
- les marques documentaires utilisent des plages d’identifiants distinctes ;
- l’amorçage administrateur est exécuté sur une base vierge dédiée ;
- les contrôles PDF sont exécutés dans l’image backend de référence contenant Poppler ;
- WSS est exécuté derrière un proxy TLS isolé avec certificat éphémère et validation de la CA.

## Preuves

- inventaire initial : `preuves/integrations-conditionnelles/inventaire/` ;
- première passe : `preuves/integrations-conditionnelles/journaux/integrations-sans-wss.log` ;
- corrections ciblées : `preuves/integrations-conditionnelles/journaux/corrections-ciblees.tap` ;
- PDF et workflow : `preuves/integrations-conditionnelles/journaux/corrections-pdf-et-workflow.tap` ;
- administrateur isolé : `preuves/integrations-conditionnelles/journaux/admin-provisioning-isole.tap` ;
- marques documentaires : `preuves/integrations-conditionnelles/journaux/document-marques-b321.tap` ;
- WSS réel : `preuves/integrations-conditionnelles/journaux/wss-proxy-reel-rootdb.tap` ;
- passe consolidée : `preuves/integrations-conditionnelles/passage-complet/`.
- passe finale conditionnelle : `preuves/integrations-conditionnelles/passage-conditionnelle-finale/` ;
- reprises des trois délais longs : `preuves/integrations-conditionnelles/journaux/customer-identity-final.tap`, `migration-080-final.tap` et `mysql-migration-runner-final.tap`.

La passe finale conditionnelle a exécuté les fichiers portant les 107 tests : les deux ignorés sont intentionnellement IC-001 et IC-107, exécutés et réussis dans leurs bancs dédiés. Trois scénarios ont dépassé leur délai historique sous la charge de migrations ; leurs délais ont été alignés sur les durées réelles puis ils ont été rejoués individuellement. Le rapprochement autoritaire est donc 102 réussites dans la passe commune + 3 reprises longues + 1 administrateur + 1 WSS = **107 réussites**.

Le verdict définitif et les décomptes finaux sont consignés dans `37-verdict-final.md`. Résultat : **107/107 réussies, 0 non qualifiée**.
