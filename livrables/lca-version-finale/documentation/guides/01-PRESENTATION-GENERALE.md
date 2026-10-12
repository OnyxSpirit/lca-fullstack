# Dossier officiel de remise — Présentation générale

Projet : ERP/CRM automobile LCA  
Prestataire : BEROX  
Destinataire : La Congolaise de l'Automobile (LCA)  
Candidate technique : `ERP-LCA-v1.0.0-rc2`

## Objet

Ce dossier décrit le périmètre fonctionnel et technique de l'application, son installation indépendante, sa configuration, son administration, son exploitation, les résultats de recette et les réserves. Il prépare une remise ; il ne prouve ni une remise déjà effectuée, ni une autorisation de distribution ou de production.

## Périmètre livré

L'application réunit CRM et prospection, clients 360°, Showroom, véhicules VN/VO, ventes, facturation et encaissements, livraisons, SAV/Atelier et OR, pièces/magasin, GED, tableaux de bord et reporting, notifications, trésorerie, utilisateurs/RBAC, paramètres et RH/administration.

Le périmètre qualifié est **mono-concession, multi-agences**. Les fonctions existent dans le code actuel ; leur niveau de preuve varie et est indiqué dans [la synthèse de recette](./09-SYNTHESE-RECETTE.md). L'isolation réelle multi-concession demeure hors qualification.

## Repères documentaires

1. [Architecture technique](./02-ARCHITECTURE-TECHNIQUE.md)
2. [Prérequis](./03-PREREQUIS-TECHNIQUES.md)
3. [Installation](./04-GUIDE-INSTALLATION.md)
4. [Configuration](./05-GUIDE-CONFIGURATION.md)
5. [Administration](./06-GUIDE-ADMINISTRATION.md)
6. [Utilisation](./07-GUIDE-UTILISATION.md)
7. [Sauvegarde et restauration](./08-SAUVEGARDE-RESTAURATION.md)
8. [Synthèse de recette](./09-SYNTHESE-RECETTE.md)
9. [Registre des réserves](./10-REGISTRE-RESERVES.md)
10. [Inventaire des livrables](./11-INVENTAIRE-LIVRABLES.md)
11. [Modèle de procès-verbal](./12-PROCES-VERBAL-REMISE.md)

## État de la candidate

RC2 est installable et restaurable sur un environnement Docker indépendant. Les audits de dépendances de production de la dernière campagne ne signalaient aucune vulnérabilité. La distribution reste bloquée jusqu'à confirmation de la rotation/révocation des six accès historiquement exposés et autorisation formelle.

