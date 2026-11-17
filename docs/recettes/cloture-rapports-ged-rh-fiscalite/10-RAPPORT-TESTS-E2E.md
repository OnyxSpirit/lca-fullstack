# Rapport des tests E2E

Environnement : Docker séparé, ports 4178/3006/33323, volumes dédiés, MySQL 8.4. Migration jusqu’au niveau 130, services sains.

Preuves obtenues : connexion du super-admin de recette, activation TOTP sans contournement, conservation de la session, puis navigation authentifiée dans Rapports, Documents & GED, RH & Administration, Fiscalité et Utilisateurs & habilitations. Le bundle final a été reconstruit et les services sont sains. Le workflow MySQL budget polyvalent est vert, avec historique `submitted` puis `approved` par le même acteur autorisé. Les contrôles frontend Fiscalité/RH/GED et la matrice RBAC française sont verts.

Validation visuelle finale : onglet Fiscalité visible et chargeable, rattachement GED « Obligation fiscale » visible, synthèse fiscale visible dans Rapports, permissions fiscales visibles en français dans la matrice RBAC, aucun avertissement ni erreur dans la console du navigateur.

## Rejeu final après reconstruction

- Session 2FA existante conservée, sans contournement.
- Navigation authentifiée vers `/hr`, ouverture de l’onglet Fiscalité.
- Clic réel sur « Configurer une nature » : fenêtre, quatre contrôles, fréquence française et bouton initialement désactivé visibles.
- Saisie des trois champs obligatoires : bouton activé ; annulation : aucune création.
- Clic réel sur « Nouvelle obligation » : nature, référence, trois dates et deux montants visibles ; enregistrement désactivé sans nature.
- Bundle reconstruit puis services backend/frontend sains.
- Contrôle de clôture : frontend, backend et MySQL toujours `healthy`; migration 130, zéro avertissement historique, aucun HTTP 5xx dans les journaux récents. Les 401 initiaux après reconstruction ont été suivis du renouvellement normal de session puis de réponses 200/304 ; les 403 observés correspondaient aux permissions attendues avant changement d’agence.

La validation navigateur complète les tests API/MySQL ; elle ne remplace pas leurs assertions de persistance.
