# 09 — Temps réel

Le serveur Socket.IO construit des salles par utilisateur, session et agence active. Un Super Administrateur reste limité aux salles de l'agence active ; les permissions sensibles ne créent pas de salle globale implicite. Les changements d'agence, retraits de rôle et révocations de session recalculent ou ferment les connexions.

Le centre de notifications écoute la création et rafraîchit le compteur/liste. Les tests statiques et backend ciblés sont verts. Le test `notifications-agency-rbac-mysql.integration.test.ts` contient une preuve réelle positive/négative de diffusion par agence, et `agency-realtime-mysql.integration.test.ts` vérifie la révocation, mais ils n'ont pas été exécutés dans cette mission pour la raison nominale documentée.

Verdict temps réel : **incomplet** sur preuve environnementale, architecture cohérente sur preuve statique et automatisée.

