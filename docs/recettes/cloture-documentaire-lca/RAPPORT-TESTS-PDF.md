# Tests PDF

- `official-document-closure.test.ts`: présence de toutes les routes ABS, permissions, filtre d’agence et absence de verbes mutateurs : réussi.
- Renderer officiel avec 80 lignes : en-tête `%PDF`, fin `%%EOF`, plusieurs pages et taille significative : réussi après ajustement du seuil non fonctionnel.
- Build TypeScript backend : réussi.
- Inspection visuelle manuelle des 18 documents avec données MySQL : non exécutée.

Conclusion : moteur et structure validés; contenu réel et mise en page de chaque variante restent à recetter sur données isolées.
