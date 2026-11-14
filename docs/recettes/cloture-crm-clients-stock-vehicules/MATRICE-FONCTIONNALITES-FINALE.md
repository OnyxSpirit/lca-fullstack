# Matrice fonctionnelle finale

| Domaine | Fonction | Backend | Frontend | Persistance |
|---|---|---|---|---|
| Stock | Filtrer prix min/max | Oui | Oui | existante |
| Stock | Trier marque, modèle, prix, date | Oui | Oui | sans effet |
| Stock | Changer emplacement local | Oui | Oui | mouvement + GED |
| Stock | Transférer entre agences | Oui | Oui | transfert + historique |
| Stock | Expédier, recevoir, annuler, retourner | Oui | Oui | états atomiques |
| Client | Modifier identité et coordonnées | Oui | Oui | client |
| Client | Gérer contacts actifs/inactifs | Oui | Oui | historique additif |
| CRM | Archiver/réactiver prospect | Oui | Oui | historique CRM |
| CRM | Bloquer essai/devis sur archive | Oui | Oui | contrôle serveur |

Toutes les lignes ont été couvertes par build et tests ciblés ; les parcours critiques Stock, transfert, Client 360° et CRM ont en plus été validés dans le navigateur sur `lca_recette`.
