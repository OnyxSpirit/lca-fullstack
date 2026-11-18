# Matrice des écrans corrigés

| Module | Chemin UI | Composant | Endpoint | Problème initial | Correction | Type | Défaut/options | Tests | Résultat | Statut |
|---|---|---|---|---|---|---|---|---|---|---|
| Pièces | Achats directs | `DirectPurchasesPanel` | `/part-direct-purchases` | liste complète, état vide absent | pagination et états chargement/vide | client | 10 / 10,20,50,100 | lint/build | OK | corrigé frontend |
| RH | Fiscalité | `FiscalAdministration` | `/fiscal/obligations` | liste complète | pagination visible | client | 10 / 10,20,50,100 | lint/build | OK | corrigé frontend |
| Paramètres | Fournisseurs | `SuppliersSettings` | endpoint fournisseurs existant | cartes non paginées | recherche existante + pagination + vide | client après recherche serveur | 10 / 10,20,50,100 | lint/build | OK | corrigé |
| Paramètres | Agences | `SettingsPage` | endpoint agences existant | grille complète | grille responsive 1/2/3 colonnes + pagination | client | 10 / 10,20,50,100 | lint/build | OK | corrigé |
| Paramètres | Ressources atelier | `SettingsPage` | inchangé | section encore visible | exposition retirée, code conservé | sans objet | sans objet | lint/build | OK | masqué |
