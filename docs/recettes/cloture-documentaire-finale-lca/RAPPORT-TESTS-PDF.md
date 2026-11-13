# Tests PDF

- 21 PDF réels générés depuis MySQL isolé.
- Format A4 confirmé avec `pdfinfo`.
- Inspection rasterisée du bon de restitution : en-tête, tableau, notice, zones de signature, pied et pagination lisibles; aucun chevauchement.
- Extraction texte : `La Congolaise de l’Automobile — SARL • RCCM … • NIU … • RIB … • Site web …`.
- Renderer synthétique 80 lignes : multipage réussi.
- Suites `official-document-closure`, `document-identity-footer`, `document-logo-delivery`, `accounting-document-lca` : 4/4 réussies.

La revue visuelle image par image des 21 fichiers n’a pas été exhaustive; un représentant complexe et le multipage automatisé ont été contrôlés.
