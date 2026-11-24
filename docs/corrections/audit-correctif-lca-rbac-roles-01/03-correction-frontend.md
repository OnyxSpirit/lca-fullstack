# Correction frontend

## Comportement corrigé

- actif : badge **Actif**, bouton **Désactiver** ;
- inactif : badge **Inactif**, bouton **Réactiver** ;
- succès : notification contextualisée en français ;
- erreur : aucun changement optimiste, notification explicite et état confirmé conservé ;
- double clic : une seule requête grâce à un registre synchrone `Set` conservé dans une référence ;
- chargement : seul l'identifiant du rôle concerné est marqué en cours.

La liste et le détail sont immédiatement alimentés par la réponse canonique, puis invalidés et relus. Les filtres utilisent la même propriété booléenne.

## Tests observables

`frontend/test/role-status-rbac.behavior.test.ts` monte réellement le composant avec React Testing Library et JSDOM. Il vérifie le badge, les boutons, les requêtes, les notifications, la relecture, le double clic et l'échec HTTP. Résultat ciblé : **3 réussis, 0 échec**, 17,646 s.
