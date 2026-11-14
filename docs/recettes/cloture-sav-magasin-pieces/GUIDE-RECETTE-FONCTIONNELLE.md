# Guide de recette fonctionnelle

## Prérequis

Utiliser uniquement `lca_recette`, une session autorisée avec 2FA et des profils Super Admin, conseiller SAV, technicien, magasinier et comptable. Ne jamais contourner le 2FA. Préparer une agence A, une agence B, un véhicule extérieur, des pièces stockées, un mode de paiement et une destination de transit compatibles.

## Parcours à exécuter au navigateur

1. Créer un OR pour véhicule extérieur en agence A ; vérifier que l’agence B ne le voit pas.
2. Saisir diagnostic, devis, décision client, temps et pièces.
3. Réserver, sortir puis retourner partiellement une pièce ; contrôler stock et mouvements.
4. Finaliser les travaux, facturer et encaisser ; contrôler solde et GED/PDF.
5. Initier un transit compatible, tester doublon idempotent, confirmer ou refuser selon le profil.
6. Ouvrir le journal : tester recherche, dates, chaque type OR/paiement/transfert, tris, pagination et CSV.
7. Ouvrir le reporting : changer d’agence via le sélecteur, tester période, indicateurs, états vides et CSV.
8. Tester accès direct API/URL sans permission et vérifier 403 sans fuite de données.

## Preuves à conserver

Captures avant/après, réponses HTTP, identifiants des objets, compteurs de stock, soldes, mouvements et documents GED. Classer chaque résultat en : automatisé réellement exécuté, navigateur, inspection statique, bloqué ou non exécuté.

## Nettoyage

Supprimer seulement comptes, rôles et fixtures créés pour la campagne. Ne pas effacer les écritures immuables : les annuler/contrepasser selon les règles métier et conserver leurs références. Dans la présente campagne, aucune fixture, aucun compte, aucun rôle et aucune écriture financière n’ont été créés ; aucun nettoyage destructif n’est requis.
