# Recette navigateur réelle

Une instance temporaire construite depuis les sources finales a été lancée hors des conteneurs existants. Chromium réel a ouvert **Stock véhicules VN/VO → Modèles sur commande**, affiché les cinq champs, ajouté explicitement une marque et un modèle absents, puis créé une commande de deux unités. Les références et la commande ont été retrouvées après réponse serveur. L'authentification a suivi le parcours officiel avec compte fictif et activation 2FA ; aucun contournement n'a été utilisé.

Preuves : `preuves/recette-stock-commandes.png`, `preuves/recette-nouvelle-commande.png`, `preuves/recette-commande-references-libres.png`.

La recette exhaustive demandée n'est toutefois pas intégralement capturée : réceptions partielle/totale, A4, responsive et trois sessions simultanées restent des réserves visuelles. Leurs invariants backend sont couverts par les tests MySQL/HTTP, mais cela ne remplace pas la preuve navigateur exigée.
