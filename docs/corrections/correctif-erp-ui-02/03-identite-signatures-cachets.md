# Identité, signatures et cachets

La page Identité et fiscalité expose désormais un seul bouton « Enregistrer les modifications ». Les deux écritures sont attendues avant confirmation ; une réussite globale n’est jamais affichée si l’une échoue.

Le canvas de signature utilise les Pointer Events, `touch-action: none`, la capture du pointeur, le facteur de densité et un `ResizeObserver`. Le dessin est conservé lors d’un redimensionnement.

Les politiques documentaires sont indexées par concession, agence et type de document. Le service de génération charge la politique active de l’agence avant application. Recette MySQL et mobile réel encore requises.
