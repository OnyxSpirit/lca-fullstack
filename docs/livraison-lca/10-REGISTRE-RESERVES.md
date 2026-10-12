# Registre des réserves

| ID | Réserve | Gravité | Impact | Mesure de maîtrise | Responsable | État / clôture |
|---|---|---|---|---|---|---|
| LCA-R01 | Six accès historiquement exposés, rotation/révocation non confirmée | Bloquante sécurité | compromission potentielle | révoquer/renouveler, vérifier usages, conserver preuve | sécurité BEROX/LCA à confirmer | ouverte ; Phase B : absents des cinq environnements locaux actifs, mais exhaustivité et autorité propriétaire non confirmées |
| LCA-R02 | Éléments sensibles dans l'historique Git | Bloquante pour remise Git | accès à anciens secrets/données | remettre uniquement export assaini sans `.git`, décider purge séparément | propriétaire dépôt à confirmer | ouverte ; clone interdit |
| LCA-R03 | Isolation réelle multi-concession non qualifiée | Majeure | exposition croisée possible | lancement mono-concession ; scénario antagoniste avant extension | produit/sécurité LCA à confirmer | ouverte conditionnelle |
| LCA-R04 | Fenêtre rare d'orphelin GED après crash brutal | Majeure | occupation/écart de traçabilité | inventaire SQL/volume, hash, quarantaine décidée, aucune suppression automatique | exploitation LCA à confirmer | ouverte |
| LCA-R05 | Durées de restauration mesurées sur données fictives | Modérée | RTO/RPO inconnu | test avec volumétrie représentative et chronométrage | exploitation LCA à confirmer | ouverte |
| LCA-R06 | Production non autorisée | Bloquante processus | déploiement sans validation | approbations sécurité, exploitation et métier | gouvernance LCA/BEROX à confirmer | ouverte |
| LCA-R07 | Rate-limit en mémoire | Majeure si horizontalisation | quotas par instance | rester mono-instance ou ajouter un store partagé validé | architecture à confirmer | ouverte conditionnelle |
| LCA-R08 | Socket déjà connectée non réévaluée en continu après révocation | Modérée | délai de révocation temps réel | fermeture client, TTL court, registre/validation périodique si exigé | sécurité à confirmer | ouverte |
| LCA-R09 | Scripts backup/restore liés aux volumes `lca_*` | Majeure opérationnelle | mauvaise cible en multi-environnement | paramétrer/revoir avant autre topologie, toujours restaurer à vide | DevOps à confirmer | ouverte |
| LCA-R10 | Archive RC2 non signée numériquement | Majeure chaîne de livraison | SHA ne prouve pas l'émetteur | signature par identité autorisée si exigée | autorité de remise à confirmer | ouverte |
| LCA-R11 | Couverture navigateur non exhaustive de tous les profils/scopes | Modérée | défaut UI rare | smoke-test des profils réels en préproduction | recette LCA à confirmer | ouverte |
| LCA-R12 | Infrastructure cible TLS/DNS/SMTP/intégrations non qualifiée | Majeure | indisponibilité ou notifications absentes | recette d'infrastructure dédiée | exploitation LCA à confirmer | ouverte |

Aucune réserve ne doit être clôturée sans preuve datée, responsable identifié et validation de l'impact.

## Preuves, conditions de clôture et portée

| ID | Preuve attendue | Condition de clôture | Bloque distribution | Bloque production |
|---|---|---|:---:|:---:|
| LCA-R01 | attestation datée par accès, ancien accès refusé, sessions révoquées | six accès au statut rotation ou révocation confirmée | oui | oui |
| LCA-R02 | inventaire du paquet sans `.git` et décision propriétaire sur l'historique | mode de remise assaini approuvé ; purge seulement si décidée séparément | oui pour toute remise Git | oui si chaîne source non maîtrisée |
| LCA-R03 | scénario runtime à deux concessions, contrôles SQL/API/UI antagonistes | aucune fuite et matrice validée | non pour mono-concession | oui pour multi-concession |
| LCA-R04 | test de crash/réconciliation et procédure d'incident approuvée | détection/quarantaine démontrées | non | selon acceptation du risque |
| LCA-R05 | restore drill avec volumétrie représentative et chronométrage | RPO/RTO définis et atteints | non | oui |
| LCA-R06 | autorisations écrites sécurité, exploitation et métier | décision formelle de mise en production | non | oui |
| LCA-R07 | test multi-instance avec store partagé ou décision mono-instance | quotas cohérents sur topologie cible | non | oui si horizontalisé |
| LCA-R08 | exigence de révocation définie et test correspondant | délai accepté ou révocation temps réel démontrée | non | selon exigence sécurité |
| LCA-R09 | scripts paramétrés/revus et restauration cible vide réussie | aucune cible implicite dangereuse | non | oui |
| LCA-R10 | signature vérifiable par identité autorisée, si requise | politique de signature satisfaite ou renonciation formelle | selon politique | non |
| LCA-R11 | matrice des profils réels et smoke-tests préproduction | accès/refus attendus validés | non | oui |
| LCA-R12 | procès-verbal de recette infrastructure | DNS/TLS/proxy/intégrations/supervision validés | non | oui |

Les responsables indiqués dans le premier tableau sont proposés et restent à confirmer. Les décisions « selon politique » ou « selon acceptation » exigent une trace écrite ; elles ne valent pas clôture implicite.
