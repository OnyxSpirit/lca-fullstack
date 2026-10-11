# STABILISATION-ERP-04 — Photos et GED

Quatre fichiers images sont stockés dans le volume dédié : trois PNG et un WebP. Trois images principales sont enregistrées sur les véhicules. Les créations sans photo fonctionnent après correction. Une signature PNG corrompue est refusée 400. Le RAV4 et la Corolla affichent réellement leur miniature et leur photo principale dans le navigateur, sans image cassée ni erreur console.

GED : un PDF fictif `REC04-certificat.pdf` a été déposé par la route multipart officielle et rattaché à la Corolla #3. L'API d'entité retourne un document, l'aperçu répond 200 `application/pdf` (69 octets), et l'onglet « GED & Documents Associés » affiche le fichier avec actions Visionner/Télécharger. Le workflow officiel passe bien par la GED centralisée ; la fiche véhicule propose aussi « Ajouter un document ».

Stockage contrôlé : 4 fichiers sous `/app/uploads/vehicles`, 1 fichier sous `/app/ged-storage`. Aucun chemin externe ni fichier corrompu n'a été persisté.

