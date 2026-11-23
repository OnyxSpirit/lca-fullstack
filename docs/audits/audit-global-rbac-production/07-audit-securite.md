# Audit sécurité

## Contrôles favorables observés

- authentification appliquée globalement aux routeurs métier;
- agence active liée à la session et versionnée;
- distinction du vrai rôle système par `code` et `is_system` côté base;
- revalidation/verrouillage de l'autorisation durant de nombreuses écritures;
- SQL majoritairement paramétré; les listes dynamiques inspectées construisent les placeholders séparément des valeurs;
- téléchargements de signatures/cachets protégés par permission et propriété/agence;
- uploads limités en type et taille, avec contrôle serveur et stockage hors URL publique directe;
- paiements avec idempotence et justificatifs rattachés à la facture, l'agence et l'auteur;
- transitions sensibles et écritures comptables encapsulées dans des transactions.

## Risques confirmés

### Concentration de privilèges

AUD-RBAC-001 force l'usage du Super Admin pour des tâches délégables. Ce n'est pas une élévation directe, mais cela dégrade le principe du moindre privilège et accroît l'impact d'une compromission de ce compte.

### Modèle de cachet ambigu

Un cachet central présent en base peut être invisible à l'administration active, tandis que certaines validations supposent une agence. Une correction improvisée qui élargirait le filtre serait dangereuse : elle pourrait exposer un cachet à une autre concession. Toute évolution doit contraindre d'abord la concession, puis appliquer la règle de propriété agence/centrale.

## Axes examinés sans vulnérabilité confirmée

- fuite inter-agences et IDOR sur cachets/signatures;
- accès aux documents GED;
- uploads de logos, signatures et cachets;
- données salariales et permissions RH;
- paiements, trésorerie et écritures comptables;
- injection SQL dans les chemins prioritaires.

« Non confirmée » ne signifie pas « impossible ». Aucun test intrusif de production, fuzzing complet, analyse de dépendances en ligne ou pentest authentifié n'a été exécuté.

## Recommandations

1. Remplacer les autorisations centrales par permission + concession active, avec liste fermée des vraies opérations système.
2. Ajouter des tests négatifs inter-concessions à toutes les ressources centrales.
3. Vérifier en profondeur la signature réelle des images, décoder l'image dans une bibliothèque sûre et servir avec `nosniff`/CSP.
4. Journaliser les refus sensibles avec identifiant de corrélation, sans payload ni secret.
5. Ajouter une provenance immuable (SHA Git/SBOM) aux images et à un endpoint de santé non sensible.
