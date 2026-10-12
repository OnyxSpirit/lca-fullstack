# Anomalies historiques et régressions

## Méthode

Les rapports ERP-01 à ERP-22, recettes et dossiers de livraison disponibles ont été recoupés avec le code courant. Une mention historique n'a jamais été reprise sans preuve active.

## Correctifs historiques toujours présents

- sessions JWT persistées, rotation/révocation HTTP et contrôle Socket au handshake ;
- algorithme HS256 imposé et longueur minimale des secrets ;
- limitation des routes d'authentification ;
- transactions/retry deadlock et verrous sur opérations financières, stocks, livraison et garantie ;
- GED privée, contrôle de chemin, signatures, hash et stockage staging ;
- staging atomique des images véhicule ;
- protection du dernier Super Admin ;
- RBAC Atelier/Pièces corrigé lors d'ERP-19 ;
- migration lock/checksums/journal, conteneurs non-root, rotation logs et réseau DB privé.

Les treize anomalies significatives déclarées closes dans le bilan ERP-20 n'ont pas été rouvertes.

## Risques historiques encore explicitement réservés

- Fenêtre de crash brutal entre écriture fichier GED et commit SQL : réserve ERP-17/20, non recomptée comme nouvelle anomalie.
- Multi-concession non validé dynamiquement : réserve historique ; AUD-LCA-002 est un défaut de code distinct et actuel du middleware.
- Last-write-wins des paramètres : comportement connu, non requalifié sans exigence concurrente contraire.
- Persistance Socket après révocation/changement : risque déjà signalé dans LCA-R08 et **confirmé actif** sous AUD-LCA-003 ; ce n'est pas présenté comme régression d'un correctif annoncé.

## Régressions

**Aucune régression confirmée (0).** Les constats actuels sont soit des défauts résiduels distincts, soit des réserves jamais déclarées corrigées. AUD-LCA-001 révèle une dérive entre chemins d'installation historique et frais, pas le retour démontré d'un défaut précédemment corrigé.

## Éléments écartés

Les anciens défauts de cartes Dashboard non clavier, dialogues natifs, formulaire CRM/API et campagnes de tests historiquement rouges n'ont pas été dupliqués : soit ils sont déjà documentés comme réserves, soit le code courant ne justifie pas leur réouverture sous un nouvel identifiant.
