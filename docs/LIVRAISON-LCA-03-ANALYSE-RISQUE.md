# LIVRAISON-LCA-03 Phase C — Analyse de risque LCA-R01

Date : 12 octobre 2026

## 1. Scénarios de risque

| Scénario | Probabilité établie | Impact potentiel | Niveau conservatoire | Justification |
|---|---|---|---|---|
| ancien compte encore présent dans un des cinq environnements actifs | faible au moment du contrôle | élevé | faible résiduel local | absence exacte démontrée sur 33 utilisateurs |
| compte présent dans l'un des deux volumes MySQL historiques nommés | inconnue | élevé | élevé | volumes persistants récupérables, contenu non autorisé au contrôle |
| compte présent dans une base technique anonyme arrêtée | inconnue à faible | modéré à élevé selon exposition | modéré | quatre volumes persistent, finalité test documentée mais contenu non qualifié |
| compte présent dans une installation externe | inconnue | élevé | élevé | aucun inventaire ou attestation propriétaire |
| mot de passe commun encore valide | inconnue | élevé à critique | élevé | secret exposé par Git, aucune rotation globale attestée |
| compte seulement présent dans un dump hors ligne | inconnue | élevé en cas de restauration/exposition | modéré à élevé | une restauration pourrait réactiver un ancien hash et des sessions/données |
| récupération depuis l'historique Git | certaine pour un détenteur du dépôt complet | élevé | élevé | blob historique intact ; `.gitignore` et export RC2 ne purgent pas les clones |

## 2. Possibilité d'utilisation actuelle

Les six identifiants ne peuvent pas authentifier un utilisateur dans les cinq bases actives contrôlées, car aucune ligne `users` correspondante n'y existe. Les deux MySQL historiques sont arrêtés : leurs comptes éventuels ne sont pas utilisables tant que ces installations restent arrêtées, mais pourraient redevenir utilisables si les volumes étaient redémarrés avec une application compatible. Une installation externe inconnue pourrait être utilisable immédiatement ; aucune preuve ne permet de l'exclure.

## 3. Risque des bases archivées

Les trois dumps connus ne contiennent aucune des six références. Cette preuve est limitée aux fichiers contrôlés. Toute autre sauvegarde, snapshot de volume, export SQL ou archive peut conserver un hash valide. Une restauration ne doit donc jamais réactiver automatiquement des utilisateurs historiques : le contrôle A1–A6 doit faire partie du protocole avant ouverture réseau.

## 4. Limites de l'inventaire

- l'inventaire Docker couvre un seul moteur local à un instant donné ;
- aucun inventaire CMDB, DNS, cloud, VPS, hyperviseur, poste ou coffre n'est disponible ;
- les volumes arrêtés ne sont pas qualifiés ;
- les propriétaires et détenteurs de clones ne sont pas recensés ;
- aucune preuve de suppression ou rotation historique par A1–A6 n'existe ;
- absence locale et révocation ne sont pas équivalentes.

## 5. Mesures recommandées

1. Faire signer l'attestation de périmètre par le responsable habilité.
2. Maintenir arrêtés et non exposés les MySQL historiques jusqu'à leur qualification.
3. Après autorisation, rechercher A1–A6 en lecture seule dans chaque volume historique, sans démarrer d'API ou de frontend.
4. Si un compte est trouvé, le considérer compromis : le désactiver ou le tourner via le mécanisme applicatif dans une fenêtre autorisée, puis vérifier sessions et Socket.IO.
5. Avant toute restauration de sauvegarde, exécuter le contrôle des comptes exposés dans une cible isolée et sans réseau public.
6. Ne distribuer que l'archive RC2 sans `.git`; conserver l'historique sous accès restreint.
7. Identifier et traiter toute copie externe ou tout clone selon la gouvernance sécurité.

## 6. Décision LCA-R01

Le dossier relève à la fois du **cas B** (environnements historiques supplémentaires identifiés) et du **cas C** (inventaire externe incomplet). `LCA-R01` doit rester ouverte.

Une proposition de clôture ne deviendra recevable que si :

- le périmètre exhaustif est attesté ;
- les bases historiques sont contrôlées ou leur destruction est attestée ;
- toute correspondance est révoquée/rotée avec preuve ;
- les exclusions sont explicitement acceptées par l'autorité habilitée.

La clôture de `LCA-R01` ne vaudra ni autorisation de distribution ni autorisation de production.

