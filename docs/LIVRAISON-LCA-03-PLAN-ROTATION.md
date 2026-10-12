# LIVRAISON-LCA-03 Phase A — Plan de révocation et de rotation

Date : 12 octobre 2026  
État : plan uniquement — aucune action réelle exécutée

## 1. Principes de sécurité

- traiter les six comptes comme compromis jusqu'à preuve contraire ;
- ne jamais réutiliser le mot de passe historique ni un même nouveau secret pour plusieurs comptes ;
- stocker chaque nouveau secret uniquement dans le coffre approuvé et le transmettre par un canal distinct ;
- effectuer l'opération sur un environnement explicitement identifié, jamais par défaut ;
- privilégier la désactivation définitive d'un compte sans utilité légitime ;
- préserver les traces d'audit, sans enregistrer ancien ou nouveau secret ;
- exiger deux personnes : opérateur habilité et valideur sécurité/métier.

## 2. Prérequis communs

1. Autorisation écrite précisant environnements, fenêtre et six comptes.
2. Responsable LCA/BEROX nommé pour chaque compte et opérateur disposant de `users.reset_password` dans le scope requis.
3. Rapprochement en lecture seule : compte, état, agence, concession, rôle, permissions, scopes, dernière connexion et sessions actives.
4. Décision documentée : supprimer/désactiver le compte ou le conserver.
5. Contrôle des opérations métier en cours, notamment atelier, vente, stock et finance.
6. Point de récupération vérifié et procédure d'escalade disponible ; aucune restauration globale de base pour une simple erreur de secret.
7. Secrets uniques générés par le coffre, politique de complexité LCA satisfaite, canal de remise testé.
8. Observabilité disponible : audit utilisateurs, journaux d'authentification, état des sessions et Socket.IO.

Condition d'arrêt immédiat : environnement ambigu, compte non rapproché, rôle inattendu, activité critique en cours, opérateur hors scope, absence de coffre ou impossibilité de prouver la révocation.

## 3. Ordre recommandé

L'ordre provisoire réduit d'abord l'exposition des fonctions à impact transversal :

1. A1 — Direction ;
2. A5 — Comptabilité & Finance ;
3. A2 — Responsable Commercial ;
4. A6 — Responsable Pièces ;
5. A4 — Chef d'Atelier ;
6. A3 — Conseiller Commercial.

Avant exécution, réordonner selon les permissions/scopes réels et l'activité. Si les six comptes partagent encore le même secret, préparer toutes les nouvelles valeurs avant la fenêtre et enchaîner les rotations sans intervalle inutile. Une anomalie sur un compte suspend la suite, sauf décision explicite de poursuivre les révocations urgentes.

## 4. Procédure par accès conservé

La séquence suivante s'applique séparément à A1–A6.

1. **Prérequis** — confirmer identité masquée, environnement, propriétaire, rôle/scopes, absence d'opération critique et ticket autorisé.
2. **Responsables** — opérateur d'administration habilité ; propriétaire métier pour le test ; valideur sécurité indépendant. Noms à confirmer.
3. **Préparation** — générer un secret unique dans le coffre ; ne pas l'inscrire dans le ticket, les logs, le shell, Git ou ce rapport.
4. **Confinement** — si une socket active ou un usage hostile est suspecté, désactiver temporairement le compte par la fonction applicative. Vérifier auparavant l'absence de session atelier ou transaction métier incompatible. Cette action révoque les sessions et demande une coupure Socket.IO ciblée.
5. **Rotation** — utiliser `PATCH /users/:id/password` via l'interface ou un client approuvé, avec une session d'administrateur autorisée. L'opération attendue met à jour le hash et révoque les refresh tokens dans une transaction.
6. **Réactivation conditionnelle** — seulement si le compte était désactivé, si son maintien est approuvé et si rôle/agence sont inchangés.
7. **Vérification positive** — dans un contexte client isolé, connecter le propriétaire avec le nouveau secret, appeler `/auth/me`, contrôler rôle/agence/scopes et une action non destructive représentative.
8. **Vérification négative** — constater le refus de l'ancien mot de passe et d'une ancienne session préalablement identifiée ; ne pas capturer les valeurs. Vérifier qu'une socket antérieure est fermée ou ne reçoit plus d'événement.
9. **Non-régression** — confirmer santé de l'API, connexions des autres comptes, absence de 5xx, RBAC inchangé, audit `user.password_reset` présent et absence d'impact métier.
10. **Preuve et clôture** — consigner ID A*, environnement, date UTC, opérateur, valideur, résultats positif/négatif, référence du coffre et ticket. Clôturer seulement après double validation.

