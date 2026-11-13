# Tests PDF

- 22 PDF réels générés depuis MySQL isolé : DOC-022 et 21 variantes ABS.
- Format A4 confirmé avec `pdfinfo`.
- Inspection rasterisée du bon de restitution : en-tête, tableau, notice, zones de signature, pied et pagination lisibles; aucun chevauchement.
- Extraction texte : `La Congolaise de l’Automobile — SARL • RCCM … • NIU … • RIB … • Site web …`.
- Renderer synthétique 80 lignes : multipage réussi.
- HTTP 200, `application/pdf` et signature `%PDF` : 22/22.
- Consultation sans mutation GED : 16 lignes avant, 16 après.
- Suites documentaires ciblées et build backend : réussis.

La revue visuelle image par image des 21 fichiers n’a pas été exhaustive; un représentant complexe et le multipage automatisé ont été contrôlés.
