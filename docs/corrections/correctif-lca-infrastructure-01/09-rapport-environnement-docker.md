# Environnement Docker

La configuration de référence reste `docker-compose.codex-qualification.yml`, paramétrable et basée sur Node 22/MySQL 8.4. Aucun fichier Compose par fonctionnalité n'a été ajouté. Les qualifications de cette mission utilisent des ressources étiquetées `lca.purpose=correctif-lca-infrastructure-01` et le réseau dédié du même nom.

Un premier MySQL isolé s'est arrêté proprement sur signal externe lors d'une interruption; il n'a pas été redémarré. Une seconde instance et un nouveau volume ont été créés. Aucun conteneur, volume, réseau, image ou cache n'a été supprimé; aucune commande `down`, `stop`, `rm` ou `prune` n'a été exécutée.

L'interruption de l'orchestrateur Compose a laissé des ressources de qualification créées mais n'a altéré aucune ressource préexistante. Leur état a été inspecté avant reprise; les services déjà créés ont ensuite été démarrés sans remplacement. Le test long du runner s'est terminé avec le code 1 uniquement parce que son ancien plafond de 1 200 secondes a expiré; ses journaux montrent néanmoins les deux exécutions concurrentes au niveau 137 avec zéro avertissement. Aucun processus de qualification n'a été forcé à s'arrêter.
