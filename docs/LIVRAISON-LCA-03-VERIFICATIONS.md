# LIVRAISON-LCA-03 Phase B — Vérifications de sécurité

Date : 12 octobre 2026

## 1. Méthode de preuve

Les contrôles ont utilisé uniquement :

- `docker ps` pour identifier les projets et services actifs ;
- des `SELECT` MySQL exécutés dans les cinq conteneurs de base ;
- un rapprochement en mémoire des six identifiants historiques vers les références A1–A6 ;
- la lecture des mécanismes d'authentification, de reset, de sessions et de Socket.IO.

Les commandes n'ont reçu aucun mot de passe historique ou nouveau en argument. Les sorties ne contiennent ni identifiant, ni mot de passe, ni JWT, ni refresh token, ni cookie, ni hash.

## 2. Résultats par compte

| Référence | Existence locale | Ancien mot de passe refusé | Nouveau accepté | Ancien access token refusé | Ancien refresh refusé | Sessions révoquées | Socket antérieure | RBAC inchangé | Données préservées |
|---|---|---|---|---|---|---|---|---|---|
| A1 | absente des 5 bases | non testé | sans objet | sans objet localement | sans objet localement | aucune session trouvée | aucune preuve de socket | oui, aucune mutation | oui |
| A2 | absente des 5 bases | non testé | sans objet | sans objet localement | sans objet localement | aucune session trouvée | aucune preuve de socket | oui, aucune mutation | oui |
| A3 | absente des 5 bases | non testé | sans objet | sans objet localement | sans objet localement | aucune session trouvée | aucune preuve de socket | oui, aucune mutation | oui |
| A4 | absente des 5 bases | non testé | sans objet | sans objet localement | sans objet localement | aucune session trouvée | aucune preuve de socket | oui, aucune mutation | oui |
| A5 | absente des 5 bases | non testé | sans objet | sans objet localement | sans objet localement | aucune session trouvée | aucune preuve de socket | oui, aucune mutation | oui |
| A6 | absente des 5 bases | non testé | sans objet | sans objet localement | sans objet localement | aucune session trouvée | aucune preuve de socket | oui, aucune mutation | oui |

Le refus de l'ancien mot de passe n'a pas été testé : tenter une authentification avec un secret historiquement exposé, sans environnement propriétaire ni autorisation, aurait constitué une utilisation réelle non autorisée. L'absence de ligne `users` implique qu'aucune authentification de ces identifiants n'est possible dans les cinq bases inspectées, mais ne prouve rien pour un environnement non inventorié.

## 3. Vérification des mécanismes

| Contrôle du code actuel | Résultat |
|---|---|
| Hash des mots de passe | Argon2 |
| Reset administrateur | `PATCH /users/:id/password`, permission `users.reset_password` et contrôle de scope |
| Atomicité | mise à jour du hash et révocation des refresh tokens dans une transaction |
| Access token | chaque requête protégée exige un `sid` encore actif dans `refresh_tokens` |
| Refresh token | rotation conditionnée à une session non révoquée et non expirée |
| Désactivation | révoque les sessions, désactive le technicien associé et déconnecte l'utilisateur ciblé |
| Socket.IO après simple reset | faiblesse résiduelle : pas de `disconnectUser` explicite dans `resetPassword` |

La faiblesse Socket.IO ne justifie aucune correction dans cette phase : aucun compte cible n'est présent et aucun environnement n'est autorisé à recevoir un changement. Le plan Phase A conserve l'exigence de coupure ciblée lors d'une future rotation effective.

## 4. Non-régression proportionnée

- les quinze conteneurs observés étaient `healthy` ;
- les cinq bases étaient initialisées et contenaient respectivement 2, 24, 2, 2 et 3 utilisateurs ;
- aucune commande de build, restart, up, down ou déploiement n'a été exécutée ;
- aucune requête d'écriture n'a été envoyée aux bases ;
- aucune campagne ERP-01 à ERP-22 n'a été relancée ;
- `git diff --check` est utilisé sur les seuls livrables documentaires.

Les tests de nouvelle connexion, navigation, RBAC et Socket.IO ne sont pas applicables en l'absence de compte cible et de rotation autorisée. Aucun résultat n'est inventé.

## 5. Preuve manquante pour clôture

Pour A1–A6, il faut soit :

- une attestation du propriétaire confirmant que l'inventaire est exhaustif et que les comptes n'existent plus dans aucun environnement ;
- soit une rotation/révocation effective et les contrôles A à I sur chaque environnement supplémentaire identifié.

Tant que cette preuve n'existe pas, l'absence locale est un constat de confinement, pas une clôture de sécurité.
