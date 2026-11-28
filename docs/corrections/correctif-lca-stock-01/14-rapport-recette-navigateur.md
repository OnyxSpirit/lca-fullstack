# Recette navigateur réelle

Une instance temporaire construite depuis les sources finales a été lancée hors des conteneurs existants. Chromium réel a ouvert **Stock véhicules VN/VO → Modèles sur commande**, affiché les cinq champs, ajouté explicitement une marque et un modèle absents, puis créé une commande de deux unités. Les références et la commande ont été retrouvées après réponse serveur. L'authentification a suivi le parcours officiel avec compte fictif et activation 2FA ; aucun contournement n'a été utilisé.

Preuves : `preuves/recette-stock-commandes.png`, `preuves/recette-nouvelle-commande.png`, `preuves/recette-commande-references-libres.png`.

La reprise du 28 novembre 2026 a rejoué ce parcours sur l'instance isolée encore active et produit `preuves/recette-*-reprise.png`.

T124 a ensuite été exécuté de bout en bout : saisie et confirmation d'une marque et d'un modèle inédits, quantité 2, annulation sans soumission, réouverture et recherche. La référence n'était pas proposée et le contrôle direct de la base isolée a retourné zéro marque, zéro modèle, zéro commande et zéro véhicule. Preuves : `preuves/T124-formulaire-renseigne.png` et `preuves/T124-reouverture-apres-annulation.png`. Une première tentative invalide du banc avait soumis la commande avant l'annulation ; elle a été rejetée comme preuve, le banc temporaire a été corrigé et le scénario a été rejoué avec de nouvelles références.

La recette exhaustive est désormais clôturée : réceptions partielle/totale et historique, A4 réellement générée puis rendue, responsive 1440/1024/390, RBAC dans trois contextes Chromium isolés, bascule multi-agences et trois sessions temps réel indépendantes. Les captures et journaux structurés correspondants sont conservés sous `preuves/cloture-navigateur/`.
