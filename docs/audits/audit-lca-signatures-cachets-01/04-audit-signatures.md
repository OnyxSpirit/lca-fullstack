# Audit des signatures

La signature est personnelle, versionnée dans `user_signature_versions`, limitée à l’utilisateur connecté et protégée par `signature.view.self` / `signature.manage.self`. Un remplacement révoque la version active sans supprimer l’historique.

L’import contrôle MIME, extension, taille, intégrité raster et dimensions. Le dessin manuscrit produit un PNG via canvas. L’état audité utilise Pointer Events, capture du pointeur, `touch-action: none`, facteur de densité et `ResizeObserver`; aucune recette Android/iOS réelle n’a été exécutée.

Dans le moteur automatique, la signature n’est chargée que si la politique l’exige, si l’acteur possède `document.signature.apply`, si sa signature est active et si son agence utilisateur correspond à l’agence du document. Ce dernier contrôle utilise `users.agency_id`, ce qui peut exclure une signature lors d’un travail dans une agence secondaire active : anomalie multi-agences à tester.

Le PV de livraison suit un autre workflow : capture client explicite et rattachement facultatif de la signature personnelle de l’agent lors de la finalisation.
