# Audit initial — EVOLUTION-LCA-01

État relevé le 24 novembre 2026. Le CRM permettait encore la création de devis commerciaux, la création de pro forma dépendait du droit devis, les commandes de modèles et réceptions partielles n'existaient pas, le statut `demo` n'était pas administrable et le filtre vide des pro forma produisait une sélection incorrecte. Le moteur PDF ne distinguait pas les véhicules pour choisir les photographies. Les migrations existantes allaient jusqu'à 133.

L'interruption n'a corrompu ni le dépôt ni les volumes : `git diff --check` est propre, MySQL a été redémarré sans suppression puis déclaré sain, et les runners antérieurs ont terminé avec le code 0.