Le backend, le frontend et MySQL ne nécessitent normalement aucun redémarrage. Un redémarrage global n'est pas une méthode de rotation et ne doit pas servir à compenser une coupure Socket.IO ciblée non prouvée.

## 5. Procédure par accès inutile

1. obtenir la confirmation écrite du propriétaire métier ;
2. vérifier absence de dépendance technique, activité, tâche planifiée ou opération en cours ;
3. désactiver le compte par la fonction d'administration ;
4. confirmer révocation des sessions, coupure Socket.IO et refus d'une nouvelle authentification ;
5. conserver le compte désactivé pour traçabilité, sauf politique de suppression séparément approuvée ;
6. enregistrer la preuve de révocation et le motif métier.

La désactivation définitive vaut révocation confirmée ; une rotation supplémentaire n'est utile que si le compte doit être réactivé.

## 6. Mesure de récupération

| Incident | Réponse sûre |
|---|---|
| Nouveau secret non reçu | garder le compte désactivé ou révoqué ; réémettre un autre secret depuis le coffre |
| Nouveau secret refusé | ne jamais rétablir l'ancien ; vérifier la cible, le compte et l'audit, puis effectuer une nouvelle réinitialisation autorisée |
| Administrateur hors scope | arrêter ; faire intervenir un administrateur habilité, sans élargir temporairement le RBAC |
| Activité métier interrompue | arrêter les rotations suivantes, coordonner le propriétaire, reprendre avec le nouveau secret uniquement |
| Socket encore connectée | couper le compte de façon ciblée et valider la déconnexion ; ne pas redémarrer toute la plateforme sans autorisation |
| Erreur de cible/environnement | arrêter, préserver les traces, notifier sécurité et propriétaire, évaluer l'incident avant correction |
| Anomalie transactionnelle | ne pas éditer directement les tables ; conserver journaux, solliciter l'équipe applicative et appliquer une procédure approuvée |

Une restauration MySQL globale serait disproportionnée et risquerait de réintroduire l'ancien hash. Elle n'est envisageable que dans un plan d'incident distinct, autorisé et analysé.

## 7. Matrice de preuve

| Accès | Décision métier | Environnement | Rotation/révocation | Sessions révoquées | Ancien accès refusé | Nouvel accès validé si conservé | Socket close | Opérateur / valideur | Statut |
|---|---|---|---|---|---|---|---|---|---|
| A1 | à confirmer | à identifier | non exécutée | non vérifié | non vérifié | non vérifié | non vérifié | à confirmer | À traiter |
| A2 | à confirmer | à identifier | non exécutée | non vérifié | non vérifié | non vérifié | non vérifié | à confirmer | À traiter |
| A3 | à confirmer | à identifier | non exécutée | non vérifié | non vérifié | non vérifié | non vérifié | à confirmer | À traiter |
| A4 | à confirmer | à identifier | non exécutée | non vérifié | non vérifié | non vérifié | non vérifié | à confirmer | À traiter |
| A5 | à confirmer | à identifier | non exécutée | non vérifié | non vérifié | non vérifié | non vérifié | à confirmer | À traiter |
| A6 | à confirmer | à identifier | non exécutée | non vérifié | non vérifié | non vérifié | non vérifié | à confirmer | À traiter |

Statuts finaux admis : `Rotation confirmée` ou `Révocation confirmée`. Les six lignes doivent avoir un statut confirmé avant proposition de clôture de `LCA-R01`.

## 8. Historique et distribution

Après rotation, la remise doit toujours exclure `.git`. Utiliser seulement l'archive RC2 assainie et son manifeste après nouvelle validation d'intégrité et autorisation formelle. Une éventuelle purge d'historique est une mission séparée, coordonnée avec tous les détenteurs de clones ; elle n'est ni requise pour exécuter la rotation, ni autorisée ici.

