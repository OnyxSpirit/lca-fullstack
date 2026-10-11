# ERP-17 — Audit de conception multi-concessions

Audit statique uniquement ; aucune seconde concession créée.
Modèle : groups_company→concessions→agencies ; utilisateur rattaché à agence ; rôles/permissions persistés. Une concession en recette (COUNT=1).
Scopes : scope-intersection lie CONCESSION à agencies.concession_id de l'acteur ; AGENCY à agence ; OWN combine propriétaire/agence sauf contrat explicite ; GLOBAL traverse les concessions.
Notifications : ciblage nominatif et sélection permissions avec jointure concession ; rooms user/agence et room global pour settings GLOBAL.
GED : métadonnées agence/concession, intersection permission GED et permission métier, stockage par agence/année/mois/UUID, contrôle de chemin et hash. Le stockage n'est pas une frontière d'autorisation à lui seul.

Risques/décisions :
- définir gouvernance de GLOBAL et administration des rôles partagés entre concessions ;
- définir maintien/recalcul des métadonnées GED si une agence change de concession ;
- définir révocation/reconnexion des sockets lors d'un changement d'agence/permissions ;
- préciser politique de partage clients/véhicules/référentiels ;
- couvrir les modules avec tests adversariaux à deux concessions avant conclusion de sécurité globale.
Aucune fuite réelle inter-concessions n'est démontrée ni exclue par cette lecture. Verdict PARTIEL pour isolation opérationnelle.

