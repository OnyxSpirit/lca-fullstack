# Tests Excel et CSV

Campagne réelle exécutée le 13 novembre 2026 sur `lca_recette` via `document-exports-mysql.integration.ts`.

- XLSX DOC-023 à DOC-028 : **6/6 conformes**. Chaque classeur a été rechargé avec ExcelJS; feuille nommée, dimensions non nulles, en-tête stylé, filtre automatique et volet figé ont été contrôlés.
- CSV DOC-029 à DOC-049 : **21/21 conformes**. HTTP 200, MIME CSV, BOM UTF-8, séparateur `;`, CRLF et protection contre l’injection tableur ont été contrôlés.
- Le PDF DOC-022 a été validé séparément dans la campagne PDF officielle.

Résultat : **FIN-002 clôturée, 28/28 entrées DOC-022 à DOC-049 validées**.
