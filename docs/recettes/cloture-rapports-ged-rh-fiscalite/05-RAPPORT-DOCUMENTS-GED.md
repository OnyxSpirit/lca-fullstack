# Rapport Documents & GED

Les politiques documentaires restent cumulatives : permission GED et permission métier de l’entité sont toutes deux nécessaires. L’entité `fiscal_obligation` a été ajoutée aux types, libellés, recherches et résolutions backend/frontend.

Les dossiers sensibles RH (`employee`, contrat, congé, prime, prestataire) conservent leurs contrôles existants. Aucun stockage GED n’est exposé par `express.static`. La campagne utilise un volume GED isolé.

## Preuve finale

Le scénario HTTP/MySQL réel a couvert dépôt d’un PDF synthétique sans donnée personnelle, pagination, recherche, scopes, nouvelle version, archivage, restauration et audit. Un acteur d’une autre agence n’obtient pas le document. Le stockage utilisé est temporaire et isolé ; aucun fichier utilisateur ni volume historique n’a été supprimé. Les tests frontend vérifient aussi l’anti-double-soumission, la conservation du formulaire en erreur, l’aperçu et le téléchargement authentifiés.

Verdict : **VALIDÉ**.
