# Audit initial

Audit réalisé sur le code frontend/backend et les rapports LCA-01 à LCA-03. Le dépôt était propre au démarrage. Les migrations et l'environnement principal n'ont pas été touchés.

L'ERP possède un socle documentaire partagé (`commercial-document`, `official-record-document`, `business-document`, `financialWorkbook`, `financialCsv`) et des routes spécialisées. L'anomalie explicite de pro forma provenait de la transformation directe des clés JSON techniques : `brand` devenait `Brand`. Les documents officiels pouvaient également exposer directement des statuts, types et moyens de paiement. Les exports comptables et financiers récents étaient déjà majoritairement francisés ; les exports pièces filtrés traduisaient déjà leurs mouvements.

Réserves antérieures confirmées : preuves PDF parfois limitées à la signature du fichier, inspection réelle des photographies incomplète, et XLSX parfois seulement reconnu comme ZIP. La présente évolution ajoute des fichiers générés, extraits, rendus et réouverts.
