# LIVRAISON-LCA-02 — Sécurité et accès exposés

Date : 12 octobre 2026

## 1. État de sécurité

ERP-21 a dérivé six empreintes depuis un fichier d'accès de démonstration retiré, sans publier les valeurs. Les scans ERP-21/22 n'ont retrouvé aucune de ces empreintes dans l'export assaini. Aucun élément disponible ne prouve toutefois la révocation ou la rotation des comptes correspondants.

Les six accès sont décrits seulement comme comptes de démonstration ou profils métier de l'application ERP ; service précis, environnement et propriétaire ne peuvent pas être établis sans coordination opérationnelle. Aucun login n'a été tenté et aucun secret n'a été modifié.

## 2. Matrice de suivi anonymisée

| Réserve | Accès | Service concerné connu | Action nécessaire | Responsable proposé | Preuve attendue | Statut |
|---|---:|---|---|---|---|---|
| LCA-R01-A1 | 1 | application ERP ; environnement à identifier | désactiver ou renouveler, puis révoquer les sessions | sécurité BEROX/LCA à confirmer | date, environnement, acteur, ancien accès refusé | À traiter |
| LCA-R01-A2 | 2 | application ERP ; environnement à identifier | désactiver ou renouveler, puis révoquer les sessions | sécurité BEROX/LCA à confirmer | date, environnement, acteur, ancien accès refusé | À traiter |
| LCA-R01-A3 | 3 | application ERP ; environnement à identifier | désactiver ou renouveler, puis révoquer les sessions | sécurité BEROX/LCA à confirmer | date, environnement, acteur, ancien accès refusé | À traiter |
| LCA-R01-A4 | 4 | application ERP ; environnement à identifier | désactiver ou renouveler, puis révoquer les sessions | sécurité BEROX/LCA à confirmer | date, environnement, acteur, ancien accès refusé | À traiter |
| LCA-R01-A5 | 5 | application ERP ; environnement à identifier | désactiver ou renouveler, puis révoquer les sessions | sécurité BEROX/LCA à confirmer | date, environnement, acteur, ancien accès refusé | À traiter |
| LCA-R01-A6 | 6 | application ERP ; environnement à identifier | désactiver ou renouveler, puis révoquer les sessions | sécurité BEROX/LCA à confirmer | date, environnement, acteur, ancien accès refusé | À traiter |

Statuts admis : `À traiter`, `Vérification impossible`, `Rotation confirmée`, `Révocation confirmée`. Aucun accès n'est confirmé à la date du rapport.

## 3. Procédure de levée

1. identifier environnement, compte et propriétaire sans recopier le secret ;
2. désactiver le compte inutile ou générer un nouveau secret dans un coffre ;
3. révoquer refresh tokens et sessions ;
4. vérifier l'échec de l'ancien accès par une personne habilitée ;
5. vérifier le nouvel accès par un canal séparé si le compte subsiste ;
6. enregistrer uniquement statut, date, périmètre et validateurs ;
7. obtenir une validation à deux personnes ;
8. clôturer LCA-R01 uniquement lorsque les six lignes sont confirmées.

## 4. Autres contrôles

- archive RC2 sans historique Git, fichier `.env` réel, données, sauvegardes ou accès de démonstration ;
- zéro motif de clé privée, jeton cloud ou jeton haute confiance détecté ;
- historique Git du dépôt principal toujours sensible et non distribuable ;
- SHA-256 disponible mais aucune signature numérique ;
- paquet de préparation local seulement, sans transmission.

## 5. Décision sécurité

**Sécurité du contenu exporté : contrôles satisfaisants sous réserve des limites du scan.**  
**Sécurité opérationnelle : non levée.**  
**Autorisation de distribution : refusée en l'absence de preuve sur les six accès.**

