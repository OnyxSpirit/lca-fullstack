# Rapport — Garanties constructeurs dans le stock VN/VO

## Résultat

Les formulaires « Entrer en stock » et « Modifier le véhicule » utilisent désormais le paramétrage existant de **Paramètres concession → Constructeurs**. L’opérateur peut laisser la garantie non renseignée, répondre Oui ou Non et, en cas de réponse positive, choisir librement un constructeur admissible sans dépendre de la marque du véhicule.

Le modèle existant porte une seule configuration de garantie par constructeur (`warranty_available`, durée et kilométrage par défaut). Aucun faux sélecteur de contrats multiples n’a donc été ajouté.

## Règles implémentées

- Seuls les constructeurs actifs, avec garantie disponible et durée renseignée, sont proposés.
- La lecture utilise une route Stock protégée par les permissions véhicule ; elle ne donne aucun accès aux écrans ou permissions Paramètres.
- Le serveur relit la configuration admissible lors de l’enregistrement : les valeurs envoyées par le navigateur ne font pas autorité.
- Le véhicule conserve un snapshot du constructeur, de son code, de sa durée, de sa limite kilométrique et du texte des conditions.
- Une configuration modifiée ultérieurement dans Paramètres ne change pas les véhicules déjà enregistrés.
- Un historique devenu inactif reste visible dans le formulaire de modification, mais seules les configurations encore admissibles peuvent servir de remplacement.
- L’ouverture ou l’enregistrement d’une modification sans action sur la garantie ne rafraîchit pas son snapshot.
- Une réponse explicite « Non » est distinguée d’une absence de réponse.
- Les véhicules vendus ou livrés restent protégés par le verrou métier existant.
- Le profil technique commun n’est pas modifié par l’attribution : les données de garantie du véhicule sont exposées comme valeurs individuelles effectives.
- Lors de la vente, le snapshot attribué en stock est privilégié. En l’absence de décision stock, le comportement historique par marque reste disponible pour compatibilité.

## Données et API

La migration additive `105_vehicle_stock_warranty_assignment.sql` ajoute à `vehicles` la référence du constructeur et les colonnes de snapshot. Elle n’a pas été exécutée dans le cadre de cette mission.

La route `GET /vehicles/warranty-providers/eligible` renvoie le jeu minimal nécessaire au formulaire : identifiant, code, nom, durée, kilométrage et texte calculé. Les créations et modifications acceptent `warrantyAssignment` et construisent le snapshot dans la transaction véhicule.

## Correction responsive

Le composant partagé des caractéristiques techniques a été corrigé pour les deux formulaires. Une caractéristique personnalisée utilise désormais une grille fluide 1/2/4 colonnes, des enfants `min-w-0`, des champs `w-full` et une action « Supprimer » sur sa propre ligne. Les libellés restent visibles et aucune largeur fixe à cinq colonnes n’est imposée à la modale.

## Vérifications

- contrôle TypeScript backend et frontend ;
- build backend et frontend ;
- tests ciblés backend sur filtrage, snapshot et permissions ;
- tests ciblés frontend sur recopie, conservation historique et structure responsive ;
- `git diff --check`.

Les tests fonctionnels navigateur et l’exécution de la migration sont volontairement exclus conformément à la mission.
